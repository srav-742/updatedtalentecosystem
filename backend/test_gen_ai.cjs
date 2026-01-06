const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config({ path: path.join(__dirname, '.env') });

async function testGemini() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Checking API Key...");
    if (!key) {
        console.error("ERROR: GEMINI_API_KEY is missing in .env");
        return;
    }
    console.log("API Key found (length):", key.length);

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        console.log("Sending request to Gemini...");
        const result = await model.generateContent("Explain 'Hello World' in 1 sentence.");
        const text = result.response.text();
        console.log("SUCCESS. Response:", text);
    } catch (error) {
        console.error("FAILURE. Gemini API Error:", error.message);
        if (error.message.includes("404")) {
            console.error("Hint: Model not found or API endpoint issue.");
        }
        if (error.message.includes("403") || error.message.includes("API key")) {
            console.error("Hint: Invalid API Key.");
        }
    }
}

testGemini();
