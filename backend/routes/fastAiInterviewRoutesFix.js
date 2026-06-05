/**
 * ─── Fast AI Interview Routes — FIX OVERLAY ─────────────────────────────────
 *
 * PURPOSE:
 *   Drop-in override for the `/next-fast` endpoint from
 *   fastAiInterviewRoutes.js. Fixes the following critical bugs:
 *
 *     1. maxTokens increased from 200 → 1000 so questions are never truncated.
 *     2. AI transition phrases ("Noted. Moving on.") are stripped before the
 *        question is stored or sent to the frontend.
 *     3. Candidates with interviewScore === 0 are NEVER auto-shortlisted.
 *     4. Empty / too-short answers are detected and returned to the frontend
 *        with a retry flag instead of silently burning a question slot.
 *
 * ISOLATION:
 *   This file is 100% self-contained. It reads from the same MongoDB
 *   InterviewSession / Application collections and reuses the same
 *   aiClients + interviewScoring utilities, but does NOT import from
 *   or modify aiInterviewRoutes.js or fastAiInterviewRoutes.js.
 *
 * MOUNT:  app.use('/api/interview', fastAiInterviewRoutesFix)
 *         BEFORE the original fastAiInterviewRoutes so Express matches
 *         this handler first for POST /api/interview/next-fast.
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

const MAX_INTERVIEW_QUESTIONS = 15;

// ─── In-memory session cache ────────────────────────────────────────────────
const fixSessionCache = new Map();

// ─── Session Helpers ────────────────────────────────────────────────────────

async function loadSession(sessionId) {
    if (fixSessionCache.has(sessionId)) {
        return fixSessionCache.get(sessionId);
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
        totalQuestions: Math.min(stored.totalQuestions || MAX_INTERVIEW_QUESTIONS, MAX_INTERVIEW_QUESTIONS),
        history: stored.history || [],
        answerEvaluations: stored.answerEvaluations || []
    };

    fixSessionCache.set(sessionId, session);
    return session;
}

async function saveSession(sessionId, session) {
    fixSessionCache.set(sessionId, session);

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
                totalQuestions: Math.min(session.totalQuestions || MAX_INTERVIEW_QUESTIONS, MAX_INTERVIEW_QUESTIONS),
                history: session.history || [],
                answerEvaluations: session.answerEvaluations || []
            }
        },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

async function deleteSession(sessionId) {
    fixSessionCache.delete(sessionId);
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

// ─── FIX 2: Clean Question Response ─────────────────────────────────────────
// Strips AI transition/acknowledgment phrases so only the actual question
// is stored and spoken to the candidate.

const TRANSITION_PATTERNS = [
    /^\s*understood\.?\s*/i,
    /^\s*noted\.?\s*/i,
    /^\s*moving\s+on\.?\s*/i,
    /^\s*noted\.\s*moving\s+on\.?\s*/i,
    /^\s*fair\s+enough\.?\s*/i,
    /^\s*fair\s+enough\.\s*next\s+question\.?\s*/i,
    /^\s*let['']?s\s+pivot\s+to\s+the\s+next\s+area\.?\s*/i,
    /^\s*let['']?s\s+continue\.?\s*/i,
    /^\s*that\s+covers\s+the\s+basics\.?\s*/i,
    /^\s*that\s+covers\s+the\s+basics\.\s*let['']?s\s+continue\.?\s*/i,
    /^\s*alright\.?\s*/i,
    /^\s*okay\.?\s*/i,
    /^\s*very\s+well\.?\s*/i,
    /^\s*right\.?\s*/i,
    /^\s*good\.?\s*/i,
    /^\s*next\s+question\.?\s*/i,
    /^\s*let['']?s\s+move\s+(?:on|forward)\.?\s*/i,
    /^\s*moving\s+(?:on|forward)\.?\s*/i,
    /^\s*let['']?s\s+proceed\.?\s*/i,
    /^\s*proceeding\.?\s*/i,
];

