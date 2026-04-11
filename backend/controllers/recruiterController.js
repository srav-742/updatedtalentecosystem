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
        
        console.log(`[JOBS] CREATE Attempt - Recruiter: ${recruiterId}, Title: "${title}"`);

        if (!recruiterId) {
            console.warn(`[JOBS] Save failed: Missing recruiterId`);
            return res.status(400).json({ message: "Recruiter ID is required. Please ensure you are logged in." });
        }

        if (!title) {
            console.warn(`[JOBS] Save failed: Missing title`);
            return res.status(400).json({ message: "Job title is required" });
        }

        // Data cleanup and type casting
        const jobData = { ...req.body };
        
        // Ensure numeric fields are numbers
        if (jobData.minPercentage) jobData.minPercentage = Number(jobData.minPercentage);
        if (jobData.assessment?.totalQuestions) jobData.assessment.totalQuestions = Number(jobData.assessment.totalQuestions);
        if (jobData.mockInterview?.passingScore) jobData.mockInterview.passingScore = Number(jobData.mockInterview.passingScore);

        // Remove _id if it exists (relevant if frontend state was reused from an edit)
        delete jobData._id;

        const job = new Job(jobData);
        const savedJob = await job.save();

        console.log(`[JOBS] Successfully saved job: ${savedJob._id}`);
        res.status(201).json({
            message: "Job created successfully",
            job: savedJob
        });
    } catch (error) {
        console.error(`[JOBS] Save error:`, error);

        // Handle MongoDB validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                message: "Validation failed",
                errors: messages
            });
        }

        // Handle Cast Errors (e.g. string to number)
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: `Invalid data format for field: ${error.path}`,
                error: error.message
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                message: "A job with this title already exists"
            });
        }

        res.status(500).json({
            message: "Failed to save job posting due to a server error",
            error: error.message,
            tip: "Check if all required fields are provided and correctly formatted."
        });
    }
};

module.exports = { getRecruiterDashboard, getRecruiterApplications, getRecruiterJobs, createJob };
