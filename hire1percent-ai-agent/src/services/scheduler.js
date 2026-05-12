const cron = require("node-cron");
const Candidate = require("../models/Candidate");
const getCandidateStatus = require("./candidateTracker");
const generateFollowupMessage = require("./aiAnalyzer");
const speakMessage = require("./voiceService");

// Schedule task to run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
    console.log("--- Scheduled Inactivity Check Started ---");
    try {
        const candidates = await Candidate.find();
        
        for (const candidate of candidates) {
            const status = getCandidateStatus(candidate);
            
            if (status === "Candidate inactive for more than 24 hours") {
                console.log(`Inactivity detected for: ${candidate.name}`);
                
                const message = await generateFollowupMessage(candidate, status);
                speakMessage(message);
            }
        }
        console.log("--- Scheduled Check Completed ---");
    } catch (error) {
        console.error("Scheduler Error:", error);
    }
});