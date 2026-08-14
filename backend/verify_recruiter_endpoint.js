require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Job = require('./models/Job');
const Application = require('./models/Application');
const { getViolationRating } = require('./utils/proctoringScoring');
const ProctoringViolation = require('./models/ProctoringViolation');
const ProctoringViolationEnhanced = require('./models/ProctoringViolationEnhanced');

async function run() {
    try {
        await connectDB();
        
        // Find the job
        const job = await Job.findById('6a4b61ed5202c1627497779a').lean();
        console.log(`Job Title: ${job?.title}, Recruiter ID: ${job?.recruiterId}`);
        
        // Mimic getRecruiterApplications for this recruiterId
        const recruiterId = job?.recruiterId;
        if (!recruiterId) {
            console.log("No recruiterId found for this job.");
            await mongoose.disconnect();
            return;
        }

        // resolveRecruiterJobQuery logic
        const queryConditions = [
            { _id: recruiterId },
            { uid: recruiterId }
        ];
        if (typeof recruiterId === 'string' && recruiterId.includes('@')) {
            queryConditions.push({ email: recruiterId.toLowerCase().trim() });
        }
        const User = require('./models/User');
        const user = await User.findOne({ $or: queryConditions }).select('_id uid email').lean();
        const recruiterIds = [recruiterId];
        if (user) {
            if (user.uid) recruiterIds.push(user.uid);
            if (user._id) recruiterIds.push(user._id.toString());
            if (user.email) recruiterIds.push(user.email);
        }
        const uniqueRecruiterIds = [...new Set(recruiterIds.filter(Boolean))];
        const jobQuery = uniqueRecruiterIds.length > 1
            ? { recruiterId: { $in: uniqueRecruiterIds } }
            : { recruiterId: uniqueRecruiterIds[0] || recruiterId };

        const jobs = await Job.find(jobQuery).select('_id').lean();
        const jobIds = jobs.map((job) => job._id);

        const apps = await Application.find({ jobId: { $in: jobIds }, status: { $ne: 'SAVED' } })
            .select('-interviewAnswers -assessmentAnswers -recommendationSummary')
            .populate('jobId')
            .sort({ appliedAt: -1 })
            .lean();

        const userIdList = apps.map(app => app.userId).filter(Boolean);
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
            
            let jobId = null;
            if (examId && typeof examId === 'string') {
                const parts = examId.split(':');
                if (parts.length >= 2) {
                    jobId = parts[1];
                }
            }
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

        const appsWithScore = apps.map((app, index) => {
            const appJobId = app.jobId?._id?.toString() || app.jobId?.toString();
            const key = appJobId ? `${app.userId}_${appJobId}` : app.userId;
            app.proctoringScore = applicationPenaltyMap[key] !== undefined ? applicationPenaltyMap[key] : (applicationPenaltyMap[app.userId] || 0);
            
            const flags = applicationFlagsMap[key] || applicationFlagsMap[app.userId];
            app.proctoringFlags = flags ? Array.from(flags) : [];
            return app;
        });

        const sravyaApp = appsWithScore.find(app => app.userId === 'pMRFsfzPtMYEBz8aT73hj7nLZTM2' && app.jobId?._id?.toString() === '6a4b61ed5202c1627497779a');
        if (sravyaApp) {
            console.log("\n=== Sravya Frontend Developer App ===");
            console.log(`proctoringScore: ${sravyaApp.proctoringScore}`);
            console.log(`proctoringFlags:`, sravyaApp.proctoringFlags);
        } else {
            console.log("Sravya Frontend Developer App not found in apps list.");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
run();
