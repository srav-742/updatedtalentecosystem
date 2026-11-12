const Job = require('../models/Job');
const Application = require('../models/Application');
const mongoose = require('mongoose');
const { invalidateCache } = require('../middleware/cacheMiddleware');
const { callSkillAI } = require('../utils/aiClients');
const { parseRawQuestionText, parseFileToText, validateQuestionBank } = require('../services/questionParserService');

// In-memory L1 cache (per process) — ultra-fast for repeat hits within same instance
// node-cache middleware (in app.js) acts as L2 cache across requests
let jobsCache = null;
let jobsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (was 60s)

const clearJobsCache = () => {
    jobsCache = null;
    jobsCacheTime = 0;
    // Also invalidate the node-cache layer so all routes are refreshed
    invalidateCache('/api/jobs');
};

// GET ALL JOBS — candidates only see approved & live jobs
const getAllJobs = async (req, res) => {
    try {
        const queryFilter = { status: 'approved' };

        // L1 cache: serve from memory if fresh (sub-millisecond)
        if (jobsCache && Date.now() - jobsCacheTime < CACHE_DURATION) {
            // Set browser-side cache header: browsers can cache for 60s,
            // and show stale for up to 10 min while fetching in background
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
            return res.json(jobsCache);
        }

        const jobs = await Job.find(queryFilter)
            .select('title company location type salary skills experienceLevel minPercentage createdAt recruiterId status description education candidateLimit candidateLimitTarget isRestrictedToWhitelist allowedCandidates')
            .populate('recruiter', 'name company')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate applicant counts for active jobs
        const jobIds = jobs.map(j => j._id);
        const counts = await Application.aggregate([
            { $match: { jobId: { $in: jobIds }, status: { $ne: 'SAVED' } } },
            { $group: { _id: '$jobId', applicantCount: { $sum: 1 } } }
        ]);
        const countMap = new Map(counts.map(item => [String(item._id), item.applicantCount]));

        const jobsWithCounts = jobs.map(job => ({
            ...job,
            applicantCount: countMap.get(String(job._id)) || 0
        }));

        jobsCache = jobsWithCounts;
        jobsCacheTime = Date.now();

        if (isLocalhost) {
            res.set('Cache-Control', 'private, no-cache, no-transform');
        } else {
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
        }
        res.json(jobsWithCounts);
    } catch (error) {
        console.error("[GET-JOBS] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET ALL JOBS FOR ADMIN — returns all regardless of status, with .lean() for speed
const getAllJobsAdmin = async (req, res) => {
    try {
        const jobs = await Job.find()
            .populate('recruiter', 'name company email')
            .sort({ createdAt: -1 })
            .lean(); // lean() returns plain JS objects, not Mongoose documents — ~2x faster
        // Admin data: private, no public cache
        res.set('Cache-Control', 'private, no-cache');
        res.json(jobs);
    } catch (error) {
        console.error("[ADMIN-GET-JOBS] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

const getJobById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) return res.status(400).json({ message: "Invalid Job ID" });
        const job = await Job.findById(req.params.jobId).lean();
        if (!job) return res.status(404).json({ message: "Job not found" });

        // Calculate active applicant count
        const applicantCount = await Application.countDocuments({ jobId: job._id, status: { $ne: 'SAVED' } });

        // Individual job: fresh cache control so permissions/whitelist updates reflect immediately
        const isLocalhost = (req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'))) || process.env.NODE_ENV === 'development';
        if (isLocalhost) {
            res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        } else {
            res.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
        }
        res.json({
            ...job,
            applicantCount
        });
    } catch (error) {
        console.error("[GET-JOBS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const normalizeJobRecruiterQuestions = (jobData) => {
    // FIX: Check if EITHER field says RECRUITER_PROVIDED (the || fallback to 'AI_GENERATED' was
    // swallowing the root-level value because 'AI_GENERATED' is truthy in JavaScript)
    const isRecruiterProvided = (
        jobData.questionSource === 'RECRUITER_PROVIDED' ||
        jobData.mockInterview?.questionSource === 'RECRUITER_PROVIDED'
    );
    const qSource = isRecruiterProvided ? 'RECRUITER_PROVIDED' : 'AI_GENERATED';
    const rawQuestions = jobData.mockInterview?.recruiterQuestions || jobData.recruiterQuestions || [];
    // FIX: Prefer root-level questionCount (set by the recruiter UI) over mockInterview default
    const qCount = Number(jobData.questionCount || jobData.mockInterview?.questionCount) || rawQuestions.length || 5;
    const sMode = jobData.selectionMode || jobData.mockInterview?.selectionMode || 'ORDERED';

    const normalizedQuestions = (rawQuestions || []).map((q, idx) => {
        const txt = String(q.text || q.question || '').trim();
        return {
            questionId: q.questionId || `q_${Date.now()}_${idx + 1}`,
            text: txt,
            question: txt,
            order: Number(q.order) || (idx + 1),
            category: q.category || 'General',
            difficulty: q.difficulty || 'Medium',
            questionType: q.questionType || 'Conceptual',
            timeLimit: Number(q.timeLimit) || 120,
            source: 'RECRUITER'
        };
    }).filter(q => q.text.length > 0);

    if (qSource === 'RECRUITER_PROVIDED') {
        const validation = validateQuestionBank(normalizedQuestions, qCount);
        if (!validation.isValid) {
            return { isValid: false, error: validation.error };
        }
        const validQuestions = validation.validQuestions.map((q, idx) => {
            const txt = String(q.text || q.question || '').trim();
            return {
                questionId: q.questionId || `q_${Date.now()}_${idx + 1}`,
                text: txt,
                question: txt,
                order: Number(q.order) || (idx + 1),
                category: q.category || 'General',
                difficulty: q.difficulty || 'Medium',
                questionType: q.questionType || 'Conceptual',
                timeLimit: Number(q.timeLimit) || 120,
                source: 'RECRUITER'
            };
        });

        if (jobData.mockInterview) {
            jobData.mockInterview.questionSource = 'RECRUITER_PROVIDED';
            jobData.mockInterview.questionCount = validation.normalizedCount;
            jobData.mockInterview.selectionMode = sMode;
            jobData.mockInterview.recruiterQuestions = validQuestions;
        }
        jobData.questionSource = 'RECRUITER_PROVIDED';
        jobData.questionCount = validation.normalizedCount;
        jobData.selectionMode = sMode;
        jobData.recruiterQuestions = validQuestions;
    } else {
        if (jobData.mockInterview) {
            jobData.mockInterview.questionSource = 'AI_GENERATED';
            jobData.mockInterview.questionCount = qCount;
            jobData.mockInterview.selectionMode = sMode;
            jobData.mockInterview.recruiterQuestions = normalizedQuestions;
        }
        jobData.questionSource = 'AI_GENERATED';
        jobData.questionCount = qCount;
        jobData.selectionMode = sMode;
        jobData.recruiterQuestions = normalizedQuestions;
    }

    return { isValid: true };
};

const normalizeCandidateQuotaAndAccess = (jobData) => {
    if (jobData.candidateLimit !== undefined) {
        const parsedLimit = Number(jobData.candidateLimit);
        jobData.candidateLimit = (!isNaN(parsedLimit) && parsedLimit > 0) ? parsedLimit : null;
    }
    if (jobData.candidateLimitTarget !== undefined) {
        const validTargets = ['ALL', 'APPLICANTS', 'ASSESSMENT', 'CODING', 'INTERVIEW'];
        jobData.candidateLimitTarget = validTargets.includes(jobData.candidateLimitTarget) ? jobData.candidateLimitTarget : 'ALL';
    }
    if (jobData.isRestrictedToWhitelist !== undefined) {
        jobData.isRestrictedToWhitelist = Boolean(jobData.isRestrictedToWhitelist);
    }
    if (Array.isArray(jobData.allowedCandidates)) {
        jobData.allowedCandidates = jobData.allowedCandidates
            .map(e => String(e).trim().toLowerCase())
            .filter(e => e.length > 0 && e.includes('@'));
    }
};

const updateJob = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        
        const existingJob = await Job.findById(req.params.jobId);
        if (!existingJob) {
            return res.status(404).json({ message: "Job not found" });
        }

        const jobData = { ...existingJob.toObject(), ...req.body };
        if (req.user && req.user.role === 'admin') {
            jobData.status = req.body.status || existingJob.status || 'pending_approval';
        } else {
            // Recruiters cannot self-approve. If previously rejected, editing resubmits it for review.
            if (existingJob.status === 'rejected') {
                jobData.status = 'pending_approval';
                jobData.adminFeedback = { reason: '', reviewedAt: null };
            } else {
                jobData.status = existingJob.status || 'pending_approval';
            }
        }

        normalizeCandidateQuotaAndAccess(jobData);

        const norm = normalizeJobRecruiterQuestions(jobData);
        if (!norm.isValid) {
            return res.status(400).json({ success: false, message: norm.error });
        }

        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, jobData, { new: true });
        clearJobsCache(); // Clear all job caches
        res.json(updatedJob);
    } catch (error) {
        console.error("[UPDATE-JOB] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID" });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: "Job not found" });
        }

        // Resolve requesting user
        let reqUser = req.user;
        const xUserId = req.headers['x-user-id'] || req.headers['x-h1p-user-id'] || req.query?.userId || req.body?.userId;
        if (!reqUser && xUserId) {
            const { findRecruiterUser } = require('../utils/userResolver');
            reqUser = await findRecruiterUser(xUserId);
        }

        const isAdmin = reqUser && (
            reqUser.role === 'admin' || 
            (reqUser.email && reqUser.email.toLowerCase() === 'sravyaadmin@gmail.com')
        );

        // Ownership check: recruiters can delete their own jobs (any status)
        // Admins can delete any job
        let isOwner = false;
        if (reqUser) {
            const { resolveRecruiterIdentifiers } = require('../utils/userResolver');
            const { allIds } = await resolveRecruiterIdentifiers(reqUser);
            isOwner = allIds.some(id => String(id).toLowerCase() === String(job.recruiterId || '').toLowerCase());
        } else if (xUserId) {
            isOwner = String(xUserId).toLowerCase() === String(job.recruiterId || '').toLowerCase();
        }

        const isLocalhost = (req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'))) || process.env.NODE_ENV === 'development';

        if (reqUser && !isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only delete your own job postings."
            });
        }

        if (!reqUser && !xUserId && !isLocalhost) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to delete job postings."
            });
        }

        console.log(`[DELETE-JOB] Initiating cascading deletion for job: ${job._id} ("${job.title}") requested by ${reqUser?.email || xUserId || 'localhost'}`);

        // Cascading deletion of all related records
        const jobObjectId = new mongoose.Types.ObjectId(jobId);
        const jobQueryCondition = { $or: [{ jobId: jobObjectId }, { jobId: String(jobId) }] };

        // 1. Applications & dependent records
        try {
            const Application = require('../models/Application');
            const applications = await Application.find(jobQueryCondition).select('_id');
            const applicationIds = applications.map(a => a._id);

            if (applicationIds.length > 0) {
                await Application.deleteMany({ _id: { $in: applicationIds } });
                console.log(`[DELETE-JOB] Deleted ${applicationIds.length} candidate applications`);

                // Delete unlocked applicants
                try {
                    const UnlockedApplicant = require('../models/UnlockedApplicant');
                    await UnlockedApplicant.deleteMany({ applicationId: { $in: applicationIds } });
                } catch (e) {
                    console.warn('[DELETE-JOB] UnlockedApplicant cleanup:', e.message);
                }

                // Delete proctoring reports & violations
                try {
                    const ProctoringReport = require('../models/ProctoringReport');
                    await ProctoringReport.deleteMany({ applicationId: { $in: applicationIds } });
                } catch (e) {
                    console.warn('[DELETE-JOB] ProctoringReport cleanup:', e.message);
                }
                try {
                    const ProctoringViolation = require('../models/ProctoringViolation');
                    await ProctoringViolation.deleteMany({ applicationId: { $in: applicationIds } });
                } catch (e) {
                    console.warn('[DELETE-JOB] ProctoringViolation cleanup:', e.message);
                }
                try {
                    const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');
                    await ProctoringViolationEnhanced.deleteMany({ applicationId: { $in: applicationIds } });
                } catch (e) {
                    console.warn('[DELETE-JOB] ProctoringViolationEnhanced cleanup:', e.message);
                }
            }
        } catch (appErr) {
            console.warn('[DELETE-JOB] Application cleanup error:', appErr.message);
        }

        // 2. Assessment Submissions
        try {
            const AssessmentSubmission = require('../models/AssessmentSubmission');
            await AssessmentSubmission.deleteMany(jobQueryCondition);
        } catch (e) {
            console.warn('[DELETE-JOB] AssessmentSubmission cleanup error:', e.message);
        }

        // 3. Assessment Ticket Consumptions
        try {
            const AssessmentTicketConsumption = require('../models/AssessmentTicketConsumption');
            await AssessmentTicketConsumption.deleteMany(jobQueryCondition);
        } catch (e) {
            console.warn('[DELETE-JOB] AssessmentTicketConsumption cleanup error:', e.message);
        }

        // 4. Coding Rounds, Questions & Revisions
        try {
            const CodingRound = require('../models/CodingRound');
            const CodingQuestion = require('../models/CodingQuestion');
            const rounds = await CodingRound.find(jobQueryCondition).select('_id');
            const roundIds = rounds.map(r => r._id);
            if (roundIds.length > 0) {
                const questions = await CodingQuestion.find({ codingRoundId: { $in: roundIds } }).select('_id');
                const questionIds = questions.map(q => q._id);

                if (questionIds.length > 0) {
                    try {
                        const CodeRevision = require('../models/CodeRevision');
                        await CodeRevision.deleteMany({ questionId: { $in: questionIds } });
                    } catch (e) {}
                    await CodingQuestion.deleteMany({ _id: { $in: questionIds } });
                }

                await CodingRound.deleteMany({ _id: { $in: roundIds } });
                console.log(`[DELETE-JOB] Deleted ${roundIds.length} coding rounds and ${questionIds.length} questions`);
            }
        } catch (e) {
            console.warn('[DELETE-JOB] CodingRound cleanup error:', e.message);
        }

        // 5. Interview Sessions & Feedback
        try {
            const InterviewSession = require('../models/InterviewSession');
            await InterviewSession.deleteMany(jobQueryCondition);
        } catch (e) {
            console.warn('[DELETE-JOB] InterviewSession cleanup error:', e.message);
        }
        try {
            const InterviewFeedback = require('../models/InterviewFeedback');
            await InterviewFeedback.deleteMany(jobQueryCondition);
        } catch (e) {
            console.warn('[DELETE-JOB] InterviewFeedback cleanup error:', e.message);
        }

        // 6. Resume Analysis
        try {
            const ResumeAnalysis = require('../models/ResumeAnalysis');
            await ResumeAnalysis.deleteMany(jobQueryCondition);
        } catch (e) {
            console.warn('[DELETE-JOB] ResumeAnalysis cleanup error:', e.message);
        }

        // 7. Recruiter Ticket Wallet Allocations
        try {
            const RecruiterTicketWallet = require('../models/RecruiterTicketWallet');
            await RecruiterTicketWallet.updateMany(
                {},
                { $pull: { jobs: { jobId: jobObjectId } } }
            );
        } catch (e) {
            console.warn('[DELETE-JOB] RecruiterTicketWallet cleanup error:', e.message);
        }

        // 8. Delete the Job requisition itself
        await job.deleteOne();
        clearJobsCache(); // Clear all job caches so it disappears immediately across all views

        console.log(`[DELETE-JOB] ✅ Successfully deleted job ${job._id} ("${job.title}")`);
        return res.json({
            success: true,
            message: "Job requisition and all associated candidate progress deleted successfully."
        });

    } catch (error) {
        console.error("[DELETE-JOB] Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createJob = async (req, res) => {
    try {
        // Enforce server-side expiration check for pilot recruiters
        if (req.user && req.user.role === 'recruiter' && req.user.accountType === 'pilot') {
            if (req.user.pilotExpiresAt && new Date() > new Date(req.user.pilotExpiresAt)) {
                return res.status(403).json({
                    success: false,
                    message: "Your Hire1Percent pilot access has expired. Please contact the Hire1Percent team if you need continued access.",
                    code: 'PILOT_EXPIRED',
                    pilotExpired: true
                });
            }
        }

        // Newly posted jobs must always be pending admin approval unless created by an admin
        const initialStatus = (req.user && req.user.role === 'admin' && req.body.status) ? req.body.status : 'pending_approval';
        const jobData = { ...req.body, status: initialStatus, adminFeedback: { reason: '', reviewedAt: null } };

        if (jobData.recruiterId) {
            const { findRecruiterUser } = require('../utils/userResolver');
            const recruiterUser = await findRecruiterUser(jobData.recruiterId);
            if (recruiterUser && recruiterUser.role === 'recruiter' && recruiterUser.accountType === 'pilot') {
                if (recruiterUser.pilotExpiresAt && new Date() > new Date(recruiterUser.pilotExpiresAt)) {
                    return res.status(403).json({
                        success: false,
                        message: "Your Hire1Percent pilot access has expired. Please contact the Hire1Percent team if you need continued access.",
                        code: 'PILOT_EXPIRED',
                        pilotExpired: true
                    });
                }
            }
        }

        normalizeCandidateQuotaAndAccess(jobData);

        const norm = normalizeJobRecruiterQuestions(jobData);
        if (!norm.isValid) {
            return res.status(400).json({ success: false, message: norm.error });
        }

        const job = new Job(jobData);
        const savedJob = await job.save();
        clearJobsCache(); // Clear all job caches

        // Provision / ensure Recruiter Client and roles exist in MongoDB
        if (jobData.recruiterId) {
            try {
                const { findRecruiterUser } = require('../utils/userResolver');
                findRecruiterUser(jobData.recruiterId).then(recruiterUser => {
                    if (recruiterUser && recruiterUser.role === 'recruiter') {
                        const { provisionClientForRecruiter } = require('./paymentController');
                        provisionClientForRecruiter(recruiterUser, 'combined').catch(err => {
                            console.warn('[CREATE-JOB] Recruiter client provision async notice:', err.message);
                        });
                    }
                }).catch(err => {
                    console.warn('[CREATE-JOB] Recruiter lookup notice:', err.message);
                });
            } catch (pErr) {
                console.warn('[CREATE-JOB] Recruiter provision hook error:', pErr.message);
            }
        }

        res.status(201).json({ success: true, job: savedJob });
    } catch (error) {
        console.error("[CREATE-JOB] Failure:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const parseQuestions = async (req, res) => {
    try {
        let rawText = req.body?.rawText || '';

        if (req.file) {
            rawText = await parseFileToText(req.file.buffer, req.file.originalname, req.file.mimetype);
        }

        if (!rawText || !rawText.trim()) {
            return res.status(400).json({ success: false, message: "No text or file content found to parse questions from." });
        }

        const result = parseRawQuestionText(rawText);
        if (!result.questions || result.questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No questions could be extracted. Please ensure questions are clearly separated by new lines or numbers (e.g. 1., 2.)."
            });
        }

        res.json({ success: true, count: result.questions.length, ...result });
    } catch (error) {
        console.error("[PARSE-QUESTIONS] Error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to process questions." });
    }
};

