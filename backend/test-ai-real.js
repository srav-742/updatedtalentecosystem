require('dotenv').config();
const { callSkillAI } = require('./utils/aiClients');

const prompt = `
You are an expert ATS (Applicant Tracking System) scanner.
Analyze the provided resume text against the job requirements...
(Simulated long prompt from user log)
`;

async function testRealPrompt() {
    console.log("Testing callSkillAI with a simulated long prompt...");
    try {
        const resp = await callSkillAI(prompt);
        console.log("Response:", resp ? resp.substring(0, 100) + "..." : "NULL");
    } catch (err) {
        console.error("Test Failed:", err.message);
    }
}

testRealPrompt();
