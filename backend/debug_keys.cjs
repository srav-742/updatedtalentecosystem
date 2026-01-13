const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkKeys() {
    console.log("Checking GEMINI_API_KEY...");
    if (!process.env.GEMINI_API_KEY) {
        console.log("GEMINI_API_KEY is missing!");
    } else {
        console.log("GEMINI_API_KEY is present (starts with " + process.env.GEMINI_API_KEY.substring(0, 4) + ")");
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("test");
            console.log("GEMINI_API_KEY is WORKING!");
        } catch (e) {
            console.log("GEMINI_API_KEY FAILED: " + e.message);
        }
    }

    console.log("\nChecking DEEPSEEK_API_KEY...");
    if (!process.env.DEEPSEEK_API_KEY) {
        console.log("DEEPSEEK_API_KEY is missing!");
    } else {
        console.log("DEEPSEEK_API_KEY is present (starts with " + process.env.DEEPSEEK_API_KEY.substring(0, 4) + ")");
        try {
            const response = await fetch("https://api.deepseek.com/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        { role: "system", content: "test" },
                        { role: "user", content: "hi" }
                    ],
                    max_tokens: 5
                })
            });
            if (response.ok) {
                console.log("DEEPSEEK_API_KEY is WORKING!");
            } else {
                const text = await response.text();
                console.log("DEEPSEEK_API_KEY FAILED: " + response.status + " " + text);
            }
        } catch (e) {
            console.log("DEEPSEEK_API_KEY FAILED: " + e.message);
        }
    }
}

checkKeys();
