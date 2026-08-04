const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const ProctoringReport = require('./models/ProctoringReport');

async function test() {
    try {
        await connectDB();
        console.log("Connected to DB.");
        
        // Query the reports
        const reports = await ProctoringReport.find({}).lean();
        console.log("All Proctoring Reports:", JSON.stringify(reports, null, 2));
        
        await mongoose.disconnect();
        console.log("DB Connection closed.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
