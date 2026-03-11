require('dotenv').config();
const { callInterviewAI, callSkillAI } = require('./utils/aiClients');

async function test() {
    console.log("Testing AI Clients...");
    console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log("GROQ_API_KEY exists:", !!process.env.GROQ_API_KEY);

    try {
        console.log("\n--- Testing callSkillAI (Resume Analysis Simulator) ---");
        const resp = await callSkillAI("Say hello in JSON format: {\"message\": \"hello\"}");
        console.log("Response:", resp);
    } catch (err) {
        console.error("callSkillAI failed:", err.message);
    }

    try {
        console.log("\n--- Testing callInterviewAI ---");
        const resp2 = await callInterviewAI("Say hello");
        console.log("Response:", resp2);
    } catch (err) {
        console.error("callInterviewAI failed:", err.message);
    }
}

test();
