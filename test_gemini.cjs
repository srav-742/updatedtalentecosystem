const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: 'backend/.env' });

async function list() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.5-pro-latest", "gemini-pro", "gemini-flash-latest"];

        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("test");
                console.log(`Model ${m} works!`);
            } catch (e) {
                console.log(`Model ${m} FAILED: ${e.message}`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}
list();
