const mongoose = require('mongoose');
require('dotenv').config();

async function findMissingAnswers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const Application = mongoose.model('Application', new mongoose.Schema({
            applicantName: String,
            interviewAnswers: Array,
            recordingUrl: String,
            interviewScore: Number
        }));

        const missing = await Application.find({
            'interviewAnswers.0': { $exists: true },
            'interviewAnswers.answer': { $in: ["", null, "Thank you.", "E aí"] }
        }).limit(10);

        console.log(`Found ${missing.length} applications with potential missing text:`);
        missing.forEach(app => {
            console.log(`- ${app.applicantName} (${app._id}) | Answers: ${app.interviewAnswers.length} | Recording: ${app.recordingUrl ? 'YES' : 'NO'}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

findMissingAnswers();
