const mongoose = require("mongoose");
require("dotenv").config();

async function checkLogs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ConversationLog = mongoose.model("ConversationLog", new mongoose.Schema({}, { strict: false }), "conversation_logs");
        const count = await ConversationLog.countDocuments();
        console.log(`Total logs in conversation_logs: ${count}`);
        
        const latest = await ConversationLog.find().sort({ timestamp: -1 }).limit(5);
        console.log("Latest logs:");
        console.log(JSON.stringify(latest, null, 2));
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkLogs();
