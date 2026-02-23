const express = require('express');
const router = express.Router();
const { callInterviewAI } = require('../utils/aiClients');
const { generateSpeech } = require('../services/tts.service');
const crypto = require('crypto');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const Application = require('../models/Application');

// In-memory session store
const interviewSessions = new Map();

const INTERVIEW_SYSTEM_PROMPT = `
You are a senior technical interviewer for a high-growth tech company. 
Your goal is to evaluate the candidate's technical depth, problem-solving skills, and communication.
- Be professional, encouraging, but rigorous.
- Ask specific questions based on the resume and previous answers.
- Avoid generic questions; dive into implementation details, trade-offs, and architecture.
- Keep the conversation flow natural.
- Respond ONLY with the next interview question or feedback, no conversational filler like 'Great answer!' unless it's part of the feedback.
`;

// Start interview
router.post('/start', async (req, res) => {
    try {
        const { jobId, userId } = req.body;
        if (!jobId || !userId) return res.status(400).json({ message: "jobId and userId are required" });

        const resume = await ResumeAnalysis.findOne({ userId, jobId });
        if (!resume) return res.status(400).json({ message: "Resume analysis not found." });

        const structured = resume.structured || {};

        const firstQPrompt = `Based on this resume: ${JSON.stringify(structured)}, ask ONE specific technical question about their work. Return ONLY the question.`;

        let firstQuestion = await callInterviewAI(firstQPrompt, 500, false, INTERVIEW_SYSTEM_PROMPT);

        if (!firstQuestion) {
            firstQuestion = "Could you walk me through the most technically challenging project you've worked on?";
        }

        // Voice generation (TTS)
        let audioBase64 = null;
        try {
            const buffer = await generateSpeech(firstQuestion);
            if (buffer) audioBase64 = buffer.toString('base64');
        } catch (e) { console.warn("TTS failed"); }

        const sessionId = crypto.randomBytes(16).toString('hex');
        interviewSessions.set(sessionId, {
            userId, jobId, resumeProfile: structured,
            history: [{ role: 'interviewer', content: firstQuestion }]
        });

        res.json({ success: true, sessionId, question: firstQuestion, audio: audioBase64 });
    } catch (error) {
        console.error("Start Error:", error);
        res.status(500).json({ success: false, message: "Failed to start" });
    }
});

// Next question
router.post('/next', async (req, res) => {
    try {
        const { sessionId, answerText } = req.body;
        const session = interviewSessions.get(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        session.history.push({ role: 'candidate', content: answerText });
        const interviewers = session.history.filter(h => h.role === 'interviewer');

        // End after 10 questions
        if (interviewers.length >= 10) {
            console.log(`[INTERVIEW-END] Finalizing session for user: ${session.userId}`);
            const conversation = session.history.map(h => `${h.role}: ${h.content}`).join('\n');
            const evalPrompt = `
Evaluate this technical interview and return ONLY a JSON object:
{
  "score": 0-100,
  "feedback": "Concise summary"
}
Conversation:
${conversation}
`;

            let evaluation = { score: 70, feedback: "Technical discussion completed." };
            try {
                // FIX: Use 1500 tokens (not 500) — eval prompt includes full conversation history
                const resText = await callInterviewAI(evalPrompt, 1500, true, "You are a senior technical evaluator. Analyze the technical depth of this interview.");
                console.log("[INTERVIEW-EVAL] Raw AI Response:", resText);
                if (resText) {
                    const match = resText.match(/\{[\s\S]*\}/);
                    const parsed = JSON.parse(match ? match[0] : resText);
                    const rawScore = Number(parsed?.score);
                    // FIX: Guard against NaN, truncated values, or absurd AI outputs
                    if (parsed && !isNaN(rawScore) && rawScore >= 1 && rawScore <= 100) {
                        // FIX: Clamp to realistic range — prevents AI giving 0–5 for decent answers
                        evaluation.score = Math.max(25, Math.min(95, rawScore));
                        evaluation.feedback = parsed.feedback || evaluation.feedback;
                    }
                }
            } catch (e) {
                console.error("[INTERVIEW-EVAL] Parsing failed:", e.message);
            }

            console.log("[INTERVIEW-EVAL] Final Score:", evaluation.score);

            await Application.findOneAndUpdate(
                { userId: session.userId, jobId: session.jobId },
                {
                    interviewScore: evaluation.score,
                    status: 'APPLIED',
                    resultsVisibleAt: new Date(), // Set to now to ensure visibility
                    interviewAnswers: session.history.filter((_, i) => i % 2 === 0).map((h, i) => ({
                        question: h.content,
                        answer: session.history[i * 2 + 1]?.content || "",
                        score: evaluation.score,
                        feedback: evaluation.feedback
                    }))
                },
                { upsert: true }
            );

            // Update final score
            const app = await Application.findOne({ userId: session.userId, jobId: session.jobId });
            if (app) {
                const r = Number(app.resumeMatchPercent || 0);
                const a = Number(app.assessmentScore || 0);
                const i = Number(app.interviewScore || 0);
                app.finalScore = Math.round((r + a + i) / 3);

                if (app.finalScore >= 60) app.status = 'SHORTLISTED';

                await app.save();
                console.log(`[INTERVIEW-EVAL] Application Updated. Final Score: ${app.finalScore}`);
            }

            interviewSessions.delete(sessionId);
            return res.json({ hasNext: false, finalScore: evaluation.score, feedback: evaluation.feedback });
        }

        const thread = session.history.map(h => `${h.role}: ${h.content}`).join('\n');
        const nextPrompt = `Continue the technical interview. Based on history:\n${thread}\n\nAsk ONE follow-up technical question. Return ONLY the question.`;

        let nextQuestion = await callInterviewAI(nextPrompt, 500, false, INTERVIEW_SYSTEM_PROMPT);

        if (!nextQuestion) {
            nextQuestion = "Can you dive deeper into the technical implementation of that solution?";
        }

        // Voice generation (TTS)
        let audioBase64 = null;
        try {
            const buffer = await generateSpeech(nextQuestion);
            if (buffer) audioBase64 = buffer.toString('base64');
        } catch (e) { console.warn("TTS failed"); }

        session.history.push({ role: 'interviewer', content: nextQuestion });

        res.json({
            hasNext: true,
            question: nextQuestion,
            audio: audioBase64,
            currentQuestionNumber: session.history.filter(h => h.role === 'interviewer').length
        });
    } catch (error) {
        console.error("Next Error:", error);
        res.status(500).json({ success: false, message: "Error" });
    }
});

module.exports = router;