const Application = require('../models/Application');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const User = require('../models/User');
const mongoose = require('mongoose');
const { updateRecruiterPattern } = require('./teamFitController');


const submitApplication = async (req, res) => {
    try {
        const { jobId, userId, applicantName, applicantEmail, applicantPic, assessmentSubmissionId, ...updateData } = req.body;
        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid or Missing Job ID" });
        }
        const query = { jobId: new mongoose.Types.ObjectId(jobId), userId: userId };

        // Resolve seeker details from User model if not explicitly provided
        let resolvedName = applicantName;
        let resolvedEmail = applicantEmail;
        let resolvedPic = applicantPic;

        if (!resolvedName || !resolvedEmail) {
            const seeker = await User.findOne({ uid: userId });
            if (seeker) {
                if (!resolvedName) resolvedName = seeker.name;
                if (!resolvedEmail) resolvedEmail = seeker.email;
                if (!resolvedPic) resolvedPic = seeker.profilePic;
            }
        }

        const update = {
            ...updateData,
            ...query
        };

        if (resolvedName !== undefined) update.applicantName = resolvedName;
        if (resolvedEmail !== undefined) update.applicantEmail = resolvedEmail;
        if (resolvedPic !== undefined) update.applicantPic = resolvedPic;

        if (!updateData.interviewAnswers || updateData.interviewAnswers.length === 0) {
            delete update.interviewAnswers;
        }
        if (assessmentSubmissionId) {
            update.assessmentSubmissionId = assessmentSubmissionId;
        }
        const application = await Application.findOneAndUpdate(query, update, { new: true, upsert: true }).populate('jobId');

        // Transition from SAVED to APPLIED if user is now submitting application details
        if (application.status === 'SAVED' && req.body.status !== 'SAVED') {
            application.status = 'APPLIED';
        }

        // Calculate Final Score dynamically based on Job settings
        const r = application.resumeMatchPercent || 0;
        const a = application.assessmentScore || 0;
        const i = application.interviewScore || 0;

        let totalScore = 0;
        let numModules = 0;
        const job = application.jobId;

        if (job) {
            if (job.resumeAnalysis && job.resumeAnalysis.enabled) {
                totalScore += r;
                numModules++;
            }
            if (job.assessment && job.assessment.enabled) {
                totalScore += a;
                numModules++;
            }
            if (job.mockInterview && job.mockInterview.enabled) {
                totalScore += i;
                numModules++;
            }
        }

        // Final Score is the direct sum of the components (max 20 + 30 + 50 = 100)
        const finalScore = r + a + i;
        application.finalScore = finalScore;

        // Ensure all enabled modules are fully completed before shortlisting
        const isResumeDone = !job || job.resumeAnalysis?.enabled === false || (application.resumeMatchPercent !== null && application.resumeMatchPercent !== undefined);
        const isAssessmentDone = !job || !job.assessment?.enabled || (application.assessmentScore !== null && application.assessmentScore !== undefined);
        const isInterviewDone = !job || !job.mockInterview?.enabled || (application.interviewScore !== null && application.interviewScore !== undefined);

        if (isResumeDone && isAssessmentDone && isInterviewDone && application.finalScore >= 55) {
            console.log(`[LEDGER] Elite Candidate Detected: ${userId} (Score: ${application.finalScore})`);
            application.status = 'SHORTLISTED';
        }
        await application.save();
        res.status(201).json(application);
    } catch (error) {
        console.error("[LEDGER-FINAL] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getSeekerApplications = async (req, res) => {
    try {
        const apps = await Application.find({ userId: req.params.userId }).populate('jobId').sort({ createdAt: -1 });
        const validApps = apps.filter(app => app.jobId);
        res.json(validApps);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const app = await Application.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('jobId');

        // If status changed to HIRED, update the recruiter's hiring pattern
        if (status === 'HIRED' && app.jobId?.recruiterId) {
            updateRecruiterPattern(app.jobId.recruiterId);
        }
        
        res.json(app);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const resetApplicationAfterProctoring = async (req, res) => {
    try {
        const { jobId, userId, stage = 'unknown', reason, violation = null } = req.body;

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId) || !userId) {
            return res.status(400).json({ message: "Valid jobId and userId are required" });
        }

        const query = { jobId: new mongoose.Types.ObjectId(jobId), userId };

        const application = await Application.findOneAndUpdate(
            query,
            {
                $set: {
                    resumeMatchPercent: null,
                    assessmentScore: null,
                    assessmentSubmissionId: null,
                    interviewScore: null,
                    interviewAnswers: [],
                    finalScore: null,
                    resultsVisibleAt: null,
                    recordingSessionId: null,
                    recordingPublicId: null,
                    recordingAssetId: null,
                    recordingUrl: null,
                    recordingPlaybackUrl: null,
                    recordingFormat: null,
                    recordingDuration: null,
                    recordingBytes: null,
                    recordingUploadedAt: null,
                    recordingStatus: 'pending',
                    status: 'APPLIED',
                    lastProctoringResetAt: new Date(),
                    lastProctoringResetReason: reason || 'Security limit exceeded',
                    lastProctoringResetStage: stage,
                    lastProctoringViolation: violation
                },
                $inc: { proctoringResetCount: 1 }
            },
            { new: true }
        );

        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        res.json({
            success: true,
            application
        });
    } catch (error) {
        console.error("[PROCTORING-RESET] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const deleteApplication = async (req, res) => {
    try {
        const app = await Application.findByIdAndDelete(req.params.id);
        if (!app) {
            return res.status(404).json({ message: "Application not found" });
        }
        res.json({ message: "Application removed successfully" });
    } catch (error) {
        console.error("[DELETE-APP] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    submitApplication,
    getSeekerApplications,
    updateApplicationStatus,
    resetApplicationAfterProctoring,
    deleteApplication
};
