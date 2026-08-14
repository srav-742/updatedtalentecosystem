require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const ProctoringReport = require('./models/ProctoringReport');

async function run() {
    try {
        await connectDB();
        
        console.log("=== Proctoring Reports for Sravya ===");
        const reports = await ProctoringReport.find({ userId: 'pMRFsfzPtMYEBz8aT73hj7nLZTM2' }).lean();
        reports.forEach(r => {
            console.log(`Report ID: ${r._id}`);
            console.log(`  - examId: ${r.examId}`);
            console.log(`  - applicationId: ${r.applicationId}`);
            console.log(`  - totalViolations: ${r.totalViolations}`);
            console.log(`  - totalPenaltyRating: ${r.totalPenaltyRating}`);
            console.log(`  - status: ${r.status}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
run();