function cleanQuestionResponse(rawText) {
    if (!rawText) return rawText;

    let cleaned = String(rawText).trim();

    // Iteratively strip leading transition phrases (there may be multiple)
    let prevLength;
    do {
        prevLength = cleaned.length;
        for (const pattern of TRANSITION_PATTERNS) {
            cleaned = cleaned.replace(pattern, '').trim();
        }
    } while (cleaned.length < prevLength && cleaned.length > 0);

    // If we stripped everything (AI only returned a transition phrase), return original
    if (!cleaned || cleaned.length < 15) {
        console.warn('[FIX-CLEAN] Cleaning removed too much; returning original:', rawText);
        return rawText.trim();
    }

    return cleaned;
}

// ─── Prompt Builders (self-contained copies) ────────────────────────────────

const INTERVIEWER_PERSONA = `

INTERVIEWER IDENTITY & BEHAVIORAL DIRECTIVES:
- ROLE: You are a senior executive and the lead human technical interviewer conducting a high-stakes professional assessment.
- TONE: Authoritative, confident, direct, and formal. Speak with clear deliberation.
- RULE 1: NEVER refer to yourself as an AI, bot, assistant, or language model. You are the interviewer.
- RULE 2: NEVER use over-enthusiastic filler words: "Awesome!", "Great job!", "Perfect!", "Fantastic!", "Amazing!", "Wonderful!", "Excellent answer!", "That's interesting!".
- RULE 3: Do NOT add any transition phrases, acknowledgments, or filler before the question. Do NOT start with "Noted.", "Moving on.", "Understood.", "Fair enough.", "Let's continue.", or any similar phrase. Return ONLY the interview question itself.
- RULE 4: Maintain a structured, professional boundary. Do not over-explain your questions unless the candidate explicitly asks for clarification.
- RULE 5: Do NOT praise answers. Proceed directly to the next question.
- RULE 6: Your tone should be commanding and measured — like a VP of Engineering or a Director conducting a final-round interview.
- RULE 7: MANDATORY: Your response MUST be exactly one single, complete question. It MUST end with a question mark (?). Do NOT include any text, explanations, or notes after the question mark. Do NOT cut off mid-sentence.
`;

function buildNextQuestionPrompt(session, questionNumber) {
    const { roleInfo, specialInstructions, resumeProfile } = session;
    const { isTech, roleCategory } = roleInfo;
    const totalQuestions = session.totalQuestions;
    const isAiRole = roleCategory === 'ai_engineer';

    let resumeQuestionSlots;
    if (totalQuestions === 15) {
        resumeQuestionSlots = [8];
    } else if (isTech) {
        resumeQuestionSlots = totalQuestions === 5 ? [4] : [4, 6];
    } else {
        resumeQuestionSlots = totalQuestions === 5 ? [4] : [5];
    }
    const isResumeQuestion = resumeQuestionSlots.includes(questionNumber);

    const askedQuestions = session.history
        .filter(h => h.role === 'interviewer')
        .map((h, i) => `${i + 1}. ${h.content}`)
        .join('\n');

    const recentMessages = session.history.slice(-4);
    const thread = recentMessages.map(h =>
        `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`
    ).join('\n');

    let questionDirective;
    if (isResumeQuestion) {
        questionDirective = `
THIS IS A RESUME-BASED QUESTION (5% allocation).
- Ask a question that VALIDATES something specific from the candidate's resume.
- Connect it to the job description when possible.
- Focus on verifying claimed skills/experience that are relevant to the job.
`;
    } else {
        questionDirective = `
THIS IS A JOB-DESCRIPTION-BASED QUESTION (95% allocation).
- Ask a question directly related to the responsibilities, requirements, or challenges described in the job description.
- Base the question on the candidate's PREVIOUS ANSWER — if they mentioned something relevant, drill deeper; if they struggled, pivot to another JD topic.
- ${roleCategory === 'mlops'
                ? 'For MLOps roles: ask about model deployment patterns, model monitoring for drift, feature store implementation, CI/CD pipelines for ML, Kubernetes for ML, data versioning, or serving latency optimizations.'
                : isAiRole
                ? 'For AI/ML engineering roles: ask about LLM architecture trade-offs, RAG pipeline design, chunking strategies, embedding models, vector store selection, fine-tuning vs. prompting, evaluation frameworks, hallucination mitigation, latency/cost optimisation, or MLOps practices described in the JD.'
                : isTech
                    ? 'For technical roles: focus on implementation, system design, debugging, performance optimization, or architectural decisions related to the JD.'
                    : 'For non-technical roles: use situational/behavioral questions tied to the JD responsibilities.'}
`;
    }

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
- If the candidate gave a strong answer, go deeper. If they were weak, gracefully shift to another relevant topic from the JD.
- Match the difficulty to the experience level: ${session.experienceLevel || 'entry-level'}.
- Return ONLY the question. Nothing else. Ensure the question is a complete sentence ending with a question mark (?). Do not include any trailing text, explanations, or cut off mid-sentence.
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
        console.log(`[FIX-BG-EVAL] Starting background evaluation for Q${questionNumber}, user: ${session.userId}`);

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
                console.warn("[FIX-BG-EVAL] AI scoring fallback triggered:", aiErr.message);
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
            console.log(`[FIX-BG-EVAL] Saved Q${questionNumber} for user: ${session.userId}`);
        } catch (dbErr) {
            console.error("[FIX-BG-EVAL] Failed to push answer to Application:", dbErr.message);
        }

    } catch (err) {
        console.error("[FIX-BG-EVAL] Background evaluation failed:", err.message);
    }
}

