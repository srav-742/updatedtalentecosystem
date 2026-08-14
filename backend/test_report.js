const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { updateProctoringReport } = require('./controllers/proctoringControllerEnhanced');

async function test() {
    try {
        await connectDB();
        console.log("Connected to DB.");
        
        // Test creating a report for a specific exam
        const result = await updateProctoringReport("exam:123:456", "user123");
        console.log("Report created/updated:", result);
        
        await mongoose.disconnect();
        console.log("DB Connection closed.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
test();
