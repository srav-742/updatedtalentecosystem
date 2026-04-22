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
const callGemini = async (prompt, maxTokens = 2000, isJsonMode = false, systemPrompt = null, temperature = 0.7) => {
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
                    temperature: temperature,
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
            const jsonMatch = text.match(/[\{\[][\s\S]*[\}\]]/);
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

const callOpenAI = async (prompt, maxTokens = 2000, isJsonMode = false, systemPrompt = null, temperature = 0.9) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("[AI-CLIENT] OpenAI API key not configured");
            return null;
        }

        console.log(`[AI-CLIENT] Attempting OpenAI (gpt-4o-mini)...`);
        
        const messages = [];
        if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: prompt });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            // If the prompt asks for a JSON array, we don't use json_object mode as it requires a specific schema or object root
            ...(isJsonMode && !prompt.toLowerCase().includes("array") ? { response_format: { type: "json_object" } } : {})
        });

        let text = response.choices[0].message.content;
        if (text) {
            console.log("[AI-CLIENT] OpenAI Success.");
            return text.trim();
        }
    } catch (err) {
        console.warn("[AI-CLIENT] OpenAI Error:", err.message);
    }
    return null;
};

const callInterviewAI = async (prompt, maxTokens = 500, isJsonMode = false, systemPrompt = null, temperature = 0.7) => {
    // 1. Try Groq (Primary for stability & no quota issues)
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[AI-CLIENT] Attempting Groq (llama-3.3-70b)...");
            const messages = [];
            if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: prompt });

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.3-70b-versatile",
                    messages: messages,
                    temperature: temperature,
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
        console.warn("[AI-CLIENT] Groq Error:", groqErr.response?.data || groqErr.message);
    }

    // 2. Fallback to OpenAI
    const openAiText = await callOpenAI(prompt, maxTokens, isJsonMode, systemPrompt, temperature);
    if (openAiText) return openAiText;

    // 3. Fallback to Gemini
    const geminiText = await callGemini(prompt, maxTokens, isJsonMode, systemPrompt, temperature);
    if (geminiText) return geminiText;

    console.error("[AI-CLIENT] All AI providers failed");
    return null;
};

const callSkillAI = async (prompt, maxTokens = 8192, temperature = 0.7) => {
    return await callInterviewAI(prompt, maxTokens, prompt.toLowerCase().includes("json"), null, temperature);
};

module.exports = { callInterviewAI, callSkillAI, callGemini };
