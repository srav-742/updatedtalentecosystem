const mongoose = require('mongoose');
require('dotenv').config();
const Application = require('./models/Application');

async function fixScores() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        const apps = await Application.find({ applicantEmail: 'tech1224domain@gmail.com' });
        console.log(`Found ${apps.length} applications for tech1224domain@gmail.com`);

        for (const app of apps) {
            console.log(`Current Application ID: ${app._id}`);
            console.log(`  resumeMatchPercent: ${app.resumeMatchPercent}`);
            console.log(`  assessmentScore: ${app.assessmentScore}`);
            console.log(`  interviewScore: ${app.interviewScore}`);
            console.log(`  finalScore: ${app.finalScore}`);
            console.log(`  interviewAnswers count: ${app.interviewAnswers ? app.interviewAnswers.length : 0}`);

            let dynInterview = app.interviewScore;
            if (app.interviewAnswers && app.interviewAnswers.length > 0) {
                const validMarks = app.interviewAnswers.filter(q => typeof q.marks === 'number' && !isNaN(q.marks));
                if (validMarks.length > 0) {
                    const totalMarks = validMarks.reduce((s, q) => s + q.marks, 0);
                    const maxPossible = app.interviewAnswers.length * 10;
                    if (maxPossible > 0) {
                        dynInterview = Math.round((totalMarks / maxPossible) * 70);
                    }
                }
            }

            const r = app.resumeMatchPercent || 0;
            const a = app.assessmentScore || 0;
            const i = dynInterview || 0;
            const correctFinalScore = r + a + i;

            console.log(`  Calculated Correct -> Interview: ${i}, Final Score: ${correctFinalScore}`);

            app.interviewScore = i;
            app.finalScore = correctFinalScore;
            await app.save();
            console.log(`  SUCCESS! Updated Application ${app._id} in MongoDB -> interviewScore: ${i}, finalScore: ${correctFinalScore}`);
        }

        process.exit(0);
    } catch (err) {
        console.error("Error fixing scores:", err);
        process.exit(1);
    }
}

fixScores();
