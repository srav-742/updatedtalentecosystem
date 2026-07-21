/**
 * ─── Fast AI Interview Routes ───────────────────────────────────────────────
 *
 * PURPOSE:
 *   Drop-in replacement for the `/next` endpoint that reduces question-to-
 *   question latency from ~20-30 seconds to ~3-5 seconds by:
 *
 *     1. Using the browser's real-time SpeechRecognition transcript instead
 *        of waiting for server-side Whisper STT (saves ~3-5s).
 *     2. Running answer evaluation in the background (fire-and-forget)
 *        instead of blocking the response (saves ~4-8s).
 *     3. Only awaiting the single LLM call needed to generate the next
 *        question before responding.
 *
 * ISOLATION:
 *   This file is 100% self-contained. It reads from the same MongoDB
 *   InterviewSession / Application collections and reuses the same
 *   aiClients + interviewScoring utilities, but does NOT import from
 *   or modify aiInterviewRoutes.js.
 *
 * MOUNT:  app.use('/api/interview', fastAiInterviewRoutes)
 *         This makes the endpoint: POST /api/interview/next-fast
 * ────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { callInterviewAI } = require('../utils/aiClients');
const Application = require('../models/Application');
const InterviewSession = require('../models/InterviewSession');
const {
    averageInterviewScore,
    clamp,
    roundToTenth,
    scoreInterviewAnswer
} = require('../utils/interviewScoring');

const MAX_INTERVIEW_QUESTIONS = 5;

// ─── In-memory session cache (mirrors the one in aiInterviewRoutes.js) ──────
// Sessions created by /start are persisted to MongoDB. This cache avoids
// redundant DB reads within the same server process.
const fastSessionCache = new Map();

// ─── Session Helpers ────────────────────────────────────────────────────────

async function loadSession(sessionId) {
    if (fastSessionCache.has(sessionId)) {
        return fastSessionCache.get(sessionId);
    }

    const stored = await InterviewSession.findOne({ sessionId }).lean();
    if (!stored) return null;

    const session = {
        sessionId: stored.sessionId,
        userId: stored.userId,
        jobId: stored.jobId,
        recordingSessionId: stored.recordingSessionId,
        resumeProfile: stored.resumeProfile,
        specialInstructions: stored.specialInstructions,
        roleInfo: stored.roleInfo,
        jobTitle: stored.jobTitle,
        jobDescription: stored.jobDescription,
        jobSkills: stored.jobSkills || [],
        experienceLevel: stored.experienceLevel || '',
        systemPrompt: stored.systemPrompt,
        interviewerVoice: stored.interviewerVoice,
        totalQuestions: Math.min(stored.totalQuestions || MAX_INTERVIEW_QUESTIONS, MAX_INTERVIEW_QUESTIONS),
        history: stored.history || [],
        answerEvaluations: stored.answerEvaluations || []
    };

    fastSessionCache.set(sessionId, session);
    return session;
}

async function saveSession(sessionId, session) {
    fastSessionCache.set(sessionId, session);

    await InterviewSession.findOneAndUpdate(
        { sessionId },
        {
            $set: {
                sessionId,
                userId: session.userId,
                jobId: String(session.jobId),
                recordingSessionId: session.recordingSessionId,
                resumeProfile: session.resumeProfile,
                specialInstructions: session.specialInstructions,
                roleInfo: session.roleInfo,
                jobTitle: session.jobTitle,
                jobDescription: session.jobDescription,
                jobSkills: session.jobSkills,
                experienceLevel: session.experienceLevel,
                systemPrompt: session.systemPrompt,
                interviewerVoice: session.interviewerVoice,
                totalQuestions: Math.min(session.totalQuestions || MAX_INTERVIEW_QUESTIONS, MAX_INTERVIEW_QUESTIONS),
                history: session.history || [],
                answerEvaluations: session.answerEvaluations || []
            }
        },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

async function deleteSession(sessionId) {
    fastSessionCache.delete(sessionId);
    await InterviewSession.deleteOne({ sessionId }).catch(() => null);
}

// ─── JSON Parsing Helpers ───────────────────────────────────────────────────

function stripMarkdownJson(rawText = '') {
    return String(rawText || '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function parseJsonObject(rawText = '') {
    const cleaned = stripMarkdownJson(rawText);
    if (!cleaned) return null;

    try {
        return JSON.parse(cleaned);
    } catch (_) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch (_) {
            return null;
        }
    }
}

// ─── Prompt Builders (self-contained copies) ────────────────────────────────

const INTERVIEWER_PERSONA = `

INTERVIEWER IDENTITY & BEHAVIORAL DIRECTIVES:
- ROLE: You are a senior executive and the lead human technical interviewer conducting a high-stakes professional assessment.
- TONE: Authoritative, confident, direct, and formal. Speak with clear deliberation.
- RULE 1: NEVER refer to yourself as an AI, bot, assistant, or language model. You are the interviewer.
- RULE 2: NEVER use over-enthusiastic filler words: "Awesome!", "Great job!", "Perfect!", "Fantastic!", "Amazing!", "Wonderful!", "Excellent answer!", "That's interesting!".
- RULE 3: Use concise, firm transitions after evaluating a candidate's response. Examples: "Understood.", "Noted. Moving on.", "Let's pivot to the next area.", "Fair enough. Next question.", "That covers the basics. Let's continue.".
- RULE 4: Maintain a structured, professional boundary. Do not over-explain your questions unless the candidate explicitly asks for clarification.
- RULE 5: Do NOT praise answers. Acknowledge them neutrally and proceed.
- RULE 6: Your tone should be commanding and measured — like a VP of Engineering or a Director conducting a final-round interview.
`;

/**
 * Dynamic interview partitioning helper to divide 70% of questions as follow-ups.
 */
