const Application = require('../models/Application');
const mongoose = require('mongoose');
const { addCoins } = require('../services/coinService');

const submitApplication = async (req, res) => {
    try {
        const { jobId, userId, applicantName, applicantEmail, applicantPic, ...updateData } = req.body;
        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid or Missing Job ID" });
        }
        const query = { jobId: new mongoose.Types.ObjectId(jobId), userId: userId };
        const update = {
            ...updateData,
            ...query,
            applicantName,
            applicantEmail,
            applicantPic
        };
        if (!updateData.interviewAnswers || updateData.interviewAnswers.length === 0) {
            delete update.interviewAnswers;
        }
        const application = await Application.findOneAndUpdate(query, update, { new: true, upsert: true }).populate('jobId');

        // Calculate Final Score
        const r = application.resumeMatchPercent || 0;
        const a = application.assessmentScore || 0;
        const i = application.interviewScore || 0;

        // Equal weighting: (Resume + Assessment + Interview) / 3
        const finalScore = Math.round((r + a + i) / 3);
        application.finalScore = finalScore;
        await application.save();

        if (application.finalScore >= 60) {
            console.log(`[LEDGER] Elite Candidate Detected: ${userId} (Score: ${application.finalScore})`);
            const recruiterId = application.jobId?.recruiterId;
            if (recruiterId) {
                console.log(`[LEDGER] Crediting Recruiter ${recruiterId} for Elite find.`);
                await addCoins(recruiterId, 100, `Elite Find Bonus: Candidate ${application.applicantName}`);
            }
            application.status = 'SHORTLISTED';
            await application.save();
        }
        res.status(201).json(application);
    } catch (error) {
        console.error("[LEDGER-FINAL] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getSeekerApplications = async (req, res) => {
    try {
        const apps = await Application.find({ userId: req.params.userId }).populate('jobId').sort({ createdAt: -1 });
        const validApps = apps.filter(app => app.jobId);
        res.json(validApps);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const app = await Application.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(app);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { submitApplication, getSeekerApplications, updateApplicationStatus };
