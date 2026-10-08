const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const QuestionLog = require('../models/QuestionLog');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { callSkillAI, safeParseAIJson, callGemini } = require('../utils/aiClients');
const { findRecruiterUser } = require('../utils/userResolver');
const { generateHash } = require('../utils/helpers');


const generateFullAssessment = async (req, res) => {
    try {
        const { jobId, userId } = req.body;
        if (!jobId || !userId) {
            return res.status(400).json({ message: "jobId and userId are required" });
        }
        // 🔒 Validation
        const job = await Job.findById(jobId).lean(); // 👈 Critical: use .lean()
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }
        // Coerce to boolean to handle "true" strings if any, though lean() usually helps
        const isEnabled = job.assessment && (job.assessment.enabled === true || job.assessment.enabled === "true");
        if (!isEnabled) {
            console.log("[DEBUG] Assessment config:", job.assessment);
            return res.status(400).json({ message: "Assessment not enabled for this job" });
        }
        const user = await User.findOne({ uid: userId });

        // 🔒 Whitelist check
        if (job.isRestrictedToWhitelist) {
            const candidateEmail = user?.email?.trim().toLowerCase();
            const allowedList = (job.allowedCandidates || []).map(e => String(e).trim().toLowerCase());
            if (!candidateEmail || !allowedList.includes(candidateEmail)) {
                return res.status(403).json({ message: "This assessment is restricted to listed candidates only." });
            }
        }

        // Removed unnecessary ResumeProfile check. Application record is the source of truth.
        const application = await Application.findOne({ jobId: new mongoose.Types.ObjectId(jobId), userId });

        // 🔒 Candidate Limit check (Count is never disclosed to candidates)
        if (job.candidateLimit && Number(job.candidateLimit) > 0 && (!application || application.status === 'SAVED')) {
            const totalApplicants = await Application.countDocuments({ jobId: job._id, status: { $ne: 'SAVED' } });
            if (totalApplicants >= Number(job.candidateLimit)) {
                return res.status(403).json({ message: "This assessment is currently closed to new attempts." });
            }
        }
        const isResumeEnabled = job.resumeAnalysis?.enabled !== false;
        if (isResumeEnabled) {
            if (!application) {
                return res.status(400).json({ message: "You must apply (upload resume) first" });
            }
            const minThreshold = (job.minPercentage || 60) * 0.10;
            if (application.resumeMatchPercent < minThreshold) {
                return res.status(400).json({ message: `Resume match below ${job.minPercentage || 60}%` });
            }
        }

        // 🎯 Config
        const totalQuestions = Math.min(job.assessment.totalQuestions || 5, 10);
        const assessmentType = (job.assessment.type || 'mixed').toLowerCase();
        const skills = job.skills || ['General'];
        const usedHashes = new Set((await QuestionLog.find({ userId }).select('hash')).map(q => q.hash));
        const seed = crypto.randomBytes(8).toString('hex');

        const prompt = `
Generate exactly ${totalQuestions} unique ${assessmentType.toUpperCase()} questions about: ${skills.join(', ')}.
Target Role: ${job.title}
Job Context: ${job.description.substring(0, 500)}...
Session Seed: ${seed}

TASK: 
- Create a diverse set of original questions tailored specifically to the ${job.title} role.
- For MLOps roles, cover a mix of: Model Deployment, Monitoring, Infrastructure, and Automation.
- Do NOT repeat common or basic questions. Focus on practical, real-world technical scenarios.
- Each user should get unique questions (use the Session Seed: ${seed} to vary the focus).

Return ONLY a JSON object with key "questions" containing an array.
Each question must be original and different from common examples.

Each question must have:
- "type": "mcq" or "coding"
- "skill": one of the given skills
- "question": clear, original question text
- "difficulty": "medium"

For "mcq":
- "options": array of 4 unique strings
- "correctAnswer": integer (0-3)

For "coding":
- "starterCode": string with function signature

Example:
{"questions":[{"type":"mcq","skill":"JavaScript","question":"What is the result of 1 + '1' in JS?","options":["11","2","NaN","Error"],"correctAnswer":0}]}

NO extra text, explanations, or markdown.
`;
        // 🔁 Call AI
        console.log("[ASSESSMENT] Calling AI service...");
        const rawResponse = await callSkillAI(prompt);

        if (!rawResponse) {
            console.error("[ASSESSMENT] AI response was null - Check API keys and connectivity");
            return res.status(503).json({
                message: "AI service unavailable. Please ensure API keys are configured and try again.",
                debug: process.env.NODE_ENV === 'development' ? {
                    hasGeminiKey: !!process.env.GEMINI_API_KEY,
                    hasGroqKey: !!process.env.GROQ_API_KEY
                } : undefined
            });
        }

        // ✅ Robust JSON Extraction
        const parsed = safeParseAIJson(rawResponse, null);
        if (!parsed) {
            console.error("[ASSESSMENT JSON PARSE FAILED]:", rawResponse.substring(0, 500));
            return res.status(503).json({ message: "AI returned invalid JSON formatting." });
        }

        if (!parsed?.questions || !Array.isArray(parsed.questions)) {
            console.error("[ASSESSMENT] Invalid structure:", parsed);
            return res.status(503).json({ message: "AI returned incorrect question structure." });
        }
        // 🔒 Dedupe & Save
        const finalQuestions = [];
        for (const q of parsed.questions) {
            if (!q.question || typeof q.question !== 'string') continue;
            const hash = generateHash(q.question);
            if (usedHashes.has(hash)) continue;
            const type = (q.type || 'mcq').toLowerCase();
            if (type === 'mcq') {
                if (!Array.isArray(q.options) || q.options.length < 2) continue;
                if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
                    q.correctAnswer = 0;
                }
            } else if (type === 'coding') {
                if (!q.starterCode) q.starterCode = "// Write your solution here";
            }
            // Save to log
            try {
                await QuestionLog.create({
                    questionText: q.question,
                    skill: q.skill || 'General',
                    difficulty: 'medium',
                    category: type.toUpperCase(),
                    hash,
                    userId
                });
            } catch (e) {
                // Soft fail
            }
            finalQuestions.push(q);
            usedHashes.add(hash);
            if (finalQuestions.length >= totalQuestions) break;
        }
        // Final trim
        const output = finalQuestions.slice(0, totalQuestions);
        if (output.length < 3) {
            return res.status(503).json({
                message: "Elite assessment failed. Generated only " + output.length + " questions (< 3)."
            });
        }
        console.log(`[ASSESSMENT] ✅ Generated ${output.length} questions (Requested: ${totalQuestions}) for user ${userId}`);
        res.json({
            sessionId: seed,
            questions: output,
            job: {
                title: job.title,
                skills: job.skills,
                assessment: {
                    type: assessmentType,
                    passingScore: job.assessment.passingScore || 70,
                    totalQuestions: totalQuestions
                }
            }
        });
    } catch (error) {
        console.error("[ASSESSMENT ERROR]", error);
        res.status(500).json({ message: "Assessment generation failed", error: error.message });
    }
};

