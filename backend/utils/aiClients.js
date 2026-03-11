const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const openai = require('../config/openai');

// Initialize Gemini (Fallback)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const callGemini = async (prompt, maxTokens = 2000, isJsonMode = false, systemPrompt = null) => {
    try {
        if (process.env.GEMINI_API_KEY) {
            const modelName = "gemini-1.5-flash";
            console.log(`[AI-CLIENT] Attempting Gemini (${modelName})...`);

            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: isJsonMode ? "application/json" : "text/plain",
                    maxOutputTokens: maxTokens,
                },
                // Skip safety filters to prevent "blocked" responses for resume analysis
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            });

            const finalPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${prompt}` : prompt;
            const result = await model.generateContent(finalPrompt);
            const response = await result.response;

            let text = response.text().trim();

            if (isJsonMode) {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) text = jsonMatch[0];
            }

            if (text.startsWith('```')) {
                text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
            }

            if (text) return text;
        }
    } catch (err) {
        console.warn("[AI-CLIENT] Gemini Error:", err.message);
    }
    return null;
};

/**
 * AI Client for Interview & Skill Analysis.
 * Prioritizes Gemini, Fallbacks to Groq.
 */
const callInterviewAI = async (prompt, maxTokens = 500, isJsonMode = false, systemPrompt = null) => {
    // 1. Try Gemini
    const geminiText = await callGemini(prompt, maxTokens, isJsonMode, systemPrompt);
    if (geminiText) return geminiText;

    // 2. Fallback to Groq
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[AI-CLIENT] Falling back to Groq (llama-3.3-70b)...");
            const messages = [];
            if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: prompt });

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.3-70b-versatile",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: maxTokens,
                    ...(isJsonMode ? { response_format: { type: "json_object" } } : {})
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            let text = response.data?.choices?.[0]?.message?.content || null;
            if (text && text.startsWith('```')) {
                text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
            }
            return text;
        }
    } catch (groqErr) {
        console.error("[AI-CLIENT] All providers failed:", groqErr.message);
    }

    return null;
};

const callSkillAI = async (prompt, maxTokens = 2000) => {
    return await callInterviewAI(prompt, maxTokens, prompt.toLowerCase().includes("json"));
};

module.exports = { callInterviewAI, callSkillAI, callGemini };