function getInterviewStructure(T) {
    const numFollowups = Math.round(T * 0.70);
    const numMains = T - numFollowups;
    const baseFollowups = Math.floor(numFollowups / numMains);
    const remainder = numFollowups % numMains;
    
    const structure = [];
    let currentQ = 1;
    for (let i = 0; i < numMains; i++) {
        const followupsForThisMain = baseFollowups + (i < remainder ? 1 : 0);
        const mainIndex = currentQ;
        const followUpIndices = [];
        for (let j = 0; j < followupsForThisMain; j++) {
            followUpIndices.push(currentQ + 1 + j);
        }
        structure.push({
            mainIndex,
            followUpIndices
        });
        currentQ += 1 + followupsForThisMain;
    }
    return structure;
}

/**
 * Build the follow-up question prompt with conversation context and question tracking.
 */
function buildNextQuestionPrompt(session, questionNumber) {
    const { roleInfo, specialInstructions, resumeProfile } = session;
    const { isTech, roleCategory } = roleInfo;
    const totalQuestions = session.totalQuestions;
    const isAiRole = roleCategory === 'ai_engineer';

    // Resume question slots scale with totalQuestions and align with main question slots where possible
    let resumeQuestionSlots;
    if (totalQuestions === 15) {
        resumeQuestionSlots = [9]; // Align with main question 3
    } else if (totalQuestions === 10) {
        resumeQuestionSlots = [8]; // Align with main question 3
    } else {
        resumeQuestionSlots = [Math.max(1, totalQuestions - 1)];
    }
    const isResumeQuestion = resumeQuestionSlots.includes(questionNumber);

    // Analyze block evaluations to guide follow-up behavior
    const structure = getInterviewStructure(totalQuestions);
    const block = structure.find(b => b.mainIndex === questionNumber || b.followUpIndices.includes(questionNumber));
    
    const blockEvals = [];
    if (block) {
        const evals = session.answerEvaluations || [];
        for (const e of evals) {
            if (e.questionNumber === block.mainIndex || block.followUpIndices.includes(e.questionNumber)) {
                blockEvals.push(e);
            }
        }
    }

    let isPivot = false;
    let quality = 'N/A';
    let lastFeedback = '';

    if (blockEvals.length > 0) {
        const lastEval = blockEvals[blockEvals.length - 1];
        lastFeedback = lastEval.feedback || '';
        const score = lastEval.score || 0;

        if (score >= 70) {
            quality = 'Strong';
        } else if (score >= 40) {
            quality = 'Moderate';
        } else {
            quality = 'Weak';
        }

        // Pivot early guard: if last two answers in this block were both weak
        if (blockEvals.length >= 2) {
            const secondLastEval = blockEvals[blockEvals.length - 2];
            if ((lastEval.score || 0) < 40 && (secondLastEval.score || 0) < 40) {
                isPivot = true;
            }
        }
    }

    let followUpDirective = '';
    if (isPivot || questionNumber === block?.mainIndex) {
        followUpDirective = `
=== FOLLOW-UP FRAMEWORK: NEW TOPIC / PIVOT ===
- You must select and pivot to a brand new topic from the Job Description.
- Do NOT continue the previous thread or ask follow-ups on the last answer.
- ${isPivot ? "Reason: The candidate has struggled to clarify their understanding of the previous topic. Acknowledge the response neutrally and pivot to a completely new area of the JD." : "Reason: You are starting a new topic block."}
`;
    } else {
        if (quality === 'Strong') {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: DRILL DEEPER (STRONG ANSWER) ===
- The candidate's last answer was evaluated as STRONG.
- Drill deeper on the SAME topic. Ask a deep follow-up to explore trade-offs, scalability, or production challenges.
- Last answer feedback: "${lastFeedback}"
`;
        } else if (quality === 'Moderate') {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: REQUEST CLARIFICATION (MODERATE ANSWER) ===
- The candidate's last answer was MODERATE (some details missing).
- Request clarification or explore missing details. Ask them to elaborate, walk through implementation, or explain challenges.
- Last answer feedback: "${lastFeedback}"
`;
        } else if (quality === 'Weak') {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: ATTEMPT ONE CLARIFICATION (WEAK ANSWER) ===
- The candidate's last answer was WEAK.
- Attempt exactly ONE clarification question to uncover partial understanding. Ask them to explain it in a simpler way, provide an example, or outline their first step.
- Last answer feedback: "${lastFeedback}"
`;
        } else {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: DRILL DEEPER ===
- Follow up on the candidate's last answer to explore the topic further.
`;
        }
    }

    let questionDirective;
    if (isResumeQuestion) {
        questionDirective = `
THIS IS A RESUME-BASED QUESTION (5% allocation).
- Ask a question that VALIDATES something specific from the candidate's resume.
- Connect it to the job description when possible.
- Focus on verifying claimed skills/experience that are relevant to the job.
` + followUpDirective;
    } else {
        questionDirective = `
THIS IS A JOB-DESCRIPTION-BASED QUESTION (95% allocation).
- Ask a question directly related to the responsibilities, requirements, or challenges described in the job description.
- ${roleCategory === 'mlops'
                ? 'For MLOps roles: ask about model deployment patterns, model monitoring for drift, feature store implementation, CI/CD pipelines for ML, Kubernetes for ML, data versioning, or serving latency optimizations.'
                : isAiRole
                ? 'For AI/ML engineering roles: ask about LLM architecture trade-offs, RAG pipeline design, chunking strategies, embedding models, vector store selection, fine-tuning vs. prompting, evaluation frameworks, hallucination mitigation, latency/cost optimisation, or MLOps practices described in the JD.'
                : isTech
                    ? 'For technical roles: focus on implementation, system design, debugging, performance optimization, or architectural decisions related to the JD.'
                    : 'For non-technical roles: use situational/behavioral questions tied to the JD responsibilities.'}
` + followUpDirective;
    }

    const askedQuestions = session.history
        .filter(h => h.role === 'interviewer')
        .map((h, i) => `${i + 1}. ${h.content}`)
        .join('\n');

    const recentMessages = session.history.slice(-4);
    const thread = recentMessages.map(h =>
        `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`
    ).join('\n');

    return `
=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Required Skills: ${(session.jobSkills || []).join(', ') || 'Not specified'}
Experience Level: ${session.experienceLevel || 'Not specified'}

=== CANDIDATE RESUME ===
${JSON.stringify(resumeProfile)}

=== RECRUITER'S SPECIAL INSTRUCTIONS ===
${specialInstructions || 'None'}

=== INTERVIEW PROGRESS ===
Question ${questionNumber} of ${totalQuestions}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory})

=== CONVERSATION SO FAR ===
${thread}

=== QUESTION DIRECTIVE ===
${questionDirective}

=== PREVIOUSLY ASKED QUESTIONS (CRITICAL: DO NOT REPEAT THESE) ===
${askedQuestions}

=== TASK ===
Based on the interview flow above, ask the NEXT interview question (Question ${questionNumber}).
- CRITICAL RULE: DO NOT REPEAT any topics/questions from the "PREVIOUSLY ASKED QUESTIONS" list. Pick a purely new topic from the Job Description.
- Make it flow naturally from the candidate's last answer.
- Match the difficulty to the experience level: ${session.experienceLevel || 'entry-level'}.
- Return ONLY the question. Nothing else. Ensure the question flows from the previous answer, is complete, and ends with a question mark (?).
`;
}

