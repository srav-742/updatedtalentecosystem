const Application = require('../models/Application');
const Job = require('../models/Job');
const mongoose = require('mongoose');

/* ===========================
   GET INTERVIEW DETAILS (RECRUITER)
   =========================== */
const getInterviewDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: "Invalid application ID" });
        }

        const application = await Application.findById(applicationId).populate('jobId');
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        if (!application.interviewAnswers || application.interviewAnswers.length === 0) {
            return res.status(404).json({ message: "No interview answers found for this application" });
        }

        res.json({
            application: {
                id: application._id,
                applicantName: application.applicantName,
                applicantEmail: application.applicantEmail,
                interviewScore: application.interviewScore
            },
            job: {
                title: application.jobId?.title,
                description: application.jobId?.description,
                skills: application.jobId?.skills
            },
            interview: {
                score: application.interviewScore,
                totalQuestions: application.interviewAnswers.length,
                completedAt: application.appliedAt,
                questions: application.interviewAnswers.map((ans, idx) => ({
                    questionNumber: idx + 1,
                    question: ans.question,
                    answer: ans.answer,
                    score: ans.score,
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
