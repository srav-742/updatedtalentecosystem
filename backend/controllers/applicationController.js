const Application = require('../models/Application');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const User = require('../models/User');
const mongoose = require('mongoose');
const { updateRecruiterPattern } = require('./teamFitController');
const { invalidateCache } = require('../middleware/cacheMiddleware');


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

        if (req.body.status) {
            application.status = req.body.status;
        }

        // Transition from SAVED to APPLIED if user is now submitting application details
        if (application.status === 'SAVED' && req.body.status !== 'SAVED') {
            application.status = 'APPLIED';
        }

        // Calculate Final Score strictly from present rounds (Resume + MCQ + Interview = 100 max)
        // Coding assessment has its own dedicated score and is kept completely separate
        const r = application.resumeMatchPercent || 0;
        const a = application.assessmentScore || 0;
        const i = application.interviewScore || 0;

        // Final Score is the direct sum of the primary components (max 100)
        const finalScore = r + a + i;
        application.finalScore = finalScore;

        const job = application.jobId;

        // Ensure all enabled modules are fully completed before shortlisting
        const isResumeDone = !job || job.resumeAnalysis?.enabled === false || (application.resumeMatchPercent !== null && application.resumeMatchPercent !== undefined);
        const isAssessmentDone = !job || !job.assessment?.enabled || (application.assessmentScore !== null && application.assessmentScore !== undefined);
        const isCodingDone = !job || !job.codingAssessment?.enabled || (application.codingScore !== null && application.codingScore !== undefined);
        const isInterviewDone = !job || !job.mockInterview?.enabled || (application.interviewScore !== null && application.interviewScore !== undefined);
        const isCodingPassed = !job || !job.codingAssessment?.enabled || (application.codingScore >= (job.codingAssessment.passingScore || 70));

        if (isResumeDone && isAssessmentDone && isCodingDone && isInterviewDone && isCodingPassed && application.finalScore >= 55) {
            console.log(`[LEDGER] Elite Candidate Detected: ${userId} (Score: ${application.finalScore})`);
            application.status = 'SHORTLISTED';
        }
        await application.save();
        invalidateCache('/api/applications');
        res.status(201).json(application);
    } catch (error) {
        console.error("[LEDGER-FINAL] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getSeekerApplications = async (req, res) => {
    try {
        const apps = await Application.find({ userId: req.params.userId })
            .select('-interviewAnswers -assessmentAnswers -codingAnswers -recommendationSummary')
            .populate('jobId', 'title company location type salary skills experienceLevel minPercentage status createdAt recruiterId isApproved resumeAnalysis assessment codingAssessment mockInterview')
            .sort({ appliedAt: -1 })
            .lean();
        const validApps = apps.filter(app => app.jobId);
        res.json(validApps);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getSeekerDashboardStats = async (req, res) => {
    try {
        const userId = req.params.userId;
        const Job = require('../models/Job');

        const [applied, shortlisted, eligible, availableJobs] = await Promise.all([
            Application.countDocuments({ userId, status: { $ne: 'SAVED' } }),
            Application.countDocuments({ userId, status: 'SHORTLISTED' }),
            Application.countDocuments({ userId, status: { $in: ['ELIGIBLE', 'SHORTLISTED', 'HIRED'] } }),
            Job.countDocuments({ status: 'approved' })
        ]);

        res.json({
            applied,
            shortlisted,
            eligible,
            availableJobs
        });
    } catch (error) {
        console.error("[GET-SEEKER-STATS] Error:", error);
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
        
        invalidateCache('/api/applications');
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
                    assessmentRecordingSessionId: null,
                    assessmentRecordingPublicId: null,
                    assessmentRecordingAssetId: null,
                    assessmentRecordingUrl: null,
                    assessmentRecordingPlaybackUrl: null,
                    assessmentRecordingFormat: null,
                    assessmentRecordingDuration: null,
                    assessmentRecordingBytes: null,
                    assessmentRecordingUploadedAt: null,
                    assessmentRecordingStatus: 'pending',
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

        invalidateCache('/api/applications');
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
        const app = await Application.findById(req.params.id);
        if (!app) {
            return res.status(404).json({ message: "Application not found" });
        }

        // Restrict delete operation to the primary admin OR the owner unsaving a job
        const isPrimaryAdmin = req.user && req.user.role === 'admin' && req.user.email && req.user.email.toLowerCase() === 'sravyaadmin@gmail.com';
        const isOwnerUnsaving = req.user && (req.user.uid === app.userId || req.user._id?.toString() === app.userId) && app.status === 'SAVED';

        if (!isPrimaryAdmin && !isOwnerUnsaving) {
            return res.status(403).json({ message: "Forbidden: Only the primary administrator or the candidate unsaving a job can delete this application." });
        }

        console.log(`[DELETE-APP] Deleting application with ID: ${req.params.id} by ${req.user?.email || req.user?.uid}`);
        await Application.findByIdAndDelete(req.params.id);
        invalidateCache('/api/applications');
        res.json({ message: "Application removed successfully" });
    } catch (error) {
        console.error("[DELETE-APP] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const retestApplicationRound = async (req, res) => {
    try {
        const { id } = req.params;
        const { round = 'coding', reason = 'Candidate requested retest' } = req.body || {};

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Valid Application ID is required" });
        }

        const application = await Application.findById(id).populate('jobId');
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        if (round !== 'all' && (!application.retestAccess || !application.retestAccess[round] || !application.retestAccess[round].granted)) {
            return res.status(403).json({ success: false, message: `Retest access for ${round} not granted by recruiter.` });
        }

        const updateSet = {
            status: 'APPLIED',
            lastRetestAt: new Date(),
            lastRetestRound: round,
            lastRetestReason: reason
        };

        if (round !== 'all') {
            updateSet[`retestAccess.${round}.granted`] = false;
        }

        if (round === 'coding' || round === 'all') {
            updateSet.codingScore = null;
            updateSet.codingAnswers = [];
            updateSet.codingDetails = null;
        }

        if (round === 'assessment' || round === 'all') {
            updateSet.assessmentScore = null;
            updateSet.assessmentAnswers = [];
            updateSet.assessmentSubmissionId = null;
            updateSet.assessmentRecordingSessionId = null;
            updateSet.assessmentRecordingUrl = null;
            updateSet.assessmentRecordingStatus = 'pending';
        }

        if (round === 'interview' || round === 'all') {
            updateSet.interviewScore = null;
            updateSet.interviewAnswers = [];
            updateSet.videoIntroUrl = null;
            updateSet.recordingSessionId = null;
            updateSet.recordingUrl = null;
            updateSet.recordingStatus = 'pending';
        }

        // Recalculate final score:
        const currentResume = application.resumeMatchPercent || 0;
        const currentAssessment = (round === 'assessment' || round === 'all') ? 0 : (application.assessmentScore || 0);
        const currentInterview = (round === 'interview' || round === 'all') ? 0 : (application.interviewScore || 0);
        updateSet.finalScore = currentResume + currentAssessment + currentInterview;

        const updatedApp = await Application.findByIdAndUpdate(
            id,
            { 
                $set: updateSet,
                $inc: { retestCount: 1 }
            },
            { new: true }
        ).populate('jobId');

        invalidateCache('/api/applications');
        console.log(`[RETEST] Successfully reset round '${round}' for application ${id}`);

        res.json({
            success: true,
            message: `Retest for ${round} initiated successfully`,
            application: updatedApp
        });
    } catch (error) {
        console.error("[RETEST] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const grantRetestAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { round } = req.body;
        
        if (!round || !['assessment', 'coding', 'interview'].includes(round)) {
            return res.status(400).json({ success: false, message: "Invalid round specified." });
        }

        const application = await Application.findById(id);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        const updateKey = `retestAccess.${round}.granted`;
        const updatedApp = await Application.findByIdAndUpdate(
            id,
            { $set: { [updateKey]: true } },
            { new: true }
        );

        invalidateCache('/api/applications');
        res.json({ success: true, message: `Retest access granted for ${round}`, application: updatedApp });
    } catch (error) {
        console.error("[GRANT RETEST ACCESS] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    submitApplication,
    getSeekerApplications,
    getSeekerDashboardStats,
    updateApplicationStatus,
    resetApplicationAfterProctoring,
    retestApplicationRound,
    grantRetestAccess,
    deleteApplication
};