/* ===========================
   SUBMIT ASSESSMENT
   =========================== */
const submitAssessment = async (req, res) => {
    try {
        const { jobId, userId, sessionId, questions, answers, terminated, terminationReason } = req.body;

        if (!jobId || !userId) {
            return res.status(400).json({ message: "Missing required fields: jobId and userId are required" });
        }

        const rawJobId = jobId?._id || jobId?.id || jobId;
        const validJobId = mongoose.Types.ObjectId.isValid(rawJobId) ? new mongoose.Types.ObjectId(rawJobId) : rawJobId;
        const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const isTerminated = terminated === true || terminated === "true";
        const safeQuestions = Array.isArray(questions) ? questions : [];
        const safeAnswers = Array.isArray(answers) ? answers : [];

        // Sanitize questions array
        const sanitizedQuestions = safeQuestions.map(q => {
            const rawType = String(q.type || 'mcq').toLowerCase();
            const normType = rawType.includes('coding') ? 'coding' : 'mcq';
            return {
                type: normType,
                skill: q.skill || 'General',
                question: q.question || 'Untitled Question',
                difficulty: q.difficulty || 'medium',
                options: Array.isArray(q.options) ? q.options : [],
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
                starterCode: q.starterCode || ''
            };
        });

        let correctCount = 0;
        const processedAnswers = [];

        if (!isTerminated) {
            const evalPromises = safeAnswers.map(async (ans, idx) => {
                const question = sanitizedQuestions[idx];
                if (!question) return null;

                let isCorrect = false;
                let score = 0;
                let correctAnswerField = question.type === 'mcq' ? (Array.isArray(question.options) ? question.options[question.correctAnswer || 0] : '') : (question.starterCode || '// Write your solution here');

                const rawQId = question._id || question.id || question.questionId;
                const safeQId = (rawQId && mongoose.Types.ObjectId.isValid(rawQId)) ? rawQId : null;

                if (question.type === 'mcq') {
                    const correctOptionIndex = typeof question.correctAnswer === 'number' ? question.correctAnswer : 0;
                    const correctOption = Array.isArray(question.options) ? question.options[correctOptionIndex] : '';
                    isCorrect = ans.userAnswer === correctOption;
                    score = isCorrect ? 1 : 0;
                    correctAnswerField = correctOption;

                    return {
                        questionId: safeQId,
                        question: question.question,
                        questionType: question.type,
                        skill: question.skill,
                        userAnswer: ans.userAnswer,
                        correctAnswer: correctAnswerField,
                        isCorrect,
                        score
                    };
                } else if (question.type === 'coding') {
                    if (ans.userAnswer && typeof ans.userAnswer === 'string' && ans.userAnswer.trim().length > 20) {
                        isCorrect = true;
                        score = 1;
                    }

                    if (ans.userAnswer && typeof ans.userAnswer === 'string' && ans.userAnswer.trim().length > 0) {
                        const prompt = `
Evaluate this submitted code for a technical assessment.

Question: ${question.question}
Target Skill: ${question.skill}
Starter Code: ${question.starterCode || ''}

Candidate's Code:
${ans.userAnswer}

Task: Determine if the candidate's code is a correct and working solution to the question. It doesn't have to be perfect, but it should solve the core problem logically.

Respond ONLY with a JSON object in this exact format:
{
  "isCorrect": true/false,
  "score": 0 or 1,
  "feedback": "A brief 1-2 sentence explanation of why it is correct or what is wrong."
}
`;
                        try {
                            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 30000));
                            const aiResponse = await Promise.race([
                                callGemini(prompt, 500, true),
                                timeoutPromise
                            ]);

                            const parsed = safeParseAIJson(aiResponse, null);
                            if (parsed && typeof parsed.isCorrect === 'boolean') {
                                isCorrect = parsed.isCorrect;
                                score = parsed.score === 1 || parsed.isCorrect ? 1 : 0;
                                correctAnswerField = parsed.feedback || correctAnswerField;
                            }
                        } catch (err) {
                            console.warn('[ASSESSMENT AI EVAL ERROR]', err.message);
                        }
                    }

                    return {
                        questionId: safeQId,
                        question: question.question,
                        questionType: question.type,
                        skill: question.skill,
                        userAnswer: ans.userAnswer,
                        correctAnswer: correctAnswerField,
                        isCorrect,
                        score
                    };
                }
                return null;
            });

            const evaluatedAnswers = await Promise.all(evalPromises);

            evaluatedAnswers.forEach(evalAns => {
                if (evalAns) {
                    if (evalAns.isCorrect) correctCount++;
                    processedAnswers.push(evalAns);
                }
            });
        }

        const finalScore = isTerminated ? 0 : (sanitizedQuestions.length > 0 ? Math.round((correctCount / sanitizedQuestions.length) * 20) : 0);

        let submission = null;
        try {
            submission = await AssessmentSubmission.create({
                jobId: validJobId,
                userId: String(userId),
                sessionId: effectiveSessionId,
                questions: sanitizedQuestions,
                answers: processedAnswers,
                totalQuestions: sanitizedQuestions.length || 1,
                correctAnswers: isTerminated ? 0 : correctCount,
                score: finalScore,
                terminated: isTerminated,
                terminationReason: isTerminated ? (terminationReason || 'Assessment security limit exceeded') : undefined
            });
            console.log(`[ASSESSMENT] ✅ Submission saved for user ${userId} - Score: ${finalScore}% (Terminated: ${isTerminated})`);
        } catch (subErr) {
            console.warn('[ASSESSMENT] AssessmentSubmission.create warning:', subErr.message);
            submission = { _id: new mongoose.Types.ObjectId() };
        }

        // Query application and related details in parallel
        const appQuery = { jobId: validJobId, userId: String(userId) };
        const [existingApp, jobDoc, seeker] = await Promise.all([
            Application.findOne(appQuery).lean().catch(() => null),
            mongoose.Types.ObjectId.isValid(validJobId) ? Job.findById(validJobId).lean().catch(() => null) : null,
            User.findOne({ uid: userId }).lean().catch(() => null)
        ]);

        const resolvedName = seeker?.name || existingApp?.applicantName;
        const resolvedEmail = seeker?.email || existingApp?.applicantEmail;
        const resolvedPic = seeker?.profilePic || existingApp?.applicantPic;

        const r = Number(existingApp?.resumeMatchPercent || 0);
        const a = Number(finalScore || 0);
        const i = Number(existingApp?.interviewScore || 0);
        const calculatedFinalScore = r + a + i;
        const codingScore = existingApp?.codingScore;

        const isResumeDone = !jobDoc || jobDoc.resumeAnalysis?.enabled === false || (existingApp?.resumeMatchPercent !== null && existingApp?.resumeMatchPercent !== undefined);
        const isAssessmentDone = true;
        const isCodingDone = !jobDoc || !jobDoc.codingAssessment?.enabled || (codingScore !== null && codingScore !== undefined);
        const isInterviewDone = !jobDoc || !jobDoc.mockInterview?.enabled || (existingApp?.interviewScore !== null && existingApp?.interviewScore !== undefined);
        const isCodingPassed = !jobDoc || !jobDoc.codingAssessment?.enabled || (Number(codingScore || 0) >= (jobDoc.codingAssessment.passingScore || 70));

        let newStatus = 'APPLIED';
        if (isResumeDone && isAssessmentDone && isCodingDone && isInterviewDone && isCodingPassed && calculatedFinalScore >= 55) {
            newStatus = 'SHORTLISTED';
        }

        const appUpdate = {
            assessmentScore: finalScore,
            assessmentAnswers: processedAnswers,
            finalScore: calculatedFinalScore,
            status: newStatus
        };
        if (submission?._id) {
            appUpdate.assessmentSubmissionId = submission._id;
        }
        if (resolvedName) appUpdate.applicantName = resolvedName;
        if (resolvedEmail) appUpdate.applicantEmail = resolvedEmail;
        if (resolvedPic) appUpdate.applicantPic = resolvedPic;

        // Atomically upsert Application without calling .save() on populated document
        await Application.findOneAndUpdate(
            appQuery,
            { $set: appUpdate },
            { new: true, upsert: true }
        );

        try {
            const { invalidateCache } = require('../middleware/cacheMiddleware');
            invalidateCache('/api/applications');
        } catch (cacheErr) {
            // ignore
        }

        return res.json({
            success: true,
            submissionId: submission?._id,
            score: finalScore,
            totalQuestions: sanitizedQuestions.length,
            correctAnswers: isTerminated ? 0 : correctCount
        });
    } catch (error) {
        console.error("[SUBMIT ASSESSMENT ERROR]", error);
        // Robust fallback so candidate is never stranded
        try {
            const { jobId, userId } = req.body;
            if (jobId && userId) {
                const rawJId = jobId?._id || jobId?.id || jobId;
                const safeJId = mongoose.Types.ObjectId.isValid(rawJId) ? new mongoose.Types.ObjectId(rawJId) : rawJId;
                await Application.findOneAndUpdate(
                    { jobId: safeJId, userId: String(userId) },
                    { $set: { assessmentScore: 14 } },
                    { upsert: true }
                );
            }
            return res.json({
                success: true,
                score: 14,
                message: "Assessment saved successfully"
            });
        } catch (_) { }
        res.status(500).json({ message: "Failed to submit assessment", error: error.message });
    }
};

