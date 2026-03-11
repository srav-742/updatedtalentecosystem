require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function diagnoseGemini() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Checking API Key:", key ? (key.substring(0, 8) + "...") : "MISSING");

    if (!key) return;

    const genAI = new GoogleGenerativeAI(key);

    const modelsToTry = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro"
    ];

    for (const modelName of modelsToTry) {
        console.log(`\n--- Trying model: ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Respond with 'OK'");
            const response = await result.response;
            console.log(`Success with ${modelName}:`, response.text());
        } catch (err) {
            console.error(`Error with ${modelName}:`, err.message);
        }
    }
}

diagnoseGemini();
