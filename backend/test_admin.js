require('dotenv').config();
const connectDB = require('./config/db');
const Application = require('./models/Application');

async function check() {
    await connectDB();
    const app = await Application.findById('69ff66b4d3b0387884a4ce09');
    console.log('Application for Piyush Anand:', {
        resumeMatchPercent: app?.resumeMatchPercent,
        assessmentScore: app?.assessmentScore,
        interviewScore: app?.interviewScore,
        finalScore: app?.finalScore,
        status: app?.status
    });
    process.exit(0);
}
check();
