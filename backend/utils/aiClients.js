const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const openai = require('../config/openai');

// Initialize Gemini (Fallback)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const callGemini = async (prompt, maxTokens = 2000, isJsonMode = false, systemPrompt = null) => {
    try {
        if (process.env.GEMINI_API_KEY) {
            console.log("[AI-CLIENT] Using Gemini (gemini-2.5-flash)");
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: isJsonMode ? "application/json" : "text/plain",
                    maxOutputTokens: maxTokens,
                }
            });

            const finalPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${prompt}` : prompt;
            const result = await model.generateContent(finalPrompt);
            let text = (await result.response).text().trim();

            // ✅ Clean markdown code blocks if present
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
 * AI Client for Interview Question Generation.
 * Prioritizes Gemini 2.5 Flash.
 * Fallbacks to OpenRouter, OpenAI, and Groq.
 */
const callInterviewAI = async (prompt, maxTokens = 500, isJsonMode = false, systemPrompt = null) => {
    // 🎯 Primary Attempt: Gemini
    const geminiText = await callGemini(prompt, maxTokens, isJsonMode, systemPrompt);
    if (geminiText) return geminiText;

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
 * Direct call for Skill Assessments.
 * Prioritizes Gemini, Fallbacks to Groq.
 */
const callSkillAI = async (prompt, maxTokens = 2000) => {
    // Try Gemini First
    const isJson = prompt.toLowerCase().includes("json");
    const geminiText = await callGemini(prompt, maxTokens, isJson);
    if (geminiText) return geminiText;

    // Fallback to Groq
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[SKILL-ASSESSMENT] Using Fallback Provider: Groq (llama-3.3-70b)");
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

            let text = response.data?.choices?.[0]?.message?.content || null;

            // ✅ Clean markdown code blocks if present
            if (text && text.startsWith('```')) {
                text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
            }

            return text;
        }
    } catch (error) {
        console.error("[GROQ-DIRECT-ERROR]:", error.message);
        return null;
    }
    return null;
};

module.exports = { callInterviewAI, callSkillAI, callGemini };

