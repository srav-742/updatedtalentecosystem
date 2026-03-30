const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const openai = require('../config/openai');

// Initialize Gemini (Fallback)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Log API key status on module load
console.log('[AI-CLIENT] API Keys loaded:', {
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasGroq: !!process.env.GROQ_API_KEY,
    hasOpenAI: !!process.env.OPENAI_API_KEY
});

// Direct API implementation as requested
const callGemini = async (prompt, maxTokens = 2000, isJsonMode = false, systemPrompt = null) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.warn("[AI-CLIENT] Gemini API key not configured");
            return null;
        }

        const MODEL = "gemini-flash-latest";
        console.log(`[AI-CLIENT] Attempting Gemini (${MODEL})...`);

        const finalPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${prompt}` : prompt;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: finalPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    responseMimeType: isJsonMode ? "application/json" : "text/plain"
                }
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        // Safely extract and combine all parts to prevent halving questions
        const aiText = response.data.candidates[0].content.parts
            .map(p => p.text)
            .join("");

        let text = aiText.trim();

        if (isJsonMode) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) text = jsonMatch[0];
        }
        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
        }

        if (text) {
            console.log(`[AI-CLIENT] Gemini (${MODEL}) Success.`);
            return text;
        }

    } catch (err) {
        console.warn("[AI-CLIENT] Gemini Error:", err.response?.data || err.message);
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
        if (!process.env.GROQ_API_KEY) {
            console.warn("[AI-CLIENT] Groq API key not configured, skipping fallback");
        } else {
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
            if (text) {
                console.log("[AI-CLIENT] Groq Success.");
                return text;
            }
        }
    } catch (groqErr) {
        console.error("[AI-CLIENT] Groq Error:", groqErr.response?.data || groqErr.message);
    }

    console.error("[AI-CLIENT] All AI providers failed");
    return null;
};

const callSkillAI = async (prompt, maxTokens = 8192) => {
    return await callInterviewAI(prompt, maxTokens, prompt.toLowerCase().includes("json"));
};

module.exports = { callInterviewAI, callSkillAI, callGemini };