// ADMIN: Approve a job
const approveJob = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        const job = await Job.findByIdAndUpdate(
            req.params.jobId,
            {
                status: 'approved',
                adminFeedback: { reason: '', reviewedAt: new Date() }
            },
            { new: true }
        );
        if (!job) return res.status(404).json({ message: "Job not found" });
        console.log(`[ADMIN] Job approved: ${job._id} - "${job.title}"`);
        clearJobsCache(); // Clear all job caches so new job appears instantly
        res.json({ message: "Job approved and now live", job });
    } catch (error) {
        console.error("[ADMIN-APPROVE] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ADMIN: Reject a job with a reason
const rejectJob = async (req, res) => {
    try {
        const rawReason = req.body?.reason || req.body?.adminReason || req.body?.rejectionReason || req.body?.feedback;
        const reason = String(rawReason || '').trim() || "Rejected by Admin";
        
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        const job = await Job.findByIdAndUpdate(
            req.params.jobId,
            {
                status: 'rejected',
                adminFeedback: { reason, reviewedAt: new Date() }
            },
            { new: true }
        );
        if (!job) return res.status(404).json({ message: "Job not found" });
        console.log(`[ADMIN] Job rejected: ${job._id} - "${job.title}" | Reason: ${reason}`);
        clearJobsCache();
        res.json({ message: "Job rejected", job });
    } catch (error) {
        console.error("[ADMIN-REJECT] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// AI Generate Job Description
const generateJobDescription = async (req, res) => {
    try {
        const { title, skills = [], experienceLevel, type, location, specialInstructions } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Job title is required to generate a description." });
        }

        const prompt = `
You are an expert technical recruiter and HR professional. Please write a professional, engaging, and detailed job description for a job posting.

Details provided:
- Job Title: ${title}
- Job Type: ${type || 'Not specified'}
- Experience Level: ${experienceLevel || 'Not specified'}
- Location: ${location || 'Not specified'}
- Key Skills: ${skills.length > 0 ? skills.join(', ') : 'Not specified'}
- Special Instructions/Focus: ${specialInstructions || 'None'}

Please format it clearly using markdown (e.g., ## About the Role, ## Responsibilities, ## Requirements). 
Do NOT include any conversational filler (like "Here is the job description"). Output ONLY the job description text.
        `.trim();

        const generatedText = await callSkillAI(prompt, 1000, 0.7);

        if (!generatedText) {
            return res.status(500).json({ message: "Failed to generate job description. Please try again." });
        }

        res.json({ description: generatedText });
    } catch (error) {
        console.error("[GENERATE-JOB-DESC] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllJobs, getAllJobsAdmin, getJobById, updateJob, deleteJob, createJob, approveJob, rejectJob, clearJobsCache, generateJobDescription, parseQuestions };