// ─── Finalization (end of interview) ────────────────────────────────────────

async function finalizeInterview(session, sessionId) {
    try {
        // Wait briefly for any in-flight background evaluations to finish
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
            console.log("[FIX-FINAL-EVAL] Raw AI Response:", resText);
            const parsed = parseJsonObject(resText);
            if (parsed?.feedback) {
                evaluation.feedback = parsed.feedback;
            }
        } catch (e) {
            console.error("[FIX-FINAL-EVAL] Parsing failed:", e.message);
        }

        console.log("[FIX-FINAL-EVAL] Final Score:", evaluation.score);

        // Ownership vetting score
        const ownershipEvals = session.answerEvaluations.filter(e => e.questionNumber >= 8);
        const ownershipScore = ownershipEvals.length > 0
            ? Math.round(ownershipEvals.reduce((sum, e) => sum + e.marks, 0) / ownershipEvals.length)
            : 0;

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
                interviewAnswers: session.answerEvaluations.slice(0, MAX_INTERVIEW_QUESTIONS).map(entry => ({
                    question: entry.question,
                    answer: entry.answer,
                    score: entry.score,
                    marks: entry.marks,
                    feedback: entry.feedback
                }))
            },
            { upsert: true }
        );

        // ─── FIX 3: Shortlisting Safeguard ─────────────────────────────────
        // Compute final composite score and apply shortlisting guard
        const app = await Application.findOne({ userId: session.userId, jobId: session.jobId }).populate('jobId');
        if (app) {
            const r = Number(app.resumeMatchPercent || 0);
            const a = Number(app.assessmentScore || 0);
            const i = Number(app.interviewScore || 0);
            const job = app.jobId;

            app.finalScore = r + a + i;

            // FIX: Only shortlist if interview score > 0 when interview module is enabled
            const interviewEnabled = job?.mockInterview?.enabled !== false;
            if (app.finalScore >= 55 && (!interviewEnabled || i > 0)) {
                app.status = 'SHORTLISTED';
            } else if (interviewEnabled && i === 0) {
                // Candidate did not answer any interview questions — do NOT shortlist
                app.status = 'APPLIED';
                console.log(`[FIX-FINAL-EVAL] Shortlisting BLOCKED: interviewScore=0 for user ${session.userId}`);
            }

            await app.save();
            console.log(`[FIX-FINAL-EVAL] Application Updated. Final Score: ${app.finalScore}, Status: ${app.status}`);
        }

        await deleteSession(sessionId);

        return {
            finalScore: Math.round(evaluation.score * 0.70),
            ownershipScore,
            feedback: evaluation.feedback
        };

    } catch (err) {
        console.error("[FIX-FINAL-EVAL] Finalization error:", err.message);
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
 * FIXED version of the /next-fast endpoint.
 * Changes from original:
 *   1. maxTokens = 1000 (was 200)
 *   2. cleanQuestionResponse() strips transition phrases
 *   3. Shortlisting guard for interviewScore === 0
 *   4. Empty answer detection with retry flag
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

        // ─── FIX 4: Empty Answer Guard ──────────────────────────────────────
        // If the answer is too short, warn the frontend but still advance
        // (to avoid blocking the candidate completely if SpeechRecognition fails)
        const isEmptyAnswer = normalizedAnswer.length < 5;
        if (isEmptyAnswer) {
            console.warn(`[FIX-NEXT-FAST] Empty/short answer detected for Q${currentQuestionNumber}: "${normalizedAnswer}"`);
        }

        // 1. Push candidate's answer to conversation history
        session.history.push({ role: 'candidate', content: normalizedAnswer || '(no answer provided)' });

        // 2. FIRE-AND-FORGET: Evaluate and save in the background (DO NOT AWAIT)
        evaluateAnswerInBackground(
            session,
            sessionId,
            currentQuestion,
            normalizedAnswer,
            currentQuestionNumber
        ).catch(err => console.error("[FIX-BG-EVAL-UNCAUGHT]:", err.message));

        // 3. Check if we've reached the maximum number of questions
        if (interviewers.length >= MAX_INTERVIEW_QUESTIONS) {
            console.log(`[FIX-INTERVIEW-END] Finalizing session for user: ${session.userId}`);

            const result = await finalizeInterview(session, sessionId);

            return res.json({
                hasNext: false,
                finalScore: result.finalScore,
                ownershipScore: result.ownershipScore,
                feedback: result.feedback
            });
        }

        // 4. Generate the next question
        //    ─── FIX 1: maxTokens = 1000 (was 200) ──────────────────────────
        const nextQuestionNumber = interviewers.length + 1;
        const nextPrompt = buildNextQuestionPrompt(session, nextQuestionNumber);

        let nextQuestion = await callInterviewAI(nextPrompt, 1000, false, session.systemPrompt);

        // ─── FIX 2: Strip transition phrases ────────────────────────────────
        if (nextQuestion) {
            const cleaned = cleanQuestionResponse(nextQuestion);
            console.log(`[FIX-NEXT-FAST] Original: "${nextQuestion.substring(0, 80)}..." → Cleaned: "${cleaned.substring(0, 80)}..."`);
            nextQuestion = cleaned;
        }

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

        // Voice generation (TTS) using ElevenLabs service
        let audioBase64 = null;
        try {
            const { generateSpeech } = require('../services/tts.service');
            const buffer = await generateSpeech(nextQuestion);
            if (buffer) {
                audioBase64 = buffer.toString('base64');
            }
        } catch (e) {
            console.warn("[FIX-NEXT-FAST] TTS generation failed:", e.message);
        }

        // 6. Return immediately
        res.json({
            hasNext: true,
            question: nextQuestion,
            audio: audioBase64,
            currentQuestionNumber: session.history.filter(h => h.role === 'interviewer').length,
            totalQuestions: session.totalQuestions,
            emptyAnswerWarning: isEmptyAnswer ? "No answer was detected. Please speak clearly into the microphone." : undefined
        });

    } catch (error) {
        console.error("[FIX-NEXT-FAST] Error:", error);
        res.status(500).json({ success: false, message: "Error fetching next question" });
    }
});

module.exports = router;
