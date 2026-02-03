const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const openai = require('../config/openai');

// Initialize Gemini (Fallback)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * AI Client for Interview Question Generation.
 * Prioritizes Gemini 2.5 Flash.
 * Fallbacks to OpenRouter, OpenAI, and Groq.
 */
const callInterviewAI = async (prompt, maxTokens = 500, isJsonMode = false, systemPrompt = null) => {
    // 🎯 Primary Attempt: Gemini
    try {
        if (process.env.GEMINI_API_KEY) {
            console.log("[AI-INTERVIEW] Using Primary Provider: Gemini (gemini-2.5-flash)");
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: isJsonMode ? "application/json" : "text/plain",
                }
            });

            const finalPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${prompt}` : prompt;
            const result = await model.generateContent(finalPrompt);
            const text = (await result.response).text().trim();
            if (text) return text;
        }
    } catch (geminiErr) {
        console.warn("[AI-CLIENT] Gemini failed, falling back to OpenRouter:", geminiErr.message);
    }

    // 🎯 Secondary Attempt: OpenRouter
    try {
        if (process.env.OPENROUTER_API_KEY) {
            console.log("[AI-INTERVIEW] Using Secondary Provider: OpenRouter (Llama-3-70B)");
            const messages = [];
            if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: prompt });

            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: "meta-llama/llama-3-70b-instruct",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: maxTokens,
                    ...(isJsonMode ? { response_format: { type: "json_object" } } : {})
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const text = response.data?.choices?.[0]?.message?.content?.trim();
            if (text) return text;
        }
    } catch (openRouterErr) {
        console.warn("[AI-CLIENT] OpenRouter failed, falling back to OpenAI:", openRouterErr.message);
    }

    // 🎯 Tertiary Attempt: OpenAI
    try {
        if (process.env.OPENAI_API_KEY) {
            console.log("[AI-INTERVIEW] Using Tertiary Provider: OpenAI (gpt-4o-mini)");
            const messages = [];
            if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: prompt });

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                temperature: 0.7,
                max_tokens: maxTokens,
                response_format: isJsonMode ? { type: "json_object" } : { type: "text" }
            });
            const text = response.choices[0].message.content.trim();
            if (text) return text;
        }
    } catch (openAiErr) {
        console.warn("[AI-CLIENT] OpenAI failed, falling back to Groq:", openAiErr.message);
    }

    // 🎯 Quaternary Attempt: Groq
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[AI-INTERVIEW] Using Quaternary Provider: Groq (llama-3.3-70b)");
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
            return response.data?.choices?.[0]?.message?.content || null;
        }
    } catch (groqErr) {
        console.error("[AI-CLIENT] All AI providers failed.");
    }

    return null;
};

/**
 * Direct call to Groq API.
 * Preferred for high-speed MCQs and Resume Parsing.
 */
const callGroq = async (prompt, maxTokens = 2000) => {
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[SKILL-ASSESSMENT] Using Provider: Groq (llama-3.3-70b)");
            const isJson = prompt.toLowerCase().includes("json");

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5,
                    max_tokens: maxTokens,
                    ...(isJson ? { response_format: { type: "json_object" } } : {})
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data?.choices?.[0]?.message?.content || null;
        }
    } catch (error) {
        console.error("[GROQ-DIRECT-ERROR]:", error.message);
        return null;
    }
    return null;
};

module.exports = { callInterviewAI, callGroq };
