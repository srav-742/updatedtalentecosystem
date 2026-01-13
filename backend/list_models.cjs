const dotenv = require('dotenv');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config({ path: path.join(__dirname, '.env') });

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return console.log("No Key");

    // Using strict SDK call if possible, or manual fetch but SDK is easier
    // Note: The JS SDK doesn't expose listModels directly on the main class easily in all versions.
    // We will try to just run a simple generate on 'gemini-pro' which is the safest baseline.

    const genAI = new GoogleGenerativeAI(key);

    // Testing specific variants
    const models = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.0-pro"];

    for (const modelName of models) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.generateContent("Hi");
            console.log(`✅ ${modelName} is WORKING.`);
        } catch (e) {
            console.log(`❌ ${modelName} Failed: ${e.message}`);
        }
    }
}

listModels();