function buildAnswerEvaluationPrompt(session, questionText, answerText, questionNumber) {
    const { roleInfo } = session;
    const { isTech, roleCategory } = roleInfo;
    const isAiRole = roleCategory === 'ai_engineer';

    return `
You are a senior ${isAiRole ? 'AI/ML engineering' : isTech ? 'technical' : 'professional'} interview evaluator scoring ONE interview answer.

=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Required Skills: ${(session.jobSkills || []).join(', ') || 'Not specified'}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory})

=== QUESTION NUMBER ===
${questionNumber}

=== INTERVIEW QUESTION ===
${questionText || 'Not specified'}

=== CANDIDATE ANSWER ===
${answerText || 'No answer provided'}

=== SCORE THIS ANSWER ONLY ===
${isAiRole ? `
- Depth of AI/ML knowledge
- RAG and LLM system design
- Practical engineering judgement
- Evaluation mindset
- MLOps awareness
- Communication clarity when explaining complex AI/ML concepts
` : isTech ? `
- Technical depth and accuracy of answers
- Problem-solving approach and analytical thinking
- Implementation detail and architecture understanding when relevant
- Knowledge of required technologies from the JD
- Communication clarity when explaining technical concepts
` : `
- Domain knowledge relevant to the job description
- Problem-solving and situational judgement
- Communication and interpersonal skills
- Strategic thinking and business acumen
- Practical experience alignment with the JD requirements
`}

=== TASK ===
Evaluate ONLY this single answer and return ONLY a JSON object:
{
  "marks": <number 0-10>,
  "percentage": <number 0-100>,
  "feedback": "<one concise sentence providing the exact reason for the assessment score>"
}
`;
}

