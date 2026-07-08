const Job = require('../models/Job');
const mongoose = require('mongoose');
const { invalidateCache } = require('../middleware/cacheMiddleware');

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

// GET ALL JOBS — candidates only see approved jobs
const getAllJobs = async (req, res) => {
    try {
        // L1 cache: serve from memory if fresh (sub-millisecond)
        if (jobsCache && Date.now() - jobsCacheTime < CACHE_DURATION) {
            // Set browser-side cache header: browsers can cache for 60s,
            // and show stale for up to 10 min while fetching in background
            res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
            return res.json(jobsCache);
        }

        const jobs = await Job.find({ status: 'approved' })
            .select('title company location type salary skills experienceLevel minPercentage createdAt recruiterId status description education')
            .populate('recruiter', 'name company')
            .sort({ createdAt: -1 })
            .lean();

        jobsCache = jobs;
        jobsCacheTime = Date.now();

        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
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

const updateJob = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, req.body, { new: true });
        clearJobsCache(); // Clear all job caches
        res.json(updatedJob);
    } catch (error) {
        console.error("[GET-JOBS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const deleteJob = async (req, res) => {
    try {
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
        const jobData = { ...req.body, status: 'pending_approval' };
        const job = new Job(jobData);
        const savedJob = await job.save();
        clearJobsCache(); // Clear all job caches
        res.status(201).json({ success: true, job: savedJob });
    } catch (error) {
        console.error("[CREATE-JOB] Failure:", error);
        res.status(500).json({ success: false, message: error.message });
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
        const { reason } = req.body;
        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: "A rejection reason is required." });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        const job = await Job.findByIdAndUpdate(
            req.params.jobId,
            {
                status: 'rejected',
                adminFeedback: { reason: reason.trim(), reviewedAt: new Date() }
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

module.exports = { getAllJobs, getAllJobsAdmin, getJobById, updateJob, deleteJob, createJob, approveJob, rejectJob, clearJobsCache };
