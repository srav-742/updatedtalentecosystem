const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function showAllModels() {
    const key = process.env.GEMINI_API_KEY_FLASH || process.env.GEMINI_API_KEY;
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        console.log(response.data.models.map(m => m.name).join("\n"));
    } catch (err) {
        console.error(err.message);
    }
}
showAllModels();
