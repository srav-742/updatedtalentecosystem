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
        let [existingApp, jobDoc] = await Promise.all([
            Application.findOne(query).lean().catch(() => null),
            mongoose.Types.ObjectId.isValid(jobId) ? require('../models/Job').findById(jobId).lean().catch(() => null) : null
        ]);
        if (!existingApp && resolvedEmail) {
            existingApp = await Application.findOne({
                jobId: new mongoose.Types.ObjectId(jobId),
                applicantEmail: resolvedEmail.trim().toLowerCase()
            }).lean().catch(() => null);
        }

        const r = Number(updateData.resumeMatchPercent !== undefined ? updateData.resumeMatchPercent : (existingApp?.resumeMatchPercent || 0));
        const a = Number(updateData.assessmentScore !== undefined ? updateData.assessmentScore : (existingApp?.assessmentScore || 0));
        const i = Number(updateData.interviewScore !== undefined ? updateData.interviewScore : (existingApp?.interviewScore || 0));
        const finalScore = r + a + i;
        update.finalScore = finalScore;

        let targetStatus = req.body.status || existingApp?.status || 'APPLIED';
        if (targetStatus === 'SAVED' && req.body.status !== 'SAVED') {
            targetStatus = 'APPLIED';
        }

        // 🔒 Enforce Whitelist Restriction (Listed Candidates Only)
        const candidateEmail = String(resolvedEmail || '').trim().toLowerCase();
        const allowedList = (jobDoc?.allowedCandidates || []).map(e => String(e).trim().toLowerCase());
        const isCandidateWhitelisted = Boolean(candidateEmail && allowedList.includes(candidateEmail));

        if (targetStatus !== 'SAVED' && jobDoc?.isRestrictedToWhitelist) {
            if (!candidateEmail || !allowedList.includes(candidateEmail)) {
                return res.status(403).json({
                    success: false,
                    code: 'RESTRICTED_WHITELIST_ONLY',
                    message: `This job is restricted to listed candidates only. "${candidateEmail || 'Your email'}" is not on the invited list.`
                });
            }
        }

        // 🔒 Enforce Candidate Limit (Count is never disclosed to candidates; explicitly whitelisted candidates and invite-only jobs are exempt)
        if (!isCandidateWhitelisted && !jobDoc?.isRestrictedToWhitelist && targetStatus !== 'SAVED' && jobDoc?.candidateLimit && Number(jobDoc.candidateLimit) > 0) {
            const hasExistingSeat = existingApp && existingApp.status && existingApp.status !== 'SAVED';
            if (!hasExistingSeat) {
                const activeApplicantsCount = await Application.countDocuments({
                    jobId: jobDoc._id,
                    status: { $ne: 'SAVED' }
                });
                if (activeApplicantsCount >= Number(jobDoc.candidateLimit)) {
                    return res.status(403).json({
                        success: false,
                        code: 'LIMIT_REACHED',
                        message: 'This position is currently closed to new applicants.'
                    });
                }
            }
        }

        const isResumeDone = !jobDoc || jobDoc.resumeAnalysis?.enabled === false || (r !== null && r !== undefined);
        const isAssessmentDone = !jobDoc || !jobDoc.assessment?.enabled || (existingApp?.assessmentScore !== null && existingApp?.assessmentScore !== undefined) || (updateData.assessmentScore !== undefined);
        const isCodingDone = !jobDoc || !jobDoc.codingAssessment?.enabled || (existingApp?.codingScore !== null && existingApp?.codingScore !== undefined);
        const isInterviewDone = !jobDoc || !jobDoc.mockInterview?.enabled || (existingApp?.interviewScore !== null && existingApp?.interviewScore !== undefined) || (updateData.interviewScore !== undefined);
        const isCodingPassed = !jobDoc || !jobDoc.codingAssessment?.enabled || (Number(existingApp?.codingScore || 0) >= (jobDoc.codingAssessment?.passingScore || 70));

        if (isResumeDone && isAssessmentDone && isCodingDone && isInterviewDone && isCodingPassed && finalScore >= 55) {
            console.log(`[LEDGER] Elite Candidate Detected: ${userId} (Score: ${finalScore})`);
            targetStatus = 'SHORTLISTED';
        } else if (targetStatus === 'SHORTLISTED' && finalScore < 55) {
            targetStatus = 'APPLIED';
        }
        update.status = targetStatus;

        const targetQuery = existingApp ? { _id: existingApp._id } : query;
        const application = await Application.findOneAndUpdate(targetQuery, { $set: update }, { new: true, upsert: true });
        invalidateCache('/api/applications');
        res.status(201).json(application);
    } catch (error) {
        console.error("[LEDGER-FINAL] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getSeekerApplications = async (req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findOne({ uid: req.params.userId }).lean();
        const userEmail = user?.email || (req.params.userId.includes('@') ? req.params.userId : null);

        const query = userEmail
            ? { $or: [{ userId: req.params.userId }, { applicantEmail: userEmail.toLowerCase() }] }
            : { userId: req.params.userId };

        const apps = await Application.find(query)
            .select('-interviewAnswers -assessmentAnswers -codingAnswers -recommendationSummary')
            .populate('jobId', 'title company location type salary skills experienceLevel minPercentage status createdAt recruiterId isApproved resumeAnalysis assessment codingAssessment mockInterview isRestrictedToWhitelist allowedCandidates candidateLimit applicantCount')
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
