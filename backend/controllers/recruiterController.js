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
            .populate('user', 'name email profilePic githubUrl linkedinUrl resumeUrl')
            .sort({ createdAt: -1 });

        // ─── ROBUST SOCIAL LINK FALLBACK ───
        const User = require('../models/User');
        const missingUserApps = apps.filter(app => !app.user);
        
        if (missingUserApps.length > 0) {
            const emails = missingUserApps.map(a => a.applicantEmail).filter(Boolean);
            const uids = missingUserApps.map(a => a.userId).filter(Boolean);
            
            const fallbackUsers = await User.find({
                $or: [
                    { email: { $in: emails } },
                    { uid: { $in: uids } }
                ]
            });

            const userMap = new Map();
            fallbackUsers.forEach(u => {
                if (u.email) userMap.set(u.email, u);
                if (u.uid) userMap.set(u.uid, u);
            });

            apps.forEach(app => {
                if (!app.user) {
                    const found = userMap.get(app.applicantEmail) || userMap.get(app.userId);
                    if (found) {
                        // Create a mock user object for the virtual field
                        app._doc.user = {
                            githubUrl: found.githubUrl,
                            linkedinUrl: found.linkedinUrl,
                            profilePic: found.profilePic,
                            name: found.name,
                            email: found.email,
                            resumeUrl: found.resumeUrl
                        };
                    }
                }
            });
        }
        // ────────────────────────────────────

        // ─── OWNERSHIP VETTING SCORE LOGIC ───
        // Logic to calculate candidate suitability based on assessment and interview scores
        // ─────────────────────────────────────

        res.json(apps);
    } catch (error) {
        console.error("[GET-APPS-REC] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

const getRecruiterJobs = async (req, res) => {
    try {
        const id = req.params.recruiterId;
        // Return ALL statuses — recruiter should see pending, approved, and rejected
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
