/**
 * ─── Key-Point Interceptor — /next-fast Override ────────────────────────────
 *
 * PURPOSE:
 *   Drop-in interceptor for POST /api/interview/next-fast.
 *   When a candidate answers a question (AI_GENERATED mode), this handler:
 *     1. Extracts KEY POINTS from the candidate's spoken answer.
 *     2. Validates each key point (specific? relevant? depth-worthy?).
 *     3. If valid key points exist → asks a FOLLOW-UP drilling into that key point.
 *     4. If no valid key points   → SKIPS follow-up and asks a new JD topic.
 *
 *   For RECRUITER_PROVIDED mode, this handler passes through to the existing
 *   fastAiInterviewRoutesFix handler (no key-point logic needed).
 *
 * ISOLATION:
 *   This file is 100% self-contained. It reads from the same MongoDB
 *   InterviewSession / Application collections and reuses the same
 *   aiClients + interviewScoring utilities, but does NOT import from
 *   or modify fastAiInterviewRoutesFix.js, aiInterviewRoutes.js, or
 *   fastAiInterviewRoutes.js.
 *
 * MOUNT:  app.use('/api/interview', keyPointInterceptor)
 *         BEFORE fastAiInterviewRoutesFix so Express matches this handler
 *         first for POST /api/interview/next-fast.
 * ────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { callInterviewAI, safeParseAIJson } = require('../utils/aiClients');
const { extractAndValidateKeyPoints } = require('../utils/keyPointExtractor');
const Application = require('../models/Application');
const InterviewSession = require('../models/InterviewSession');
const {
    averageInterviewScore,
    clamp,
    roundToTenth,
    scoreInterviewAnswer
} = require('../utils/interviewScoring');

const MAX_INTERVIEW_QUESTIONS = 10;
const MAX_FOLLOW_UPS_PER_TOPIC = 3;

// ─── In-memory session cache (separate instance from fastAiInterviewRoutesFix) ──
const kpSessionCache = new Map();

// ─── Concurrency Lock ──────────────────────────────────────────────────────
const kpInFlightRequests = new Set();

// ═══════════════════════════════════════════════════════════════════════════
// SESSION HELPERS (replicated for isolation — same MongoDB model)
// ═══════════════════════════════════════════════════════════════════════════

async function loadSession(sessionId) {
    if (kpSessionCache.has(sessionId)) {
        return kpSessionCache.get(sessionId);
    }

    const stored = await InterviewSession.findOne({ sessionId }).lean();
    if (!stored) return null;

    const isRecruiterMode = stored.questionSource === 'RECRUITER_PROVIDED';
    const totalQuestions = isRecruiterMode
        ? (stored.totalQuestions || stored.selectedQuestions?.length || 5)
        : Math.min(stored.totalQuestions || MAX_INTERVIEW_QUESTIONS, MAX_INTERVIEW_QUESTIONS);

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
        questionSource: stored.questionSource || 'AI_GENERATED',
        selectedQuestions: stored.selectedQuestions || [],
        currentQuestionIndex: stored.currentQuestionIndex || 0,
        totalQuestions,
        history: stored.history || [],
        answerEvaluations: stored.answerEvaluations || [],
        // In-memory only: key-point follow-up tracking (not persisted to MongoDB)
        _followUpCount: 0,
        _lastKeyPoints: null
    };

    kpSessionCache.set(sessionId, session);
    return session;
}

async function saveSession(sessionId, session) {
    kpSessionCache.set(sessionId, session);

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
                questionSource: session.questionSource || 'AI_GENERATED',
                selectedQuestions: session.selectedQuestions || [],
                currentQuestionIndex: session.currentQuestionIndex || 0,
                totalQuestions: session.totalQuestions,
                history: session.history || [],
                answerEvaluations: session.answerEvaluations || []
            }
        },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

async function deleteSession(sessionId) {
    kpSessionCache.delete(sessionId);
}

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION RESPONSE CLEANUP (replicated from fastAiInterviewRoutesFix.js)
// ═══════════════════════════════════════════════════════════════════════════

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

    let prevLength;
    do {
        prevLength = cleaned.length;
        for (const pattern of TRANSITION_PATTERNS) {
            cleaned = cleaned.replace(pattern, '').trim();
        }
    } while (cleaned.length < prevLength && cleaned.length > 0);

    if (!cleaned || cleaned.length < 15) {
        console.warn('[KP-CLEAN] Cleaning removed too much; returning original:', rawText);
        return rawText.trim();
    }
    return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANSWER EVALUATION (replicated from fastAiInterviewRoutesFix.js)
// ═══════════════════════════════════════════════════════════════════════════

function buildAnswerEvaluationPrompt(session, questionText, answerText, questionNumber) {
    const { roleInfo } = session;
    const { isTech, roleCategory } = roleInfo || { isTech: false, roleCategory: 'general' };
    const isAiRole = roleCategory === 'ai_engineer';
    const isRecruiterProvided = session.questionSource === 'RECRUITER_PROVIDED';

    if (isRecruiterProvided) {
        return `
You are a senior professional interview evaluator scoring ONE interview answer.

CRITICAL INSTRUCTION:
This question was explicitly supplied by the recruiter.
- Evaluate the candidate's answer directly against the recruiter question.
- Do not rewrite the question.
- Do not create a follow-up question.

=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Required Skills: ${(session.jobSkills || []).join(', ') || 'Not specified'}

=== QUESTION NUMBER ===
${questionNumber}

=== RECRUITER QUESTION ===
${questionText || 'Not specified'}

=== CANDIDATE ANSWER ===
${answerText || 'No answer provided'}

=== TASK ===
Evaluate ONLY this single answer and return ONLY a JSON object:
{
  "marks": <number 0-10>,
  "percentage": <number 0-100>,
  "feedback": "<one concise sentence providing the exact reason for the assessment score>"
}
`;
    }

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

async function evaluateAnswerInBackground(session, sessionId, questionText, answerText, questionNumber) {
    try {
        console.log(`[KP-BG-EVAL] Starting background evaluation for Q${questionNumber}, user: ${session.userId}`);

        const heuristic = scoreInterviewAnswer({
            questionText,
            answerText,
            jobSkills: session.jobSkills,
            jobDescription: session.jobDescription
        });

        let evaluation = heuristic;

        if (heuristic.isAttempted !== false) {
            try {
                const prompt = buildAnswerEvaluationPrompt(session, questionText, answerText, questionNumber);
                const rawResponse = await callInterviewAI(
                    prompt,
                    500,
                    true,
                    `You are a strict ${session.roleInfo.roleCategory === 'ai_engineer' ? 'AI/ML engineering' : session.roleInfo.isTech ? 'technical' : 'professional'} interviewer. Score only the candidate's latest answer and respond with valid JSON.`
                );
                const parsed = safeParseAIJson(rawResponse, null);
                if (parsed) {
                    evaluation = normalizeAiEvaluation(parsed, heuristic);
                }
            } catch (aiErr) {
                console.warn("[KP-BG-EVAL] AI scoring fallback triggered:", aiErr.message);
            }
        }

        const qObj = session.selectedQuestions?.[questionNumber - 1];
        const qId = qObj?.questionId || null;
        const qSource = session.questionSource === 'RECRUITER_PROVIDED' ? 'RECRUITER' : 'AI';

        session.answerEvaluations.push({
            questionNumber,
            questionId: qId,
            question: questionText,
            answer: answerText,
            score: evaluation.score,
            marks: evaluation.marks,
            feedback: evaluation.feedback,
            isAttempted: evaluation.isAttempted !== false,
            source: qSource
        });

        await saveSession(sessionId, session);

        try {
            await Application.findOneAndUpdate(
                {
                    userId: session.userId,
                    jobId: new mongoose.Types.ObjectId(session.jobId)
                },
                {
                    $push: {
                        interviewAnswers: {
                            questionId: qId,
                            question: questionText,
                            answer: answerText,
                            score: evaluation.score,
                            marks: evaluation.marks,
                            feedback: evaluation.feedback,
                            source: qSource
                        }
                    }
                }
            );
            console.log(`[KP-BG-EVAL] Saved Q${questionNumber} for user: ${session.userId} (source: ${qSource})`);
        } catch (dbErr) {
            console.error("[KP-BG-EVAL] Failed to push answer to Application:", dbErr.message);
        }

    } catch (err) {
        console.error("[KP-BG-EVAL] Background evaluation failed:", err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// FINALIZATION (replicated from fastAiInterviewRoutesFix.js)
// ═══════════════════════════════════════════════════════════════════════════

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
                `You are a senior ${session.roleInfo?.roleCategory === 'ai_engineer' ? 'AI/ML engineering' : session.roleInfo?.isTech ? 'technical' : 'professional'} evaluator. Summarize this interview objectively in valid JSON.`
            );
            console.log("[KP-FINAL-EVAL] Raw AI Response:", resText);
            const parsed = safeParseAIJson(resText, null);
            if (parsed?.feedback) {
                evaluation.feedback = parsed.feedback;
            }
        } catch (e) {
            console.error("[KP-FINAL-EVAL] Parsing failed:", e.message);
        }

        console.log("[KP-FINAL-EVAL] Final Score:", evaluation.score);

        // Ownership vetting score
        const ownershipEvals = session.answerEvaluations.filter(e => e.questionNumber >= Math.ceil((session.totalQuestions || MAX_INTERVIEW_QUESTIONS) / 2));
        const ownershipScore = ownershipEvals.length > 0
            ? Math.round(ownershipEvals.reduce((sum, e) => sum + e.marks, 0) / ownershipEvals.length)
            : 0;

        const computedInterviewScore = session.answerEvaluations && session.answerEvaluations.length > 0
            ? Math.round((session.answerEvaluations.reduce((sum, e) => sum + (typeof e.marks === 'number' ? e.marks : 0), 0) / (session.answerEvaluations.length * 10)) * 70)
            : Math.round(evaluation.score * 0.70);

        // Fetch existing application to avoid overwriting fuller rescued answers
        const existingApp = await Application.findOne({ userId: session.userId, jobId: session.jobId }).lean();
        const maxQCount = session.totalQuestions || session.selectedQuestions?.length || MAX_INTERVIEW_QUESTIONS;
        const finalAnswers = session.answerEvaluations.slice(0, maxQCount).map((entry, idx) => {
            const existing = existingApp?.interviewAnswers?.[idx];
            const useExisting = existing?.answer && existing.answer.trim().length > (entry.answer || "").trim().length + 5;
            const qObj = session.selectedQuestions?.[idx];

            return {
                questionId: entry.questionId || qObj?.questionId || existing?.questionId || null,
                question: entry.question || existing?.question || "",
                answer: useExisting ? existing.answer : (entry.answer || ""),
                score: useExisting && typeof existing.score === 'number' ? existing.score : (entry.score || 0),
                marks: useExisting && typeof existing.marks === 'number' ? existing.marks : (entry.marks || 0),
                feedback: useExisting && existing.feedback ? existing.feedback : (entry.feedback || ""),
                source: entry.source || (session.questionSource === 'RECRUITER_PROVIDED' ? 'RECRUITER' : 'AI')
            };
        });

        const qSource = session.questionSource === 'RECRUITER_PROVIDED' ? 'RECRUITER_PROVIDED' : 'AI_GENERATED';

        // Update Application document
        await Application.findOneAndUpdate(
            { userId: session.userId, jobId: session.jobId },
            {
                interviewScore: computedInterviewScore,
                interviewQuestionSource: qSource,
                status: 'APPLIED',
                resultsVisibleAt: new Date(),
                metrics: {
                    ownershipMindset: ownershipScore
                },
                interviewAnswers: finalAnswers
            },
            { upsert: true }
        );

        // Shortlisting safeguard (same logic as fastAiInterviewRoutesFix)
        const app = await Application.findOne({ userId: session.userId, jobId: session.jobId }).populate('jobId');
        if (app) {
            const r = Number(app.resumeMatchPercent || 0);
            const a = Number(app.assessmentScore || 0);
            const c = Number(app.codingScore || 0);
            const i = Number(app.interviewScore || computedInterviewScore || 0);
            const job = app.jobId;

            app.interviewScore = i;
            app.finalScore = r + a + i;

            const interviewEnabled = job?.mockInterview?.enabled !== false;
            const codingEnabled = job?.codingAssessment?.enabled === true;
            const isCodingDone = !codingEnabled || (app.codingScore !== null && app.codingScore !== undefined);
            const isCodingPassed = !codingEnabled || (app.codingScore >= (job?.codingAssessment?.passingScore || 70));

            if (app.finalScore >= 55 && (!interviewEnabled || i > 0) && isCodingDone && isCodingPassed) {
                app.status = 'SHORTLISTED';
            } else {
                app.status = 'APPLIED';
                if (interviewEnabled && i === 0) {
                    console.log(`[KP-FINAL-EVAL] Shortlisting BLOCKED: interviewScore=0 for user ${session.userId}`);
                }
            }

            await app.save();
            try {
                const { invalidateCache } = require('../middleware/cacheMiddleware');
                invalidateCache('/api/applications');
            } catch (cacheErr) {
                // ignore
            }
            console.log(`[KP-FINAL-EVAL] Application Updated. Final Score: ${app.finalScore}, Status: ${app.status}`);
        }

        await deleteSession(sessionId);

        return {
            finalScore: Math.round(evaluation.score * 0.70),
            ownershipScore,
            feedback: evaluation.feedback
        };

    } catch (err) {
        console.error("[KP-FINAL-EVAL] Finalization error:", err.message);
        await deleteSession(sessionId);
        return {
            finalScore: 0,
            ownershipScore: 0,
            feedback: "Interview completed. Evaluation could not be generated."
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// KEY-POINT-AWARE QUESTION PROMPT (NEW — replaces buildNextQuestionPrompt)
// ═══════════════════════════════════════════════════════════════════════════

function buildKeyPointAwareQuestionPrompt(session, questionNumber, keyPointResult) {
    const { roleInfo, specialInstructions, resumeProfile } = session;
    const { isTech, roleCategory } = roleInfo;
    const totalQuestions = session.totalQuestions;
    const isAiRole = roleCategory === 'ai_engineer';

    // Resume question slots (identical to existing logic)
    let resumeQuestionSlots;
    if (totalQuestions === 15) {
        resumeQuestionSlots = [9];
    } else if (totalQuestions === 10) {
        resumeQuestionSlots = [8];
    } else {
        resumeQuestionSlots = [Math.max(1, totalQuestions - 1)];
    }
    const isResumeQuestion = resumeQuestionSlots.includes(questionNumber);

    // ─── Key-Point Directive (NEW) ──────────────────────────────────────────
    let keyPointDirective = '';
    const decision = keyPointResult?.decision || 'SKIP';

    if (decision === 'FOLLOW_UP' && keyPointResult?.followUpTarget) {
        keyPointDirective = `
=== KEY-POINT FOLLOW-UP DIRECTIVE ===
The candidate's previous answer contained a VALID and SPECIFIC key point worth exploring deeper.

KEY POINT TO DRILL INTO: "${keyPointResult.followUpTarget}"
SUGGESTED ANGLE: ${keyPointResult.followUpHint || 'Explore depth, trade-offs, or production challenges'}

YOUR TASK: Ask a FOLLOW-UP question that drills deeper into this SPECIFIC key point.
- If they mentioned a technology → ask about trade-offs, alternatives, or how they scaled it
- If they mentioned an architecture decision → ask about failure modes, edge cases, or why they chose it over alternatives
- If they mentioned a specific experience → ask for concrete metrics, challenges faced, or lessons learned
- Make the question SPECIFIC to the key point — do NOT ask a generic question
- Stay on the SAME topic — do NOT pivot to a new area
`;
    } else {
        keyPointDirective = `
=== SKIP FOLLOW-UP — NEW TOPIC DIRECTIVE ===
The candidate's previous answer did NOT contain specific, valid key points worth exploring further.
Possible reasons: answer was vague, generic, off-topic, or lacked technical depth.

YOUR TASK: Move to a completely NEW topic from the Job Description.
- Do NOT follow up on the previous answer
- Do NOT reference the previous topic
- Pick a fresh area from the JD that has NOT been covered yet
- Start a new line of questioning
`;
    }

    // ─── Question Directive ─────────────────────────────────────────────────
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
- ${roleCategory === 'mlops'
                ? 'For MLOps roles: ask about model deployment patterns, model monitoring for drift, feature store implementation, CI/CD pipelines for ML, Kubernetes for ML, data versioning, or serving latency optimizations.'
                : isAiRole
                ? 'For AI/ML engineering roles: ask about LLM architecture trade-offs, RAG pipeline design, chunking strategies, embedding models, vector store selection, fine-tuning vs. prompting, evaluation frameworks, hallucination mitigation, latency/cost optimisation, or MLOps practices described in the JD.'
                : isTech
                    ? 'For technical roles: focus on implementation, system design, debugging, performance optimization, or architectural decisions related to the JD.'
                    : 'For non-technical roles: use situational/behavioral questions tied to the JD responsibilities.'}
` + keyPointDirective;
    }

    // ─── Conversation Context ───────────────────────────────────────────────
    const askedQuestions = session.history
        .filter(h => h.role === 'interviewer')
        .map((h, i) => `${i + 1}. ${h.content}`)
        .join('\n');

    const recentMessages = session.history.slice(-4);
    const thread = recentMessages.map(h =>
        `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`
    ).join('\n');

    // ─── Key Points Summary (for AI context) ────────────────────────────────
    let keyPointsSummary = '';
    if (keyPointResult?.keyPoints?.length > 0) {
        const kpList = keyPointResult.keyPoints
            .map(kp => `  - ${kp.point} [${kp.isValid ? 'VALID' : 'INVALID'}: ${kp.reason}]`)
            .join('\n');
        keyPointsSummary = `
=== CANDIDATE'S KEY POINTS FROM LAST ANSWER ===
${kpList}
Decision: ${decision}
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
${keyPointsSummary}
=== QUESTION DIRECTIVE ===
${questionDirective}

=== PREVIOUSLY ASKED QUESTIONS (CRITICAL: DO NOT REPEAT THESE) ===
${askedQuestions}

=== TASK ===
Based on the interview flow above, ask the NEXT interview question (Question ${questionNumber}).
- CRITICAL RULE: DO NOT REPEAT any topics/questions from the "PREVIOUSLY ASKED QUESTIONS" list. Pick a purely new topic from the Job Description.
- Make it flow naturally from the candidate's last answer.
- Match the difficulty to the experience level: ${session.experienceLevel || 'entry-level'}.
- Return ONLY the question. Nothing else. Ensure the question is a short, concise, single complete question ending with a question mark (?). Keep it under 30 words. Do not include any trailing text, explanations, or cut off mid-sentence.
`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER — POST /next-fast (interceptor)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/next-fast', async (req, res, next) => {
    const { sessionId, answerText } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId is required" });

    // ─── Quick session check: pass through for RECRUITER_PROVIDED mode ──────
    let session;
    try {
        session = await loadSession(sessionId);
    } catch (loadErr) {
        console.error("[KP-INTERCEPTOR] Session load error:", loadErr.message);
        return next(); // Fallback to existing handler
    }

    if (!session) {
        return next(); // Let existing handler return the 404
    }

    // Only intercept AI_GENERATED mode — pass through for RECRUITER_PROVIDED
    if (session.questionSource === 'RECRUITER_PROVIDED') {
        console.log(`[KP-INTERCEPTOR] RECRUITER_PROVIDED mode — passing through to existing handler`);
        return next();
    }

    // ─── Concurrency / Double-Request Protection ────────────────────────────
    const inFlightKey = `kp_${sessionId}_next`;
    if (kpInFlightRequests.has(inFlightKey)) {
        console.warn(`[KP-INTERCEPTOR] Concurrent request detected for sessionId: ${sessionId}. Returning 429.`);
        return res.status(429).json({ message: "Request already in progress. Please wait." });
    }
    kpInFlightRequests.add(inFlightKey);

    try {
        const normalizedAnswer = String(answerText || '').trim();

        const interviewers = session.history.filter(h => h.role === 'interviewer');
        const currentQuestionNumber = interviewers.length;
        const currentQuestion = interviewers[interviewers.length - 1]?.content || "";

        // ─── Empty Answer Guard ─────────────────────────────────────────────
        const isEmptyAnswer = normalizedAnswer.length < 5;
        if (isEmptyAnswer) {
            console.warn(`[KP-INTERCEPTOR] Empty/short answer detected for Q${currentQuestionNumber}: "${normalizedAnswer}"`);
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
        ).catch(err => console.error("[KP-BG-EVAL-UNCAUGHT]:", err.message));

        // 3. Strict Target Max Check
        const targetMax = session.totalQuestions || MAX_INTERVIEW_QUESTIONS;
        if (interviewers.length >= targetMax) {
            console.log(`[KP-INTERCEPTOR] Finalizing session for user: ${session.userId} after ${targetMax} questions`);

            const result = await finalizeInterview(session, sessionId);

            return res.json({
                hasNext: false,
                finalScore: result.finalScore,
                ownershipScore: result.ownershipScore,
                feedback: result.feedback
            });
        }

        // ─── 4. KEY POINT EXTRACTION (NEW) ──────────────────────────────────
        let keyPointResult = null;

        if (!isEmptyAnswer) {
            try {
                keyPointResult = await extractAndValidateKeyPoints(
                    currentQuestion,
                    normalizedAnswer,
                    {
                        jobTitle: session.jobTitle,
                        jobDescription: session.jobDescription,
                        jobSkills: session.jobSkills,
                        roleCategory: session.roleInfo?.roleCategory,
                        isTech: session.roleInfo?.isTech
                    }
                );
                console.log(`[KP-INTERCEPTOR] Key point analysis: decision=${keyPointResult?.decision}, target=${keyPointResult?.followUpTarget || 'none'}`);
            } catch (kpErr) {
                console.warn("[KP-INTERCEPTOR] Key point extraction failed, defaulting to SKIP:", kpErr.message);
                keyPointResult = { decision: 'SKIP', keyPoints: [], followUpTarget: null, followUpHint: null };
            }
        } else {
            // Empty answer → skip follow-up
            keyPointResult = { decision: 'SKIP', keyPoints: [], followUpTarget: null, followUpHint: null };
        }

        // ─── 5. Follow-Up Count Guard ───────────────────────────────────────
        // Prevent infinite follow-ups on the same topic
        if (keyPointResult.decision === 'FOLLOW_UP') {
            session._followUpCount = (session._followUpCount || 0) + 1;

            if (session._followUpCount > MAX_FOLLOW_UPS_PER_TOPIC) {
                console.log(`[KP-INTERCEPTOR] Max follow-ups (${MAX_FOLLOW_UPS_PER_TOPIC}) reached, forcing pivot to new topic`);
                keyPointResult.decision = 'SKIP';
                session._followUpCount = 0;
            }
        } else {
            // SKIP resets the follow-up counter (new topic)
            session._followUpCount = 0;
        }

        session._lastKeyPoints = keyPointResult;

        // ─── 6. Generate Next Question (KEY-POINT-AWARE) ────────────────────
        let nextQuestion = "";
        const nextQuestionNumber = interviewers.length + 1;
        const nextPrompt = buildKeyPointAwareQuestionPrompt(session, nextQuestionNumber, keyPointResult);

        nextQuestion = await callInterviewAI(nextPrompt, 1000, false, session.systemPrompt);

        // Strip transition phrases
        if (nextQuestion) {
            const cleaned = cleanQuestionResponse(nextQuestion);
            console.log(`[KP-INTERCEPTOR] Original: "${nextQuestion.substring(0, 80)}..." → Cleaned: "${cleaned.substring(0, 80)}..."`);
            nextQuestion = cleaned;
        }

        // Fallback if AI returned nothing
        if (!nextQuestion) {
            if (session.roleInfo?.roleCategory === 'ai_engineer') {
                nextQuestion = "Can you elaborate on the specific technical trade-offs you considered and how you would evaluate the performance of that approach in a production AI system?";
            } else if (session.roleInfo?.isTech) {
                nextQuestion = "Can you elaborate on the technical implementation details of that approach?";
            } else {
                nextQuestion = "Could you walk me through how you would specifically handle that situation in this role?";
            }
        }

        // 7. Push the new question to history and persist
        session.history.push({ role: 'interviewer', content: nextQuestion });
        session.currentQuestionIndex = session.history.filter(h => h.role === 'interviewer').length;
        await saveSession(sessionId, session);

        // 8. Voice generation (TTS) — Synchronous / Inline
        let audioBase64 = null;
        let audioMimeType = null;
        try {
            const { generateSpeech } = require('../services/tts.service');
            const interviewVoice = session.interviewerVoice || 'professional_interviewer';
            console.log(`[KP-TTS] Generating inline TTS | voice: ${interviewVoice} | chars: ${nextQuestion.length}`);
            const ttsResult = await generateSpeech(nextQuestion, interviewVoice);
            if (ttsResult) {
                audioBase64 = ttsResult.buffer.toString('base64');
                audioMimeType = ttsResult.mimeType;
                console.log(`[KP-TTS] Success generating inline audio: ${ttsResult.buffer.length} bytes`);
            }
        } catch (ttsErr) {
            console.warn(`[KP-TTS] Error generating inline audio:`, ttsErr.message);
        }

        // 9. Return response
        res.json({
            hasNext: true,
            question: nextQuestion,
            audio: audioBase64,
            audioMimeType: audioMimeType,
            currentQuestionNumber: session.history.filter(h => h.role === 'interviewer').length,
            totalQuestions: session.totalQuestions,
            questionSource: session.questionSource,
            isFollowUp: keyPointResult?.decision === 'FOLLOW_UP',
            followUpTarget: keyPointResult?.followUpTarget || undefined,
            emptyAnswerWarning: isEmptyAnswer ? "No answer was detected. Please speak clearly into the microphone." : undefined
        });

    } catch (error) {
        console.error("[KP-INTERCEPTOR] Error:", error);
        res.status(500).json({ success: false, message: "Error fetching next question" });
    } finally {
        kpInFlightRequests.delete(inFlightKey);
    }
});

module.exports = router;