function buildFinalEvalPrompt(session, answerEvaluations, overallScore) {
    const { roleInfo } = session;
    const { isTech, roleCategory } = roleInfo;
    const isAiRole = roleCategory === 'ai_engineer';
    const conversation = session.history.map(h =>
        `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`
    ).join('\n');

    return `
You are a senior ${isAiRole ? 'AI/ML engineering' : isTech ? 'technical' : 'professional'} interview evaluator.

=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory})

=== QUESTION-BY-QUESTION SCORES ===
${JSON.stringify(answerEvaluations)}

=== CALCULATED OVERALL SCORE ===
${overallScore}

=== INTERVIEW TRANSCRIPT ===
${conversation}

=== TASK ===
Write a concise final summary of the candidate's interview performance. Do not change the overall score.
Return ONLY a JSON object:
{
  "feedback": "<concise 2-3 sentence professional summary of the candidate's performance, highlighting strengths and areas for improvement>"
}
`;
}

function normalizeAiEvaluation(parsed, heuristic) {
    const aiMarksCandidate = Number(parsed?.marks);
    const aiPercentageCandidate = Number(parsed?.percentage);
    const aiScoreCandidate = Number(parsed?.score);

    let aiMarks = Number.NaN;
    if (!Number.isNaN(aiMarksCandidate)) {
        aiMarks = clamp(aiMarksCandidate, 0, 10);
    } else if (!Number.isNaN(aiPercentageCandidate)) {
        aiMarks = clamp(aiPercentageCandidate / 10, 0, 10);
    } else if (!Number.isNaN(aiScoreCandidate)) {
        aiMarks = clamp(aiScoreCandidate / 10, 0, 10);
    }

    if (Number.isNaN(aiMarks)) {
        return heuristic;
    }

    const finalMarks = roundToTenth(clamp((aiMarks * 0.7) + (heuristic.marks * 0.3), 2, 9.8));
    const score = clamp(Math.round(finalMarks * 10), 20, 98);

    return {
        ...heuristic,
        score,
        marks: finalMarks,
        feedback: String(parsed.feedback || heuristic.feedback).trim() || heuristic.feedback
    };
}

