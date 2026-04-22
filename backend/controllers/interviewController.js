const Application = require('../models/Application');
const Job = require('../models/Job');
const mongoose = require('mongoose');
const {
    averageInterviewScore,
    hasLegacyUniformQuestionScores,
    roundToTenth,
    scoreInterviewAnswer
} = require('../utils/interviewScoring');

/* ===========================
   GET INTERVIEW DETAILS (RECRUITER)
   =========================== */
const getInterviewDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: "Invalid application ID" });
        }

        const application = await Application.findById(applicationId).populate('jobId').populate('user');
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        // ─── ROBUST SOCIAL LINK RETRIEVAL ───
        // Fallback for legacy applications where userId format might not match the virtual join
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
        // ────────────────────────────────────

        if (!application.interviewAnswers || application.interviewAnswers.length === 0) {
            return res.status(404).json({ message: "No interview answers found for this application" });
        }

        if (hasLegacyUniformQuestionScores(application.interviewAnswers)) {
            application.interviewAnswers = application.interviewAnswers.map((ans) => {
                const rescored = scoreInterviewAnswer({
                    questionText: ans.question,
                    answerText: ans.answer,
                    jobSkills: application.jobId?.skills || [],
                    jobDescription: application.jobId?.description || ''
                });

                return {
                    question: ans.question,
                    answer: ans.answer,
                    score: rescored.score,
                    marks: rescored.marks,
                    feedback: rescored.feedback
                };
            });

            application.interviewScore = averageInterviewScore(application.interviewAnswers);
            await application.save();
        }

        const overallInterviewScore = Number(application.interviewScore || averageInterviewScore(application.interviewAnswers) || 0);
        const overallInterviewMarks = roundToTenth(overallInterviewScore / 10);

        res.json({
            application: {
                id: application._id,
                applicantName: application.applicantName,
                applicantEmail: application.applicantEmail,
                interviewScore: overallInterviewScore,
                // ─── OWNERSHIP V VETTING SCORE ───
                // Calculates the candidate's alignment with ownership mindset based on interview responses
                ownershipScore: application.metrics?.ownershipMindset || 0,
                // ─── SOCIAL INTEGRATIONS ───
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
                score: overallInterviewScore,
                marks: overallInterviewMarks,
                totalQuestions: application.interviewAnswers.length,
                completedAt: application.appliedAt,
                questions: application.interviewAnswers.map((ans, idx) => ({
                    questionNumber: idx + 1,
                    question: ans.question,
                    answer: ans.answer,
                    score: Number(ans.score || 0),
                    marks: typeof ans.marks === 'number'
                        ? roundToTenth(ans.marks)
                        : roundToTenth(Number(ans.score || 0) / 10),
                    feedback: ans.feedback
                }))
            }
        });
    } catch (error) {
        console.error("[GET INTERVIEW DETAILS ERROR]", error);
        res.status(500).json({ message: "Failed to fetch interview details", error: error.message });
    }
};

module.exports = { getInterviewDetails };
