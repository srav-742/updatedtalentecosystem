require('dotenv').config();
const axios = require('axios');

async function listGeminiModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return;

    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        console.log("Available Gemini Models:");
        response.data.models.forEach(m => console.log(`- ${m.name}`));
    } catch (err) {
        console.error("Failed to list models:", err.response ? err.response.data : err.message);
    }
}

listGeminiModels();