function summarizeInterviewFallback(answerEvaluations, overallScore) {
    if (!answerEvaluations.length) {
        return "The interview was completed successfully, but a detailed evaluation summary could not be generated.";
    }

    const strongest = [...answerEvaluations].sort((a, b) => b.score - a.score)[0];
    const weakest = [...answerEvaluations].sort((a, b) => a.score - b.score)[0];
    const band =
        overallScore >= 80 ? "strong" :
            overallScore >= 60 ? "solid" :
                "developing";

    return `The candidate delivered a ${band} interview overall with a final score of ${overallScore}%. Stronger moments appeared in "${strongest.question}", while weaker depth was visible in "${weakest.question}". Overall, the candidate should keep improving consistency, clarity, and role-specific detail across answers.`;
}

// ─── Background Evaluation (fire-and-forget) ────────────────────────────────

async function evaluateAnswerInBackground(session, sessionId, questionText, answerText, questionNumber) {
    try {
        console.log(`[FAST-BG-EVAL] Starting background evaluation for Q${questionNumber}, user: ${session.userId}`);

        // 1. Run local heuristic scoring
        const heuristic = scoreInterviewAnswer({
            questionText,
            answerText,
            jobSkills: session.jobSkills,
            jobDescription: session.jobDescription
        });

        let evaluation = heuristic;

        // 2. If the answer was attempted, call LLM for AI scoring
        if (heuristic.isAttempted !== false) {
            try {
                const prompt = buildAnswerEvaluationPrompt(session, questionText, answerText, questionNumber);
                const rawResponse = await callInterviewAI(
                    prompt,
                    500,
                    true,
                    `You are a strict ${session.roleInfo.roleCategory === 'ai_engineer' ? 'AI/ML engineering' : session.roleInfo.isTech ? 'technical' : 'professional'} interviewer. Score only the candidate's latest answer and respond with valid JSON.`
                );
                const parsed = parseJsonObject(rawResponse);
                if (parsed) {
                    evaluation = normalizeAiEvaluation(parsed, heuristic);
                }
            } catch (aiErr) {
                console.warn("[FAST-BG-EVAL] AI scoring fallback triggered:", aiErr.message);
            }
        }

        // 3. Push evaluation to the session's answerEvaluations array
        session.answerEvaluations.push({
            questionNumber,
            question: questionText,
            answer: answerText,
            score: evaluation.score,
            marks: evaluation.marks,
            feedback: evaluation.feedback,
            isAttempted: evaluation.isAttempted !== false
        });

        // 4. Save to InterviewSession (MongoDB)
        await saveSession(sessionId, session);

        // 5. Save incrementally to Application collection (rescue mechanism)
        try {
            await Application.findOneAndUpdate(
                {
                    userId: session.userId,
                    jobId: new mongoose.Types.ObjectId(session.jobId)
                },
                {
                    $push: {
                        interviewAnswers: {
                            question: questionText,
                            answer: answerText,
                            score: evaluation.score,
                            marks: evaluation.marks,
                            feedback: evaluation.feedback
                        }
                    }
                }
            );
            console.log(`[FAST-BG-EVAL] Saved Q${questionNumber} for user: ${session.userId}`);
        } catch (dbErr) {
            console.error("[FAST-BG-EVAL] Failed to push answer to Application:", dbErr.message);
        }

    } catch (err) {
        console.error("[FAST-BG-EVAL] Background evaluation failed:", err.message);
    }
}

// ─── Finalization (end of interview) ────────────────────────────────────────

