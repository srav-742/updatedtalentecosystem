const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');

const resolveRecruiterJobQuery = async (recruiterId) => {
    if (!recruiterId) {
        return { recruiterId: null };
    }

    let resolvedUid = null;
    let resolvedObjectId = null;

    if (recruiterId.length === 24) {
        const user = await User.findById(recruiterId).select('uid').lean();
        resolvedUid = user?.uid || null;
        resolvedObjectId = recruiterId;
    } else {
        const user = await User.findOne({ uid: recruiterId }).select('_id').lean();
        resolvedUid = recruiterId;
        resolvedObjectId = user?._id?.toString() || null;
    }

    const recruiterIds = [resolvedUid, resolvedObjectId, recruiterId].filter(Boolean);
    return recruiterIds.length > 1
        ? { recruiterId: { $in: recruiterIds } }
        : { recruiterId: recruiterIds[0] || recruiterId };
};

const getRecruiterDashboard = async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;
        const jobQuery = await resolveRecruiterJobQuery(recruiterId);
        const jobs = await Job.find(jobQuery).select('_id').lean();
        const jobIds = jobs.map((job) => job._id);

        const [applicationCount, shortlistedCount] = await Promise.all([
            Application.countDocuments({ jobId: { $in: jobIds } }),
            Application.countDocuments({ jobId: { $in: jobIds }, status: 'SHORTLISTED' })
        ]);

        res.json({ jobCount: jobs.length, applicationCount, shortlistedCount });
    } catch (error) {
        console.error('[Dashboard] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getRecruiterApplications = async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;
        const jobQuery = await resolveRecruiterJobQuery(recruiterId);
        const jobs = await Job.find(jobQuery).select('_id').lean();
        const jobIds = jobs.map((job) => job._id);

        const apps = await Application.find({ jobId: { $in: jobIds } })
            .populate('jobId')
            .populate('user', 'name email profilePic githubUrl linkedinUrl resumeUrl')
            .sort({ createdAt: -1 });

        const missingUserApps = apps.filter((app) => !app.user);

        if (missingUserApps.length > 0) {
            const emails = missingUserApps.map((app) => app.applicantEmail).filter(Boolean);
            const uids = missingUserApps.map((app) => app.userId).filter(Boolean);

            const fallbackUsers = await User.find({
                $or: [
                    { email: { $in: emails } },
                    { uid: { $in: uids } }
                ]
            }).lean();

            const userMap = new Map();
            fallbackUsers.forEach((user) => {
                if (user.email) userMap.set(user.email, user);
                if (user.uid) userMap.set(user.uid, user);
            });

            apps.forEach((app) => {
                if (!app.user) {
                    const found = userMap.get(app.applicantEmail) || userMap.get(app.userId);
                    if (found) {
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

        res.json(apps);
    } catch (error) {
        console.error('[GET-APPS-REC] Failure:', error);
        res.status(500).json({ message: error.message });
    }
};

const getRecruiterJobs = async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;
        const jobQuery = await resolveRecruiterJobQuery(recruiterId);
        const jobs = await Job.find(jobQuery).sort({ createdAt: -1 }).lean();
        const jobIds = jobs.map((job) => job._id);

        const counts = await Application.aggregate([
            { $match: { jobId: { $in: jobIds } } },
            { $group: { _id: '$jobId', applicantCount: { $sum: 1 } } }
        ]);

        const countMap = new Map(
            counts.map((item) => [String(item._id), item.applicantCount])
        );

        const jobsWithCounts = jobs.map((job) => ({
            ...job,
            applicantCount: countMap.get(String(job._id)) || 0
        }));

        res.json(jobsWithCounts);
    } catch (error) {
        console.error('[MyJobs] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

const createJob = async (req, res) => {
    try {
        const { recruiterId, title } = req.body;

        console.log(`[JOBS] CREATE Attempt - Recruiter: ${recruiterId}, Title: "${title}"`);

        if (!recruiterId) {
            console.warn('[JOBS] Save failed: Missing recruiterId');
            return res.status(400).json({ message: 'Recruiter ID is required. Please ensure you are logged in.' });
        }

        if (!title) {
            console.warn('[JOBS] Save failed: Missing title');
            return res.status(400).json({ message: 'Job title is required' });
        }

        const jobData = { ...req.body };

        if (jobData.minPercentage) jobData.minPercentage = Number(jobData.minPercentage);
        if (jobData.assessment?.totalQuestions) jobData.assessment.totalQuestions = Number(jobData.assessment.totalQuestions);
        if (jobData.mockInterview?.passingScore) jobData.mockInterview.passingScore = Number(jobData.mockInterview.passingScore);

        delete jobData._id;

        const job = new Job(jobData);
        const savedJob = await job.save();

        console.log(`[JOBS] Successfully saved job: ${savedJob._id}`);
        res.status(201).json({
            message: 'Job created successfully',
            job: savedJob
        });
    } catch (error) {
        console.error('[JOBS] Save error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err) => err.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors: messages
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                message: `Invalid data format for field: ${error.path}`,
                error: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                message: 'A job with this title already exists'
            });
        }

        res.status(500).json({
            message: 'Failed to save job posting due to a server error',
            error: error.message,
            tip: 'Check if all required fields are provided and correctly formatted.'
        });
    }
};

module.exports = { getRecruiterDashboard, getRecruiterApplications, getRecruiterJobs, createJob };
