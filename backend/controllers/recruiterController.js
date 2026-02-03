const Job = require('../models/Job');
const Application = require('../models/Application');

const getRecruiterDashboard = async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;
        const jobs = await Job.find({ recruiterId });
        const jobIds = jobs.map(j => j._id);
        const [applicationCount, shortlistedCount] = await Promise.all([
            Application.countDocuments({ jobId: { $in: jobIds } }),
            Application.countDocuments({ jobId: { $in: jobIds }, status: 'SHORTLISTED' })
        ]);
        console.log(`[Dashboard] Recruiter ${recruiterId}: Found ${jobs.length} jobs, ${applicationCount} apps`);
        res.json({ jobCount: jobs.length, applicationCount, shortlistedCount });
    } catch (error) {
        console.error("[Dashboard] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getRecruiterApplications = async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;
        const jobs = await Job.find({ recruiterId });
        const jobIds = jobs.map(j => j._id);
        const apps = await Application.find({ jobId: { $in: jobIds } })
            .populate('jobId')
            .populate('user', 'name email profilePic')
            .sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) {
        console.error("[GET-APPS-REC] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

const getRecruiterJobs = async (req, res) => {
    try {
        const id = req.params.recruiterId;
        const jobs = await Job.find({ recruiterId: id }).sort({ createdAt: -1 }).lean();
        const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
            const count = await Application.countDocuments({ jobId: job._id });
            return { ...job, applicantCount: count };
        }));
        console.log(`[MyJobs] Found ${jobs.length} jobs for recruiter ${id}`);
        res.json(jobsWithCounts);
    } catch (error) {
        console.error("[MyJobs] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const createJob = async (req, res) => {
    try {
        const { recruiterId, title } = req.body;
        console.log(`[JOBS] Attempting to save job: "${title}" for recruiter: ${recruiterId}`);
        if (!recruiterId) {
            console.warn(`[JOBS] Save failed: Missing recruiterId`);
            return res.status(400).json({ message: "Recruiter ID is required" });
        }
        const jobData = { ...req.body };
        const job = new Job(jobData);
        await job.save();
        console.log(`[JOBS] Successfully saved job: ${job._id}`);
        res.status(201).json(job);
    } catch (error) {
        console.error(`[JOBS] Save error:`, error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getRecruiterDashboard, getRecruiterApplications, getRecruiterJobs, createJob };
