require('dotenv').config();
const { callSkillAI } = require('./utils/aiClients');

async function testSkillAI() {
    console.log("--- Testing callSkillAI (with Fallbacks) ---");
    try {
        const text = await callSkillAI("Say hello. Return JSON: {\"message\": \"hello\"}");
        console.log("Final Result:", text);
    } catch (err) {
        console.error("Critical Error:", err.message);
    }
}

testSkillAI();
