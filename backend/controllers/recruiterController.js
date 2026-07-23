const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { buildRecruiterJobQuery, resolveRecruiterIdentifiers } = require('../utils/userResolver');

const resolveRecruiterJobQuery = async (recruiterId) => {
    return await buildRecruiterJobQuery(recruiterId);
};

const getRecruiterDashboard = async (req, res) => {
    try {
        const reqUser = req.user;
        const recruiterId = req.params.recruiterId;

        // Enforce recruiter dashboard ownership check (admins bypass)
        if (reqUser && reqUser.role !== 'admin') {
            const { allIds } = await resolveRecruiterIdentifiers(recruiterId);
            const reqUserIds = [reqUser._id?.toString(), reqUser.uid, reqUser.email?.toLowerCase().trim()].filter(Boolean);
            const isSelf = reqUserIds.some(id => allIds.includes(id));
            if (!isSelf) {
                return res.status(403).json({ message: "Access denied. Only the recruiter owning this job can access this dashboard." });
            }
        }

        const jobQuery = await resolveRecruiterJobQuery(recruiterId);
        const jobs = await Job.find(jobQuery).select('_id').lean();
        const jobIds = jobs.map((job) => job._id);

        const [applicationCount, shortlistedCount] = await Promise.all([
            Application.countDocuments({ jobId: { $in: jobIds }, status: { $ne: 'SAVED' } }),
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
        const reqUser = req.user;
        const recruiterId = req.query.recruiterId || req.params.recruiterId;

        // Enforce recruiter applications ownership check (admins bypass)
        if (reqUser && reqUser.role !== 'admin') {
            const { allIds } = await resolveRecruiterIdentifiers(recruiterId);
            const reqUserIds = [reqUser._id?.toString(), reqUser.uid, reqUser.email?.toLowerCase().trim()].filter(Boolean);
            const isSelf = reqUserIds.some(id => allIds.includes(id));
            if (!isSelf) {
                return res.status(403).json({ message: "Access denied. Only the recruiter owning this job can view these applications." });
            }
        }

        const jobQuery = await resolveRecruiterJobQuery(recruiterId);
        const jobs = await Job.find(jobQuery).select('_id').lean();
        const jobIds = jobs.map((job) => job._id);

        const apps = await Application.find({ jobId: { $in: jobIds }, status: { $ne: 'SAVED' } })
            .select('-interviewAnswers -assessmentAnswers -recommendationSummary')
            .populate('jobId')
            .populate('user', 'name email profilePic githubUrl linkedinUrl resumeUrl')
            .sort({ appliedAt: -1 })
            .lean();

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
                        app.user = {
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

        // Fetch proctoring violations and map proctoringScore
        const userIdList = apps.map(app => app.userId).filter(Boolean);
        const ProctoringViolation = require('../models/ProctoringViolation');
        const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');
        const { getViolationRating } = require('../utils/proctoringScoring');

        const violationQuery = {
            userId: { $in: userIdList }
        };

        const [baseViolations, enhancedViolations] = await Promise.all([
            ProctoringViolation.find(violationQuery).lean(),
            ProctoringViolationEnhanced.find(violationQuery).lean()
        ]);

        const applicationPenaltyMap = {};
        const applicationFlagsMap = {};
        const addRating = (userId, examId, type, metadata) => {
            if (!userId) return;
            const rating = getViolationRating(type, metadata);
            
            // Extract jobId from examId (format: type:jobId:sessionId)
            let jobId = null;
            if (examId && typeof examId === 'string') {
                const parts = examId.split(':');
                if (parts.length >= 2) {
                    jobId = parts[1];
                }
            }

            // Key on userId_jobId if jobId is valid, otherwise fallback to userId only
            const key = jobId ? `${userId}_${jobId}` : userId;
            
            applicationPenaltyMap[key] = (applicationPenaltyMap[key] || 0) + rating;
            
            if (!applicationFlagsMap[key]) {
                applicationFlagsMap[key] = new Set();
            }
            applicationFlagsMap[key].add(type);
        };

        baseViolations.forEach(v => {
            addRating(v.userId, v.examId, v.type, v.metadata);
        });

        enhancedViolations.forEach(v => {
            addRating(v.userId, v.examId, v.type, v.metadata);
        });

        const isAdmin = reqUser && reqUser.role === 'admin';
        
        let unlockedAppMap = new Map();
        if (reqUser && !isAdmin) {
            const UnlockedApplicant = require('../models/UnlockedApplicant');
            const unlockedRecords = await UnlockedApplicant.find({ recruiterId: reqUser._id }).lean();
            unlockedRecords.forEach(r => {
                if (r && r.applicationId) {
                    unlockedAppMap.set(r.applicationId.toString(), r.unlockedItems || []);
                }
            });
        }

        const appsWithScore = apps.map((app, index) => {
            const jobIdStr = app.jobId?._id?.toString() || app.jobId?.toString();
            const appKey = jobIdStr ? `${app.userId}_${jobIdStr}` : app.userId;
            const rawPenalty = applicationPenaltyMap[appKey] !== undefined 
                ? applicationPenaltyMap[appKey] 
                : (applicationPenaltyMap[app.userId] || 0);
            app.integrityPenalty = rawPenalty;
            app.proctoringScore = rawPenalty;
            
            const flags = applicationFlagsMap[appKey] || applicationFlagsMap[app.userId];
            app.proctoringFlags = flags ? Array.from(flags) : [];
            
            let isResumeLocked = true;
            let isAssessmentLocked = true;
            let isInterviewLocked = true;

            if (isAdmin) {
                isResumeLocked = false;
                isAssessmentLocked = false;
                isInterviewLocked = false;
            } else if (unlockedAppMap.has(app._id.toString())) {
                const items = unlockedAppMap.get(app._id.toString()) || [];
                isResumeLocked = !items.includes('resume');
                isAssessmentLocked = !items.includes('assessment');
                isInterviewLocked = !items.includes('interview');
            }

            app.isResumeLocked = isResumeLocked;
            app.isAssessmentLocked = isAssessmentLocked;
            app.isInterviewLocked = isInterviewLocked;
            app.isLocked = isResumeLocked; // Backward compatibility for general checks

            // Conditionally mask Resume & Profile data
            if (isResumeLocked) {
                app.applicantName = `Candidate ${index + 1}`;
                if (app.applicantEmail) {
                    const parts = app.applicantEmail.split('@');
                    if (parts.length === 2) {
                        const local = parts[0];
                        app.applicantEmail = `${local.charAt(0)}***@${parts[1]}`;
                    } else {
                        app.applicantEmail = 'Locked';
                    }
                } else {
                    app.applicantEmail = 'Locked';
                }
                
                if (app.user) {
                    app.user = {
                        name: `Candidate ${index + 1}`,
                        email: app.applicantEmail,
                        profilePic: null,
                        githubUrl: null,
                        linkedinUrl: null,
                        resumeUrl: null
                    };
                }
            } else {
                if (app.user && app.user.name) {
                    app.applicantName = app.user.name;
                }
            }

            // Conditionally mask Interview / Video Intro data
            if (isInterviewLocked) {
                app.videoIntroUrl = null;
                app.recordingPlaybackUrl = null;
                app.recordingUrl = null;
            }

            return app;
        });

        res.json(appsWithScore);
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
            { $match: { jobId: { $in: jobIds }, status: { $ne: 'SAVED' } } },
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
        jobData.status = 'pending_approval';

        const job = new Job(jobData);
        const savedJob = await job.save();

        console.log(`[JOBS] Successfully saved job: ${savedJob._id}`);
        
        try {
            const { clearJobsCache } = require('./jobController');
            clearJobsCache();
        } catch (cacheError) {
            console.error('[JOBS] Cache invalidation failed:', cacheError.message);
        }

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
