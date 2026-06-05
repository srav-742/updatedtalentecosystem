const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const QuestionLog = require('../models/QuestionLog');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { callSkillAI } = require('../utils/aiClients');
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
        // Removed unnecessary ResumeProfile check. Application record is the source of truth.
        const application = await Application.findOne({ jobId: new mongoose.Types.ObjectId(jobId), userId });

        // Only enforce resume match if resume analysis is enabled
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
        // 🧠 Groq Prompt
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
        let parsed;
        try {
            let cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
            }
            parsed = JSON.parse(cleanedResponse);
        } catch (e) {
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
        const { jobId, userId, sessionId, questions, answers } = req.body;

        if (!jobId || !userId || !sessionId || !Array.isArray(questions) || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let correctCount = 0;
        const processedAnswers = answers.map((ans, idx) => {
            const question = questions[idx];
            let isCorrect = false;
            let score = 0;

            if (question.type === 'mcq') {
                const correctOption = question.options[question.correctAnswer];
                isCorrect = ans.userAnswer === correctOption;
                score = isCorrect ? 1 : 0;
                if (isCorrect) correctCount++;
            } else if (question.type === 'coding') {
                if (ans.userAnswer && ans.userAnswer.trim().length > 20) {
                    isCorrect = true;
                    score = 1;
                    correctCount++;
                }
            }

            return {
                questionId: question._id || null,
                question: question.question,
                questionType: question.type,
                skill: question.skill || 'General',
                userAnswer: ans.userAnswer,
                correctAnswer: question.type === 'mcq' ? question.options[question.correctAnswer] : question.starterCode,
                isCorrect,
                score
            };
        });

        const finalScore = Math.round((correctCount / questions.length) * 20);

        const submission = await AssessmentSubmission.create({
            jobId,
            userId,
            sessionId,
            questions,
            answers: processedAnswers,
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            score: finalScore
        });

        console.log(`[ASSESSMENT] ✅ Submission saved for user ${userId} - Score: ${finalScore}%`);

        // Update/Upsert the Application document
        let resolvedName;
        let resolvedEmail;
        let resolvedPic;
        const seeker = await User.findOne({ uid: userId });
        if (seeker) {
            resolvedName = seeker.name;
            resolvedEmail = seeker.email;
            resolvedPic = seeker.profilePic;
        }

        const appQuery = { jobId: new mongoose.Types.ObjectId(jobId), userId };
        const existingApp = await Application.findOne(appQuery);

        const appUpdate = {
            assessmentScore: finalScore,
            assessmentSubmissionId: submission._id,
            assessmentAnswers: processedAnswers
        };

        if (!existingApp) {
            if (resolvedName) appUpdate.applicantName = resolvedName;
            if (resolvedEmail) appUpdate.applicantEmail = resolvedEmail;
            if (resolvedPic) appUpdate.applicantPic = resolvedPic;
        } else {
            if (!existingApp.applicantName && resolvedName) appUpdate.applicantName = resolvedName;
            if (!existingApp.applicantEmail && resolvedEmail) appUpdate.applicantEmail = resolvedEmail;
            if (!existingApp.applicantPic && resolvedPic) appUpdate.applicantPic = resolvedPic;
        }

        const application = await Application.findOneAndUpdate(
            appQuery,
            { $set: appUpdate },
            { new: true, upsert: true }
        ).populate('jobId');

        // Recalculate Application final score
        const r = application.resumeMatchPercent || 0;
        const a = application.assessmentScore || 0;
        const i = application.interviewScore || 0;
        application.finalScore = r + a + i;

        // Ensure all enabled modules are fully completed before shortlisting
        const job = application.jobId;
        const isResumeDone = !job || job.resumeAnalysis?.enabled === false || (application.resumeMatchPercent !== null && application.resumeMatchPercent !== undefined);
        const isAssessmentDone = !job || !job.assessment?.enabled || (application.assessmentScore !== null && application.assessmentScore !== undefined);
        const isInterviewDone = !job || !job.mockInterview?.enabled || (application.interviewScore !== null && application.interviewScore !== undefined);

        if (isResumeDone && isAssessmentDone && isInterviewDone && application.finalScore >= 55) {
            application.status = 'SHORTLISTED';
        }
        await application.save();

        res.json({
            success: true,
            submissionId: submission._id,
            score: finalScore,
            totalQuestions: questions.length,
            correctAnswers: correctCount
        });
    } catch (error) {
        console.error("[SUBMIT ASSESSMENT ERROR]", error);
        res.status(500).json({ message: "Failed to submit assessment", error: error.message });
    }
};

/* ===========================
   GET ASSESSMENT DETAILS (RECRUITER)
   =========================== */
const getAssessmentDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // 🔒 Pro recruiter validation check
        const recruiterId = req.headers['x-user-id'];
        if (!recruiterId) {
            return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
        }
        const recruiter = await User.findOne({ uid: recruiterId });
        if (!recruiter || (recruiter.role !== 'recruiter' && recruiter.role !== 'admin')) {
            return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
        }

        if (recruiter.role === 'recruiter') {
            const Transaction = require('../models/Transaction');
            const paidTransactions = await Transaction.countDocuments({
                userId: recruiter._id,
                status: 'paid'
            });

            const shouldBePro = paidTransactions > 0;
            if (recruiter.isPro !== shouldBePro || (shouldBePro && recruiter.hiringPattern !== "Premium Recruiter") || (!shouldBePro && recruiter.hiringPattern === "Premium Recruiter")) {
                recruiter.isPro = shouldBePro;
                recruiter.hiringPattern = shouldBePro ? "Premium Recruiter" : "";
                await recruiter.save();
            }

            if (!shouldBePro) {
                return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
            }
        }

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: "Invalid application ID" });
        }

        const application = await Application.findById(applicationId).populate('jobId');
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const submission = await AssessmentSubmission.findOne({
            jobId: application.jobId._id,
            userId: application.userId
        }).sort({ submittedAt: -1 });

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
                questions: submission.questions.map((q, idx) => ({
                    ...q.toObject(),
                    userAnswer: submission.answers[idx]?.userAnswer,
                    isCorrect: submission.answers[idx]?.isCorrect,
                    answerScore: submission.answers[idx]?.score
                }))
            }
        });
    } catch (error) {
        console.error("[GET ASSESSMENT DETAILS ERROR]", error);
        res.status(500).json({ message: "Failed to fetch assessment details", error: error.message });
    }
};

module.exports = { generateFullAssessment, submitAssessment, getAssessmentDetails };