async function finalizeInterview(session, sessionId) {
    try {
        // Wait briefly for any in-flight background evaluations to finish
        // (they push to session.answerEvaluations which is shared by reference)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const calculatedOverallScore = session.answerEvaluations.length > 0
            ? averageInterviewScore(session.answerEvaluations)
            : 0;

        let evaluation = {
            score: calculatedOverallScore,
            feedback: summarizeInterviewFallback(session.answerEvaluations, calculatedOverallScore)
        };

        // Attempt AI-generated summary
        try {
            const evalPrompt = buildFinalEvalPrompt(session, session.answerEvaluations, calculatedOverallScore);
            const resText = await callInterviewAI(
                evalPrompt,
                900,
                true,
                `You are a senior ${session.roleInfo.roleCategory === 'ai_engineer' ? 'AI/ML engineering' : session.roleInfo.isTech ? 'technical' : 'professional'} evaluator. Summarize this interview objectively in valid JSON.`
            );
            console.log("[FAST-FINAL-EVAL] Raw AI Response:", resText);
            const parsed = parseJsonObject(resText);
            if (parsed?.feedback) {
                evaluation.feedback = parsed.feedback;
            }
        } catch (e) {
            console.error("[FAST-FINAL-EVAL] Parsing failed:", e.message);
        }

        console.log("[FAST-FINAL-EVAL] Final Score:", evaluation.score);

        // Ownership vetting score
        const ownershipEvals = session.answerEvaluations.filter(e => e.questionNumber >= Math.ceil((session.totalQuestions || MAX_INTERVIEW_QUESTIONS) / 2));
        const ownershipScore = ownershipEvals.length > 0
            ? Math.round(ownershipEvals.reduce((sum, e) => sum + e.marks, 0) / ownershipEvals.length)
            : 0;

        // Fetch existing application to avoid overwriting fuller rescued answers
        const existingApp = await Application.findOne({ userId: session.userId, jobId: session.jobId }).lean();
        const finalAnswers = session.answerEvaluations.slice(0, MAX_INTERVIEW_QUESTIONS).map((entry, idx) => {
            const existing = existingApp?.interviewAnswers?.[idx];
            const useExisting = existing?.answer && existing.answer.trim().length > (entry.answer || "").trim().length + 5;
            
            return {
                question: entry.question || existing?.question || "",
                answer: useExisting ? existing.answer : (entry.answer || ""),
                score: useExisting && typeof existing.score === 'number' ? existing.score : (entry.score || 0),
                marks: useExisting && typeof existing.marks === 'number' ? existing.marks : (entry.marks || 0),
                feedback: useExisting && existing.feedback ? existing.feedback : (entry.feedback || "")
            };
        });

        // Update Application document
        await Application.findOneAndUpdate(
            { userId: session.userId, jobId: session.jobId },
            {
                interviewScore: Math.round(evaluation.score * 0.70),
                status: 'APPLIED',
                resultsVisibleAt: new Date(),
                metrics: {
                    ownershipMindset: ownershipScore
                },
                interviewAnswers: finalAnswers
            },
            { upsert: true }
        );

        // Compute final composite score
        const app = await Application.findOne({ userId: session.userId, jobId: session.jobId }).populate('jobId');
        if (app) {
            const r = Number(app.resumeMatchPercent || 0);
            const a = Number(app.assessmentScore || 0);
            const i = Number(app.interviewScore || 0);
            const job = app.jobId;

            app.finalScore = r + a + i;

            if (app.finalScore >= 55) app.status = 'SHORTLISTED';
            await app.save();
            console.log(`[FAST-FINAL-EVAL] Application Updated. Final Score: ${app.finalScore}`);
        }

        await deleteSession(sessionId);

        return {
            finalScore: Math.round(evaluation.score * 0.70),
            ownershipScore,
            feedback: evaluation.feedback
        };

    } catch (err) {
        console.error("[FAST-FINAL-EVAL] Finalization error:", err.message);
        await deleteSession(sessionId);
        return {
            finalScore: 0,
            ownershipScore: 0,
            feedback: "Interview completed. Evaluation could not be generated."
        };
    }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/interview/next-fast
 *
 * Fast version of the /next endpoint.
 * Accepts: { sessionId, answerText }
 * Returns the next question in ~2-4 seconds instead of ~20-30 seconds.
 */
router.post('/next-fast', async (req, res) => {
    try {
        const { sessionId, answerText } = req.body;
        const session = await loadSession(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        const normalizedAnswer = String(answerText || '').trim();

        const interviewers = session.history.filter(h => h.role === 'interviewer');
        const currentQuestionNumber = interviewers.length;
        const currentQuestion = interviewers[interviewers.length - 1]?.content || "";

        // 1. Push candidate's answer to conversation history
        session.history.push({ role: 'candidate', content: normalizedAnswer });

        // 2. FIRE-AND-FORGET: Evaluate and save in the background (DO NOT AWAIT)
        evaluateAnswerInBackground(
            session,
            sessionId,
            currentQuestion,
            normalizedAnswer,
            currentQuestionNumber
        ).catch(err => console.error("[FAST-BG-EVAL-UNCAUGHT]:", err.message));

        // 3. Check if we've reached the maximum number of questions
        if (interviewers.length >= MAX_INTERVIEW_QUESTIONS) {
            console.log(`[FAST-INTERVIEW-END] Finalizing session for user: ${session.userId}`);

            // For finalization, we DO need to wait for scores
            const result = await finalizeInterview(session, sessionId);

            return res.json({
                hasNext: false,
                finalScore: result.finalScore,
                ownershipScore: result.ownershipScore,
                feedback: result.feedback
            });
        }

        // 4. Generate the next question (THIS IS THE ONLY AWAITED LLM CALL)
        const nextQuestionNumber = interviewers.length + 1;
        const nextPrompt = buildNextQuestionPrompt(session, nextQuestionNumber);

        let nextQuestion = await callInterviewAI(nextPrompt, 200, false, session.systemPrompt);

        if (!nextQuestion) {
            if (session.roleInfo.roleCategory === 'ai_engineer') {
                nextQuestion = "Can you elaborate on the specific technical trade-offs you considered and how you would evaluate the performance of that approach in a production AI system?";
            } else if (session.roleInfo.isTech) {
                nextQuestion = "Can you elaborate on the technical implementation details of that approach?";
            } else {
                nextQuestion = "Could you walk me through how you would specifically handle that situation in this role?";
            }
        }

        // 5. Push the new question to history and persist
        session.history.push({ role: 'interviewer', content: nextQuestion });
        await saveSession(sessionId, session);

        // Voice generation (TTS) — select voice based on role category for best human quality
        let audioBase64 = null;
        let audioMimeType = null;
        try {
            const { generateSpeech } = require('../services/tts.service');
            const interviewVoice = session.roleInfo?.roleCategory === 'sales' || session.roleInfo?.roleCategory === 'marketing'
                ? 'vp_sales'
                : 'professional_interviewer';
            const ttsResult = await generateSpeech(nextQuestion, interviewVoice);
            if (ttsResult) {
                audioBase64 = ttsResult.buffer.toString('base64');
                audioMimeType = ttsResult.mimeType;
            }
        } catch (e) {
            console.warn("[FAST-NEXT] TTS generation failed:", e.message);
        }

        // 6. Return immediately (Total server time: ~2-4s)
        res.json({
            hasNext: true,
            question: nextQuestion,
            audio: audioBase64,
            audioMimeType: audioMimeType,
            currentQuestionNumber: session.history.filter(h => h.role === 'interviewer').length,
            totalQuestions: session.totalQuestions
        });

    } catch (error) {
        console.error("[FAST-NEXT] Error:", error);
        res.status(500).json({ success: false, message: "Error fetching next question" });
    }
});

/**
 * POST /api/interview/upload-audio-async
 *
 * Fire-and-forget audio upload endpoint.
 * The frontend sends the recorded audio here for archival/proctoring,
 * but does NOT wait for transcription results.
 */
router.post('/upload-audio-async', require('../middleware/secureUpload').single('audio'), async (req, res) => {
    // Immediately respond so the frontend is not blocked
    res.json({ success: true, message: "Audio received for background processing" });

    // Process in background
    try {
        if (req.file) {
            const path = require('path');
            const fs = require('fs-extra');
            const audioPath = path.resolve(req.file.path);
            const { sessionId, interviewId, questionNumber, localTranscript } = req.body;
            const targetSessionId = sessionId || interviewId;

            try {
                const transcriptionService = require('../transcription_service');
                const transcript = await transcriptionService.transcribeAudio(audioPath);
                console.log(`[FAST-AUDIO-ASYNC] Background transcription: "${transcript}"`);

                if (transcript && transcript.trim().length > 0 && targetSessionId) {
                    const normalizedBg = transcript.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").trim();
                    const invalidWhisperPhrases = [
                        "thank you", "e ai", "legend by", "watching", "by subtitle", 
                        "subtitles by", "english subtitles", "you", "e aí",
                        "i am describing my technical experience and relevant skills for this specific role"
                    ];
                    const isBgInvalid = invalidWhisperPhrases.includes(normalizedBg);

                    if (!isBgInvalid) {
                        const session = await loadSession(targetSessionId);
                        const targetQNum = Number(questionNumber) || 1;
                        const fullAnswer = transcript.trim();

                        if (session) {
                            const targetEvalIndex = (session.answerEvaluations || []).findIndex(e => e.questionNumber === targetQNum);
                            const existingEval = targetEvalIndex !== -1 ? session.answerEvaluations[targetEvalIndex] : null;
                            const currentStoredAnswer = existingEval ? existingEval.answer : (localTranscript || "");

                            // Rescue: If background transcript has more content or existing answer is short/empty
                            if (!currentStoredAnswer || currentStoredAnswer.trim().length < 5 || fullAnswer.length > currentStoredAnswer.trim().length + 5) {
                                console.log(`[FAST-RESCUE] Upgrading Q${targetQNum} in MongoDB session with full STT transcript (${fullAnswer.length} chars vs stored ${currentStoredAnswer.length} chars)`);
                                
                                // Re-evaluate score with full answer
                                const heuristic = scoreInterviewAnswer({
                                    questionText: existingEval?.question || "",
                                    answerText: fullAnswer,
                                    jobSkills: session.jobSkills,
                                    jobDescription: session.jobDescription
                                });

                                if (existingEval) {
                                    existingEval.answer = fullAnswer;
                                    existingEval.score = heuristic.score;
                                    existingEval.marks = heuristic.marks;
                                    existingEval.feedback = heuristic.feedback;
                                }

                                // Update session history
                                let candCount = 0;
                                for (let i = 0; i < (session.history || []).length; i++) {
                                    if (session.history[i].role === 'candidate') {
                                        candCount++;
                                        if (candCount === targetQNum) {
                                            session.history[i].content = fullAnswer;
                                            break;
                                        }
                                    }
                                }

                                await saveSession(targetSessionId, session);

                                // Update Application collection in MongoDB
                                try {
                                    const app = await Application.findOne({
                                        userId: session.userId,
                                        jobId: new mongoose.Types.ObjectId(session.jobId)
                                    });
                                    if (app && app.interviewAnswers && app.interviewAnswers.length > 0) {
                                        const idx = app.interviewAnswers.findIndex(a => a.question === (existingEval?.question || app.interviewAnswers[targetQNum - 1]?.question));
                                        if (idx !== -1) {
                                            app.interviewAnswers[idx].answer = fullAnswer;
                                            app.interviewAnswers[idx].score = heuristic.score;
                                            app.interviewAnswers[idx].marks = heuristic.marks;
                                            app.interviewAnswers[idx].feedback = heuristic.feedback;
                                            await app.save();
                                            console.log(`[FAST-RESCUE] MongoDB Application.interviewAnswers updated for Q${targetQNum}`);
                                        }
                                    }
                                } catch (dbErr) {
                                    console.error("[FAST-RESCUE] DB update error:", dbErr.message);
                                }
                            }
                        } else if (targetSessionId) {
                            // Direct Rescue Fallback: If session was deleted upon finalization, update Application directly
                            try {
                                const app = await Application.findOne({
                                    $or: [
                                        { recordingSessionId: targetSessionId },
                                        ...(mongoose.Types.ObjectId.isValid(targetSessionId) ? [{ _id: targetSessionId }] : [])
                                    ]
                                });
                                if (app && app.interviewAnswers && app.interviewAnswers.length >= targetQNum) {
                                    const idx = targetQNum - 1;
                                    const currentAppAnswer = app.interviewAnswers[idx]?.answer || "";
                                    if (!currentAppAnswer || currentAppAnswer.trim().length < 5 || fullAnswer.length > currentAppAnswer.trim().length + 5) {
                                        console.log(`[FAST-RESCUE-DIRECT] Upgrading finalized Application Q${targetQNum} answer (${fullAnswer.length} chars)`);
                                        const heuristic = scoreInterviewAnswer({
                                            questionText: app.interviewAnswers[idx]?.question || "",
                                            answerText: fullAnswer,
                                            jobSkills: [],
                                            jobDescription: ""
                                        });

                                        app.interviewAnswers[idx].answer = fullAnswer;
                                        app.interviewAnswers[idx].score = heuristic.score;
                                        app.interviewAnswers[idx].marks = heuristic.marks;
                                        app.interviewAnswers[idx].feedback = heuristic.feedback;
                                        await app.save();
                                        console.log(`[FAST-RESCUE-DIRECT] MongoDB Application updated directly for Q${targetQNum}`);
                                    }
                                }
                            } catch (directErr) {
                                console.error("[FAST-RESCUE-DIRECT] DB update error:", directErr.message);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("[FAST-AUDIO-ASYNC] Background transcription failed:", e.message);
            }

            // Clean up the temp file
            if (!audioPath.includes('private_storage')) {
                await fs.remove(audioPath).catch(() => null);
            }
        }
    } catch (err) {
        console.error("[FAST-AUDIO-ASYNC] Background processing error:", err.message);
    }
});

module.exports = router;
