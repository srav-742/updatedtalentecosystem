const Job = require('../models/Job');
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

// GET ALL JOBS — candidates see approved jobs (plus pending_approval on localhost for testing)
const getAllJobs = async (req, res) => {
    try {
        const isLocalhost = (req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'))) || process.env.NODE_ENV === 'development';
        const queryFilter = isLocalhost ? { status: { $in: ['approved', 'pending_approval'] } } : { status: 'approved' };

        // L1 cache: serve from memory if fresh (sub-millisecond)
        if (jobsCache && Date.now() - jobsCacheTime < CACHE_DURATION) {
            // Set browser-side cache header: browsers can cache for 60s,
            // and show stale for up to 10 min while fetching in background
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
            return res.json(jobsCache);
        }

        const jobs = await Job.find(queryFilter)
            .select('title company location type salary skills experienceLevel minPercentage createdAt recruiterId status description education')
            .populate('recruiter', 'name company')
            .sort({ createdAt: -1 })
            .lean();

        jobsCache = jobs;
        jobsCacheTime = Date.now();

        if (isLocalhost) {
            res.set('Cache-Control', 'private, no-cache, no-transform');
        } else {
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
        }
        res.json(jobs);
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
        // Individual job: cache for 2 minutes
        res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        res.json(job);
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

const updateJob = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        
        const isLocalhost = (req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'))) || process.env.NODE_ENV === 'development';
        const jobData = { ...req.body };
        if (isLocalhost) {
            jobData.status = 'approved';
        } else {
            jobData.status = req.body.status || 'pending_approval';
        }
        jobData.adminFeedback = { reason: '', reviewedAt: null };

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
        // Restrict delete operation strictly to the primary admin (sravyaadmin@gmail.com)
        const isPrimaryAdmin = req.user && req.user.role === 'admin' && req.user.email && req.user.email.toLowerCase() === 'sravyaadmin@gmail.com';
        if (!isPrimaryAdmin) {
            return res.status(403).json({ message: "Forbidden: Only the primary administrator (sravyaadmin@gmail.com) is authorized to delete jobs." });
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        await Job.findByIdAndDelete(req.params.jobId);
        clearJobsCache(); // Clear all job caches
        res.json({ message: "Job deleted successfully" });
    } catch (error) {
        console.error("[GET-JOBS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const createJob = async (req, res) => {
    try {
        const isLocalhost = (req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'))) || process.env.NODE_ENV === 'development';
        const initialStatus = isLocalhost ? 'approved' : 'pending_approval';
        const jobData = { ...req.body, status: initialStatus };

        const norm = normalizeJobRecruiterQuestions(jobData);
        if (!norm.isValid) {
            return res.status(400).json({ success: false, message: norm.error });
        }

        const job = new Job(jobData);
        const savedJob = await job.save();
        clearJobsCache(); // Clear all job caches
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
