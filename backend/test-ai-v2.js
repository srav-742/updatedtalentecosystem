require('dotenv').config();
const { callGemini, callSkillAI } = require('./utils/aiClients');
const axios = require('axios');

async function testKeys() {
    console.log("DEBUG: GEMINI_API_KEY =", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
    console.log("DEBUG: GROQ_API_KEY =", process.env.GROQ_API_KEY ? "EXISTS" : "MISSING");

    console.log("\n--- Testing Gemini Directly ---");
    try {
        const text = await callGemini("Hello, are you working?");
        console.log("Gemini Response:", text);
    } catch (err) {
        console.error("Gemini Direct Error:", err.message);
    }

    console.log("\n--- Testing Groq Directly ---");
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log("Groq Response:", response.data.choices[0].message.content);
    } catch (err) {
        console.error("Groq Direct Error:", err.response ? JSON.stringify(err.response.data) : err.message);
    }
}

testKeys();