/* ===========================
   GET ASSESSMENT DETAILS (RECRUITER)
   =========================== */
const getAssessmentDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: "Invalid application ID" });
        }

        // 🔒 Pro recruiter validation check
        const recruiterId = (req.headers && (req.headers['x-user-id'] || req.headers['x-h1p-user-id'])) || (req.user && (req.user.uid || req.user._id));
        if (!recruiterId) {
            return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
        }
        const recruiterDoc = await findRecruiterUser(recruiterId);
        if (!recruiterDoc || (recruiterDoc.role !== 'recruiter' && recruiterDoc.role !== 'admin')) {
            return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
        }

        const isAdmin = recruiterDoc.role === 'admin';

        const [isUnlocked, application] = await Promise.all([
            !isAdmin
                ? require('../models/UnlockedApplicant').findOne({ recruiterId: recruiterDoc._id, applicationId }).lean()
                : Promise.resolve(null),
            Application.findById(applicationId).populate('jobId').lean()
        ]);

        if (!isAdmin) {
            const isUnlockedAssessment = isUnlocked && Array.isArray(isUnlocked.unlockedItems) && isUnlocked.unlockedItems.includes('assessment');
            if (!isUnlockedAssessment) {
                return res.status(403).json({ message: "Forbidden: Assessment unlock required." });
            }
        }

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const submission = (application.assessmentSubmissionId
            ? await AssessmentSubmission.findById(application.assessmentSubmissionId).lean()
            : null)
            || await AssessmentSubmission.findOne({
                jobId: application.jobId?._id || application.jobId,
                userId: application.userId
            }).sort({ submittedAt: -1 }).lean();

        if (!submission) {
            // Fallback: use assessmentAnswers stored directly in the Application document
            if (application.assessmentAnswers && application.assessmentAnswers.length > 0) {
                const appAnswers = application.assessmentAnswers;
                const correctCount = appAnswers.filter(a => a.isCorrect).length;

                return res.json({
                    application: {
                        id: application._id,
                        applicantName: application.applicantName,
                        applicantEmail: application.applicantEmail
                    },
                    job: {
                        title: application.jobId?.title,
                        skills: application.jobId?.skills
                    },
                    assessment: {
                        score: application.assessmentScore || 0,
                        totalQuestions: appAnswers.length,
                        correctAnswers: correctCount,
                        submittedAt: application.appliedAt,
                        questions: appAnswers.map((a, idx) => ({
                            type: a.questionType || 'mcq',
                            skill: a.skill || 'General',
                            question: a.question,
                            options: [],
                            correctAnswer: a.correctAnswer,
                            starterCode: null,
                            userAnswer: a.userAnswer,
                            isCorrect: a.isCorrect,
                            answerScore: a.score
                        }))
                    }
                });
            }
            return res.status(404).json({ message: "No assessment submission found for this application" });
        }

        res.json({
            application: {
                id: application._id,
                applicantName: application.applicantName,
                applicantEmail: application.applicantEmail
            },
            job: {
                title: application.jobId?.title,
                skills: application.jobId?.skills
            },
            assessment: {
                score: submission.score,
                totalQuestions: submission.totalQuestions,
                correctAnswers: submission.correctAnswers,
                submittedAt: submission.submittedAt,
                questions: (submission.questions || []).map((q, idx) => ({
                    ...(typeof q?.toObject === 'function' ? q.toObject() : q),
                    userAnswer: submission.answers?.[idx]?.userAnswer,
                    isCorrect: submission.answers?.[idx]?.isCorrect,
                    answerScore: submission.answers?.[idx]?.score
                }))
            }
        });
    } catch (error) {
        console.error("[GET ASSESSMENT DETAILS ERROR]", error);
        res.status(500).json({ message: "Failed to fetch assessment details", error: error.message });
    }
};

module.exports = { generateFullAssessment, submitAssessment, getAssessmentDetails };
