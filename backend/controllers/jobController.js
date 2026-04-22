const Job = require('../models/Job');
const mongoose = require('mongoose');

// GET ALL JOBS — candidates only see approved jobs
const getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ status: 'approved' })
            .populate('recruiter', 'name company')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error("[GET-JOBS] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET ALL JOBS FOR ADMIN — returns all regardless of status
const getAllJobsAdmin = async (req, res) => {
    try {
        const jobs = await Job.find()
            .populate('recruiter', 'name company email')
            .sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error("[ADMIN-GET-JOBS] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

const getJobById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) return res.status(400).json({ message: "Invalid Job ID" });
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ message: "Job not found" });
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
        res.json({ message: "Job deleted successfully" });
    } catch (error) {
        console.error("[GET-JOBS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const createJob = async (req, res) => {
    try {
        const job = new Job(req.body);
        const savedJob = await job.save();
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
        res.json({ message: "Job rejected", job });
    } catch (error) {
        console.error("[ADMIN-REJECT] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllJobs, getAllJobsAdmin, getJobById, updateJob, deleteJob, createJob, approveJob, rejectJob };
