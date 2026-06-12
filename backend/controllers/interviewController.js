const Application = require('../models/Application');
const mongoose = require('mongoose');
const {
    averageInterviewScore,
    hasLegacyUniformQuestionScores,
    roundToTenth,
    scoreInterviewAnswer
} = require('../utils/interviewScoring');

const MAX_INTERVIEW_QUESTIONS = 5;

const buildRecruiterInterviewPayload = (application, socialUser, questions, overallInterviewScore, overallInterviewMarks) => ({
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
        }))
    }
});

const getInterviewDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        // 🔒 Pro recruiter validation check
        const recruiterId = req.headers['x-user-id'];
        if (!recruiterId) {
            return res.status(403).json({ message: "Forbidden: Pro Recruiter status required." });
        }
        const User = require('../models/User');
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

            application.interviewScore = averageInterviewScore(application.interviewAnswers);
            await application.save();
        }

        const questions = Array.isArray(application.interviewAnswers)
            ? application.interviewAnswers.slice(0, MAX_INTERVIEW_QUESTIONS)
            : [];

        const overallInterviewScore = Number(application.interviewScore || averageInterviewScore(questions) || 0);
        const overallInterviewMarks = roundToTenth(overallInterviewScore / 10);

        res.json(
            buildRecruiterInterviewPayload(
                application,
                socialUser,
                questions,
                overallInterviewScore,
                overallInterviewMarks
            )
        );
    } catch (error) {
        console.error('[GET INTERVIEW DETAILS ERROR]', error);
        res.status(500).json({ message: 'Failed to fetch interview details', error: error.message });
    }
};

module.exports = { getInterviewDetails };
