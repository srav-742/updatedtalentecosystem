require('dotenv').config({ path: 'c:/Users/sravy/OneDrive/Desktop/Talent ecosystem/backend/.env' });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Application = require('./models/Application');
const ProctoringViolation = require('./models/ProctoringViolation');
const ProctoringViolationEnhanced = require('./models/ProctoringViolationEnhanced');
const { getViolationRating } = require('./utils/proctoringScoring');

async function run() {
    try {
        await connectDB();
        console.log("Connected to DB.");

        const apps = await Application.find({}).lean();
        console.log(`Found ${apps.length} applications.`);

        const userPenaltyMap = {};
        const baseViolations = await ProctoringViolation.find({}).lean();
        const enhancedViolations = await ProctoringViolationEnhanced.find({}).lean();

        const addRating = (userId, type, metadata) => {
            if (!userId) return;
            const rating = getViolationRating(type, metadata);
            userPenaltyMap[userId] = (userPenaltyMap[userId] || 0) + rating;
        };

        baseViolations.forEach(v => addRating(v.userId, v.type, v.metadata));
        enhancedViolations.forEach(v => addRating(v.userId, v.type, v.metadata));

        apps.forEach(app => {
            const score = userPenaltyMap[app.userId] || 0;
            if (score > 0 || app.applicantName.includes("Sravya")) {
                console.log(`Candidate: ${app.applicantName}, userId: ${app.userId}, jobId: ${app.jobId}, proctoringScore: ${score}`);
            }
        });

        await mongoose.disconnect();
        console.log("DB Connection closed.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
