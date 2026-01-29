// routes/aiInterviewRoutes.js
const express = require('express');
const router = express.Router();
const { callOpenRouter } = require('../services/openRouterService');
const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');

// In-memory session store (use Redis in production)
const interviewSessions = new Map();

// Start interview
// Start interview
router.post('/start', async (req, res) => {
    try {
        const { jobId, userId } = req.body;

        if (!jobId || !userId) {
            return res.status(400).json({ message: "jobId and userId are required" });
        }

        const ResumeAnalysis = mongoose.model('ResumeAnalysis');
        const resume = await ResumeAnalysis.findOne({ userId, jobId });

        if (!resume) {
            return res.status(400).json({
                message: "Resume not analyzed. Please complete resume analysis first."
            });
        }

        const structured = resume.structured || {};

        const firstQPrompt = `
You are an expert technical interviewer.
Candidate Resume:
- Skills: ${JSON.stringify(structured.skills || {})}
- Projects: ${JSON.stringify(structured.projects || [])}
- Experience: ${structured.experienceYears || 0} years
- AI Context: ${resume.explanation}
Job Role: Software Engineer

Ask ONE deep, specific technical question about their strongest project or skill.
Focus on implementation, trade-offs, or challenges.
Return ONLY the question text. No intro.
`;
        console.log("[INTERVIEW-START] Prompting AI...");
        let firstQuestion = null;
        try {
            firstQuestion = await callOpenRouter(firstQPrompt);
        } catch (aiError) {
            console.error("[INTERVIEW-START] AI Service Error:", aiError.message);
        }

        // Fallback if AI fails
        if (!firstQuestion) {
            console.warn("[INTERVIEW-START] Using fallback question.");
            const FALLBACK_QUESTIONS = [
                "Could you walk me through the most technically challenging project you've worked on?",
                "Describe a situation where you had to debug a complex issue. What was your approach?",
                "What are your core technical strengths and how have you applied them in your recent work?",
                "Explain a technical concept you've learned recently and why you found it interesting."
            ];
            firstQuestion = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
        }

        const sessionId = crypto.randomBytes(16).toString('hex');
        interviewSessions.set(sessionId, {
            userId,
            jobId,
            resumeProfile: structured,
            history: [{ role: 'interviewer', content: firstQuestion }]
        });

        res.json({ success: true, sessionId, question: firstQuestion });
    } catch (error) {
        console.error("[INTERVIEW-START] Critical Error:", error);
        // Last resort fallback response to prevent 500
        res.status(200).json({
            success: true,
            sessionId: crypto.randomBytes(16).toString('hex'),
            question: "Tell me about your experience as a Software Engineer."
        });
    }
});

// Submit answer & get next question (up to 10)
router.post('/next', async (req, res) => {
    try {
        const { sessionId, answerText } = req.body;
        const session = interviewSessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        session.history.push({ role: 'candidate', content: answerText });

        const interviewerMessages = session.history.filter(h => h.role === 'interviewer');
        if (interviewerMessages.length >= 10) {
            console.log(`[INTERVIEW-END] Analyzing session for user: ${session.userId}`);

            // 1. Gather Conversation
            const conversation = session.history.map(h =>
                `${h.role === 'interviewer' ? 'Q' : 'A'}: ${h.content}`
            ).join('\n');

            // 2. AI Evaluation
            const evalPrompt = `
You are a Senior Technical Recruiter. Evaluate this interview conversation:
${conversation}

Job Context: ${JSON.stringify(session.resumeProfile || {})}

Return ONLY a JSON object:
{
  "score": 0-100,
  "feedback": "...",
  "metrics": {
    "technicalDepth": 0-10,
    "communication": 0-10,
    "honesty": 0-10
  }
}
`;
            let evaluation = { score: 50, feedback: "Interview completed." };
            try {
                const rawEval = await callOpenRouter(evalPrompt, 500, true);
                if (rawEval) evaluation = JSON.parse(rawEval);
            } catch (e) {
                console.error("[INTERVIEW-END] Eval failed, using default:", e.message);
            }

            // 3. Save to Database (Application Model)
            const Application = mongoose.model('Application');
            const interviewAnswers = [];
            for (let i = 0; i < session.history.length; i += 2) {
                if (session.history[i] && session.history[i + 1]) {
                    interviewAnswers.push({
                        question: session.history[i].content,
                        answer: session.history[i + 1].content,
                        score: evaluation.score // simplified per question score for now
                    });
                }
            }

            await Application.findOneAndUpdate(
                { userId: session.userId, jobId: session.jobId },
                {
                    interviewScore: evaluation.score,
                    interviewAnswers: interviewAnswers,
                    $set: { "metrics.communicationDelta": evaluation.metrics?.communication || 5 }
                },
                { upsert: true }
            );

            interviewSessions.delete(sessionId);

            return res.json({
                hasNext: false,
                finalScore: evaluation.score,
                feedback: evaluation.feedback
            });
        }

        const thread = session.history.map(h =>
            `[${h.role === 'interviewer' ? 'INTERVIEWER' : 'CANDIDATE'}]: ${h.content}`
        ).join('\n\n');

        const nextPrompt = `
Continue the technical interview based on:

${thread}

Candidate's resume:
- Skills: ${JSON.stringify(session.resumeProfile.skills || {})}
- Projects: ${JSON.stringify(session.resumeProfile.projects || [])}

Ask ONE follow-up question that:
- Builds directly on the last answer
- Probes deeper into technical reasoning
- Relates to their actual resume
- Is specific and open-ended

Return ONLY the question text.
`;
        let nextQuestion = null;
        try {
            nextQuestion = await callOpenRouter(nextPrompt);
        } catch (aiError) {
            console.error("[INTERVIEW-NEXT] AI Error:", aiError.message);
        }

        if (!nextQuestion) {
            console.warn("[INTERVIEW-NEXT] Using fallback follow-up.");
            const FALLBACK_FOLLOWUPS = [
                "That sounds interesting. Can you elaborate more on the specific challenges you faced?",
                "How did you ensure the scalability of that solution?",
                "What alternatives did you consider before choosing that approach?",
                "Could you dive deeper into the technical implementation details?"
            ];
            nextQuestion = FALLBACK_FOLLOWUPS[Math.floor(Math.random() * FALLBACK_FOLLOWUPS.length)];
        }

        session.history.push({ role: 'interviewer', content: nextQuestion });

        const currentCount = session.history.filter(h => h.role === 'interviewer').length;

        res.json({
            hasNext: true,
            question: nextQuestion,
            currentQuestionNumber: currentCount
        });
    } catch (error) {
        console.error("[INTERVIEW-NEXT] Critical Error:", error.message);

        const session = interviewSessions.get(req.body.sessionId);
        const currentCount = session ? session.history.filter(h => h.role === 'interviewer').length : 1;

        res.json({
            hasNext: true,
            question: "Could you tell me more about your technical skills?",
            currentQuestionNumber: currentCount
        });
    }
});

module.exports = router;