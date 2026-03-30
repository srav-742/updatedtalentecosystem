const Application = require('../models/Application');
const mongoose = require('mongoose');


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

        // Calculate Final Score dynamically based on Job settings
        const r = application.resumeMatchPercent || 0;
        const a = application.assessmentScore || 0;
        const i = application.interviewScore || 0;

        let totalScore = 0;
        let numModules = 0;
        const job = application.jobId;

        if (job) {
            if (job.resumeAnalysis && job.resumeAnalysis.enabled) {
                totalScore += r;
                numModules++;
            }
            if (job.assessment && job.assessment.enabled) {
                totalScore += a;
                numModules++;
            }
            if (job.mockInterview && job.mockInterview.enabled) {
                totalScore += i;
                numModules++;
            }
        }

        // Fallback if no modules enabled logically
        if (numModules === 0) {
            totalScore = r + a + i;
            numModules = 3;
        }

        const finalScore = Math.round(totalScore / numModules);
        application.finalScore = finalScore;
        await application.save();

        if (application.finalScore >= 60) {
            console.log(`[LEDGER] Elite Candidate Detected: ${userId} (Score: ${application.finalScore})`);
            const recruiterId = application.jobId?.recruiterId;
            /*
            if (recruiterId) {
                console.log(`[LEDGER] Crediting Recruiter ${recruiterId} for Elite find.`);
                await addCoins(recruiterId, 100, `Elite Find Bonus: Candidate ${application.applicantName}`);
            }
            */
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
