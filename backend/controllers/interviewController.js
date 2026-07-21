const Application = require('../models/Application');
const mongoose = require('mongoose');
const {
    averageInterviewScore,
    hasLegacyUniformQuestionScores,
    roundToTenth,
    scoreInterviewAnswer
} = require('../utils/interviewScoring');
const { getViolationRating } = require('../utils/proctoringScoring');
const ProctoringReport = require('../models/ProctoringReport');
const { updateProctoringReport } = require('./proctoringControllerEnhanced');

const sanitizeViolationDetail = (type, detail, rating) => {
    if (!detail) return '';
    let cleanDetail = detail
        .replace(/\s*\(ratio:\s*[^)]+\)/gi, '')
        .replace(/\s*\(confidence:\s*[^)]+\)/gi, '');
    
    if (!cleanDetail.endsWith('.')) {
        cleanDetail += '.';
    }
    
    if (!cleanDetail.includes('(Ranking:')) {
        cleanDetail += ` (Ranking: ${rating})`;
    }
    return cleanDetail;
};

const MAX_INTERVIEW_QUESTIONS = 5;

const buildRecruiterInterviewPayload = (application, socialUser, questions, overallInterviewScore, overallInterviewMarks, proctoringViolations, proctoringReport) => ({
    application: {
        id: application._id,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        interviewScore: overallInterviewScore,
        ownershipScore: application.metrics?.ownershipMindset || 0,
        githubUrl: socialUser?.githubUrl || '',
        linkedinUrl: socialUser?.linkedinUrl || '',
        recordingSessionId: application.recordingSessionId,
        recordingStatus: application.recordingStatus,
        recordingPublicId: application.recordingPublicId,
        recordingUrl: application.recordingUrl,
        recordingPlaybackUrl: application.recordingPlaybackUrl
    },
    job: {
        title: application.jobId?.title,
        description: application.jobId?.description,
        skills: application.jobId?.skills
    },
    interview: {
        status: questions.length > 0 ? 'completed' : (application.recordingStatus === 'recording' ? 'in_progress' : 'not_completed'),
        score: questions.length > 0 ? overallInterviewScore : null,
        marks: questions.length > 0 ? overallInterviewMarks : null,
        totalQuestions: questions.length,
        completedAt: application.resultsVisibleAt || application.appliedAt,
        questions: questions.map((answer, idx) => ({
            questionNumber: idx + 1,
            question: answer.question,
            answer: answer.answer,
            score: Number(answer.score || 0),
            marks: typeof answer.marks === 'number'
                ? roundToTenth(answer.marks)
                : roundToTenth(Number(answer.score || 0) / 10),
            feedback: answer.feedback
        })),
        proctoringViolations: proctoringViolations || [],
        proctoringReport: proctoringReport || null
    }
});

const { findRecruiterUser } = require('../utils/userResolver');

const getInterviewDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // 🔒 Pro recruiter validation check
        const recruiterId = req.headers ? req.headers['x-user-id'] : null;
        if (!recruiterId) {
            return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
        }
        const recruiter = await findRecruiterUser(recruiterId);
        if (!recruiter || (recruiter.role !== 'recruiter' && recruiter.role !== 'admin')) {
            return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
        }

        if (recruiter.role === 'recruiter') {
            const Transaction = require('../models/Transaction');
            const paidTransactions = await Transaction.countDocuments({
                userId: recruiter._id,
                status: 'paid',
                type: 'premium_upgrade'
            });

            const shouldBePro = paidTransactions > 0 || recruiter.isPro === true;
            if (recruiter.isPro !== shouldBePro || (shouldBePro && recruiter.hiringPattern !== "Premium Recruiter") || (!shouldBePro && recruiter.hiringPattern === "Premium Recruiter")) {
                recruiter.isPro = shouldBePro;
                recruiter.hiringPattern = shouldBePro ? "Premium Recruiter" : "";
                await recruiter.save();
            }

            const UnlockedApplicant = require('../models/UnlockedApplicant');
            const isUnlocked = await UnlockedApplicant.findOne({ recruiterId: recruiter._id, applicationId });
            const isUnlockedInterview = isUnlocked && Array.isArray(isUnlocked.unlockedItems) && isUnlocked.unlockedItems.includes('interview');

            const isAdmin = recruiter.role === 'admin';
            if (!isAdmin && !isUnlockedInterview) {
                return res.status(403).json({ message: "Forbidden: Interview unlock required." });
            }
        }

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

        const application = await Application.findById(applicationId).populate('jobId').populate('user');
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        let socialUser = application.user;
        if (!socialUser && application.userId) {
            const User = require('../models/User');
            socialUser = await User.findOne({
                $or: [
                    { uid: application.userId },
                    { _id: mongoose.Types.ObjectId.isValid(application.userId) ? application.userId : null },
                    { email: application.applicantEmail }
                ]
            });
        }

        if (hasLegacyUniformQuestionScores(application.interviewAnswers)) {
            application.interviewAnswers = application.interviewAnswers.slice(0, MAX_INTERVIEW_QUESTIONS).map((answer) => {
                const rescored = scoreInterviewAnswer({
                    questionText: answer.question,
                    answerText: answer.answer,
                    jobSkills: application.jobId?.skills || [],
                    jobDescription: application.jobId?.description || ''
                });

                return {
                    question: answer.question,
                    answer: answer.answer,
                    score: rescored.score,
                    marks: rescored.marks,
                    feedback: rescored.feedback
                };
            });

            application.interviewScore = Math.round(averageInterviewScore(application.interviewAnswers) * 0.70);
            await application.save();
        }

        const questions = Array.isArray(application.interviewAnswers)
            ? application.interviewAnswers.slice(0, MAX_INTERVIEW_QUESTIONS)
            : [];

        const overallInterviewScore = Number(application.interviewScore || averageInterviewScore(questions) || 0);
        const overallInterviewMarks = roundToTenth(overallInterviewScore / 10);

        // ── Query Proctoring Violations ──
        const ProctoringViolation = require('../models/ProctoringViolation');
        const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');

        const jobIdStr = application.jobId?._id?.toString() || application.jobId?.toString();
        const sessionIdStr = application.recordingSessionId;

        const queryConditions = [];
        if (jobIdStr && sessionIdStr) {
            queryConditions.push({ examId: `interview:${jobIdStr}:${sessionIdStr}` });
        }
        if (application.userId) {
            queryConditions.push({ userId: application.userId });
        }

        let baseViolations = [];
        let enhancedViolations = [];

        if (queryConditions.length > 0) {
            const query = { $or: queryConditions };
            
            const allBase = await ProctoringViolation.find(query).sort({ timestamp: 1 }).lean();
            const allEnhanced = await ProctoringViolationEnhanced.find(query).sort({ timestamp: 1 }).lean();

            baseViolations = allBase.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });

            enhancedViolations = allEnhanced.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });
        }

        const mappedViolations = [
            ...baseViolations.map(v => {
                const rating = v.rating || getViolationRating(v.type, v.metadata);
                return {
                    id: v._id,
                    type: v.type,
                    detail: sanitizeViolationDetail(v.type, v.detail, rating),
                    count: v.count,
                    severity: 'medium',
                    rating,
                    isAnswering: false,
                    timestamp: v.timestamp || v.createdAt
                };
            }),
            ...enhancedViolations.map(v => {
                const rating = v.rating || getViolationRating(v.type, v.metadata);
                return {
                    id: v._id,
                    type: v.type,
                    detail: sanitizeViolationDetail(v.type, v.detail, rating),
                    count: v.count,
                    severity: v.severity || 'medium',
                    rating,
                    isAnswering: v.isAnswering || false,
                    timestamp: v.timestamp || v.createdAt
                };
            })
        ];

        mappedViolations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // ── Query Proctoring Report ──
        const examIdStr = sessionIdStr && jobIdStr ? `interview:${jobIdStr}:${sessionIdStr}` : '';
        let proctoringReport = null;
        if (examIdStr) {
            proctoringReport = await ProctoringReport.findOne({ examId: examIdStr }).lean();
            if (!proctoringReport && (baseViolations.length > 0 || enhancedViolations.length > 0)) {
                // Compile on-the-fly if violations exist but report doesn't
                try {
                    proctoringReport = await updateProctoringReport(examIdStr, application.userId);
                } catch (reportErr) {
                    console.warn('[INTERVIEW-REPORT-ON-THE-FLY] Generation failed:', reportErr);
                }
            }
        }

        res.json(
            buildRecruiterInterviewPayload(
                application,
                socialUser,
                questions,
                overallInterviewScore,
                overallInterviewMarks,
                mappedViolations,
                proctoringReport
            )
        );
    } catch (error) {
        console.error('[GET INTERVIEW DETAILS ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch interview details', error: error.message });
    }
};

const getPublicInterviewDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

        const application = await Application.findById(applicationId).populate('jobId').populate('user');
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        let socialUser = application.user;
        if (!socialUser && application.userId) {
            const User = require('../models/User');
            socialUser = await User.findOne({
                $or: [
                    { uid: application.userId },
                    { _id: mongoose.Types.ObjectId.isValid(application.userId) ? application.userId : null },
                    { email: application.applicantEmail }
                ]
            });
        }

        if (hasLegacyUniformQuestionScores(application.interviewAnswers)) {
            application.interviewAnswers = application.interviewAnswers.slice(0, MAX_INTERVIEW_QUESTIONS).map((answer) => {
                const rescored = scoreInterviewAnswer({
                    questionText: answer.question,
                    answerText: answer.answer,
                    jobSkills: application.jobId?.skills || [],
                    jobDescription: application.jobId?.description || ''
                });

                return {
                    question: answer.question,
                    answer: answer.answer,
                    score: rescored.score,
                    marks: rescored.marks,
                    feedback: rescored.feedback
                };
            });

            application.interviewScore = Math.round(averageInterviewScore(application.interviewAnswers) * 0.70);
            await application.save();
        }

        const questions = Array.isArray(application.interviewAnswers)
            ? application.interviewAnswers.slice(0, MAX_INTERVIEW_QUESTIONS)
            : [];

        const overallInterviewScore = Number(application.interviewScore || averageInterviewScore(questions) || 0);
        const overallInterviewMarks = roundToTenth(overallInterviewScore / 10);

        // ── Query Proctoring Violations ──
        const ProctoringViolation = require('../models/ProctoringViolation');
        const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');

        const jobIdStr = application.jobId?._id?.toString() || application.jobId?.toString();
        const sessionIdStr = application.recordingSessionId;

        const queryConditions = [];
        if (jobIdStr && sessionIdStr) {
            queryConditions.push({ examId: `interview:${jobIdStr}:${sessionIdStr}` });
        }
        if (application.userId) {
            queryConditions.push({ userId: application.userId });
        }

        let baseViolations = [];
        let enhancedViolations = [];

        if (queryConditions.length > 0) {
            const query = { $or: queryConditions };
            
            const allBase = await ProctoringViolation.find(query).sort({ timestamp: 1 }).lean();
            const allEnhanced = await ProctoringViolationEnhanced.find(query).sort({ timestamp: 1 }).lean();

            baseViolations = allBase.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });

            enhancedViolations = allEnhanced.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });
        }

        const mappedViolations = [
            ...baseViolations.map(v => {
                const rating = v.rating || getViolationRating(v.type, v.metadata);
                return {
                    id: v._id,
                    type: v.type,
                    detail: sanitizeViolationDetail(v.type, v.detail, rating),
                    count: v.count,
                    severity: 'medium',
                    rating,
                    isAnswering: false,
                    timestamp: v.timestamp || v.createdAt
                };
            }),
            ...enhancedViolations.map(v => {
                const rating = v.rating || getViolationRating(v.type, v.metadata);
                return {
                    id: v._id,
                    type: v.type,
                    detail: sanitizeViolationDetail(v.type, v.detail, rating),
                    count: v.count,
                    severity: v.severity || 'medium',
                    rating,
                    isAnswering: v.isAnswering || false,
                    timestamp: v.timestamp || v.createdAt
                };
            })
        ];

        mappedViolations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // ── Query Proctoring Report ──
        const examIdStr = sessionIdStr && jobIdStr ? `interview:${jobIdStr}:${sessionIdStr}` : '';
        let proctoringReport = null;
        if (examIdStr) {
            proctoringReport = await ProctoringReport.findOne({ examId: examIdStr }).lean();
            if (!proctoringReport && (baseViolations.length > 0 || enhancedViolations.length > 0)) {
                try {
                    proctoringReport = await updateProctoringReport(examIdStr, application.userId);
                } catch (reportErr) {
                    console.warn('[INTERVIEW-REPORT-ON-THE-FLY] Generation failed:', reportErr);
                }
            }
        }

        res.json(
            buildRecruiterInterviewPayload(
                application,
                socialUser,
                questions,
                overallInterviewScore,
                overallInterviewMarks,
                mappedViolations,
                proctoringReport
            )
        );
    } catch (error) {
        console.error('[GET PUBLIC INTERVIEW DETAILS ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch public interview details', error: error.message });
    }
};

const getProctoringDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // 🔒 Verify recruiter/admin session
        const recruiterId = req.headers ? req.headers['x-user-id'] : null;
        if (!recruiterId) {
            return res.status(403).json({ message: "Forbidden: Recruiter status required." });
        }
        const recruiter = await findRecruiterUser(recruiterId);
        if (!recruiter || (recruiter.role !== 'recruiter' && recruiter.role !== 'admin')) {
            return res.status(403).json({ message: "Forbidden: Recruiter status required." });
        }

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: 'Invalid application ID' });
        }

        const application = await Application.findById(applicationId).populate('jobId');
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        // ── Query Proctoring Violations ──
        const ProctoringViolation = require('../models/ProctoringViolation');
        const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');

        const jobIdStr = application.jobId?._id?.toString() || application.jobId?.toString();
        const sessionIdStr = application.recordingSessionId;

        const queryConditions = [];
        if (jobIdStr && sessionIdStr) {
            queryConditions.push({ examId: `interview:${jobIdStr}:${sessionIdStr}` });
        }
        if (application.userId) {
            queryConditions.push({ userId: application.userId });
        }

        let baseViolations = [];
        let enhancedViolations = [];

        if (queryConditions.length > 0) {
            const query = { $or: queryConditions };
            
            const allBase = await ProctoringViolation.find(query).sort({ timestamp: 1 }).lean();
            const allEnhanced = await ProctoringViolationEnhanced.find(query).sort({ timestamp: 1 }).lean();

            baseViolations = allBase.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });

            enhancedViolations = allEnhanced.filter(v => {
                if (sessionIdStr && v.examId.includes(sessionIdStr)) return true;
                if (jobIdStr && v.examId.includes(jobIdStr)) return true;
                return false;
            });
        }

        const mappedViolations = [
            ...baseViolations.map(v => {
                const rating = v.rating || getViolationRating(v.type, v.metadata);
                return {
                    id: v._id,
                    type: v.type,
                    detail: sanitizeViolationDetail(v.type, v.detail, rating),
                    count: v.count,
                    severity: 'medium',
                    rating,
                    isAnswering: false,
                    timestamp: v.timestamp || v.createdAt
                };
            }),
            ...enhancedViolations.map(v => {
                const rating = v.rating || getViolationRating(v.type, v.metadata);
                return {
                    id: v._id,
                    type: v.type,
                    detail: sanitizeViolationDetail(v.type, v.detail, rating),
                    count: v.count,
                    severity: v.severity || 'medium',
                    rating,
                    isAnswering: v.isAnswering || false,
                    timestamp: v.timestamp || v.createdAt
                };
            })
        ];

        mappedViolations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // ── Query Proctoring Report ──
        const examIdStr = sessionIdStr && jobIdStr ? `interview:${jobIdStr}:${sessionIdStr}` : '';
        let proctoringReport = null;
        if (examIdStr) {
            proctoringReport = await ProctoringReport.findOne({ examId: examIdStr }).lean();
            if (!proctoringReport && (baseViolations.length > 0 || enhancedViolations.length > 0)) {
                try {
                    proctoringReport = await updateProctoringReport(examIdStr, application.userId);
                } catch (reportErr) {
                    console.warn('[INTERVIEW-REPORT-ON-THE-FLY] Generation failed:', reportErr);
                }
            }
        }

        res.json({
            application: {
                id: application._id,
                applicantName: application.applicantName,
                applicantEmail: application.applicantEmail,
                proctoringScore: application.proctoringScore
            },
            job: {
                title: application.jobId?.title
            },
            interview: {
                status: application.recordingStatus === 'uploaded' ? 'completed' : 'not_completed',
                completedAt: application.resultsVisibleAt || application.appliedAt,
                proctoringViolations: mappedViolations,
                proctoringReport: proctoringReport
            }
        });
    } catch (error) {
        console.error('[GET PROCTORING DETAILS ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch proctoring details', error: error.message });
    }
};

module.exports = { getInterviewDetails, getPublicInterviewDetails, getProctoringDetails };
