const Job = require('../models/Job');
const mongoose = require('mongoose');

const getAllJobs = async (req, res) => {
    try {
        const jobs = await Job.find().populate('recruiter', 'name company').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error("[GET-JOBS] Failure:", error);
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

module.exports = { getAllJobs, getJobById, updateJob, deleteJob };
