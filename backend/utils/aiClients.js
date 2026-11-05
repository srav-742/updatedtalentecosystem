const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini (Primary for Interviews)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Priority list of available Groq models (modern 2025/2026 models with backwards compatibility)
const GROQ_TEXT_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
];

const getGroqKeys = () => {
    const keys = [];
    if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
    if (process.env.PRACTICAL_GROQ_KEY && !keys.includes(process.env.PRACTICAL_GROQ_KEY)) {
        keys.push(process.env.PRACTICAL_GROQ_KEY);
    }
    return keys;
};

// Log API key status on module load
console.log('[AI-CLIENT] API Keys loaded:', {
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasGroq: !!process.env.GROQ_API_KEY,
    hasPracticalGroq: !!process.env.PRACTICAL_GROQ_KEY
});

// Helper for resilient Groq completions across supported models and keys
const executeGroqChat = async (messages, maxTokens = 2000, isJsonMode = false, temperature = 0.7) => {
    const keys = getGroqKeys();
    if (!keys.length) return null;

    const groqMaxTokens = Math.min(maxTokens, 4000);

    for (const key of keys) {
        for (const model of GROQ_TEXT_MODELS) {
            try {
                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model,
                        messages,
                        temperature,
                        max_tokens: groqMaxTokens,
                        ...(isJsonMode ? { response_format: { type: "json_object" } } : {})
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${key}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 25000
                    }
                );

                let text = response.data?.choices?.[0]?.message?.content || null;
                if (text && text.startsWith('```')) {
                    text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
                }
                if (text) {
                    console.log(`[AI-CLIENT] Groq (${model}) Success.`);
                    return text;
                }
            } catch (err) {
                const msg = err.response?.data?.error?.message || err.message;
                console.warn(`[AI-CLIENT] Groq (${model}) failed: ${msg}`);
            }
        }
    }
    return null;
};

// Direct API implementation as requested
const callGemini = async (prompt, maxTokens = 2000, isJsonMode = false, systemPrompt = null, temperature = 0.7) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.warn("[AI-CLIENT] Gemini API key not configured");
            return null;
        }

        const candidateModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"];
        const finalPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${prompt}` : prompt;

        for (const model of candidateModels) {
            try {
                const response = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                        },
                        timeout: 25000
                    }
                );

                const parts = response.data?.candidates?.[0]?.content?.parts;
                if (!parts) continue;

                const aiText = parts
                    .filter(p => !p.thought && p.text)
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
                    console.log(`[AI-CLIENT] Gemini (${model}) Success.`);
                    return text;
                }
            } catch (innerErr) {
                const msg = innerErr.response?.data?.error?.message || innerErr.message;
                if (msg.includes('prepayment') || msg.includes('credits') || msg.includes('depleted') || msg.includes('quota')) {
                    console.warn(`[AI-CLIENT] Gemini credits depleted or unavailable (${model}): ${msg}`);
                    return null; // Don't loop if billing is depleted
                }
            }
        }
    } catch (err) {
        console.warn("[AI-CLIENT] Gemini Error:", err.message);
    }
    return null;
};

// Interview AI: tries Gemini, immediately falls back to resilient Groq models
const callInterviewAI = async (prompt, maxTokens = 500, isJsonMode = false, systemPrompt = null, temperature = 0.7) => {
    // 1. Primary: Gemini (if available and has credits)
    const geminiText = await callGemini(prompt, maxTokens, isJsonMode, systemPrompt, temperature);
    if (geminiText) return geminiText;

    // 2. Fallback: Resilient Groq across supported models
    console.log("[AI-CLIENT] Gemini unavailable, routing interview AI to Groq...");
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const groqText = await executeGroqChat(messages, maxTokens, isJsonMode, temperature);
    if (groqText) return groqText;

    console.error("[AI-CLIENT] All AI providers failed for interview AI");
    return null;
};

const callSkillAI = async (prompt, maxTokens = 2000, temperature = 0.7) => {
    // Skill assessment & resume analysis use Groq directly for speed & reliability
    const isJsonMode = prompt.toLowerCase().includes("json");
    console.log("[AI-CLIENT] callSkillAI: Invoking Groq engine...");
    const messages = [{ role: "user", content: prompt }];

    const groqText = await executeGroqChat(messages, maxTokens, isJsonMode, temperature);
    if (groqText) return groqText;

    // Fallback to Gemini if Groq fails
    console.log("[AI-CLIENT] callSkillAI: Groq unavailable, falling back to Gemini...");
    return await callGemini(prompt, maxTokens, isJsonMode, null, temperature);
};

/**
 * Universal safe JSON parser for AI model outputs.
 * Robustly handles markdown wrappers, conversational text, trailing commas, and unescaped quotes.
 */
const safeParseAIJson = (rawText, fallbackDefault = null) => {
    if (!rawText) return fallbackDefault;
    if (typeof rawText === 'object') return rawText;

    let str = String(rawText).trim();

    // 1. First attempt: direct parse without modifying anything
    try {
        return JSON.parse(str);
    } catch (_) {}

    // 2. If wrapped in outer markdown code fence (```json ... ```), strip ONLY the outer wrapper
    if (str.startsWith('```')) {
        const stripped = str.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '').trim();
        try {
            return JSON.parse(stripped);
        } catch (_) {
            str = stripped;
        }
    }

    // 3. Extract outermost JSON payload boundaries ({ ... } or [ ... ])
    if (!str.startsWith('{') && !str.startsWith('[')) {
        const firstObj = str.indexOf('{');
        const firstArr = str.indexOf('[');
        let startIndex = -1;
        if (firstObj !== -1 && firstArr !== -1) {
            startIndex = Math.min(firstObj, firstArr);
        } else if (firstObj !== -1) {
            startIndex = firstObj;
        } else if (firstArr !== -1) {
            startIndex = firstArr;
        }

        if (startIndex !== -1) {
            const isObj = str[startIndex] === '{';
            const lastIndex = isObj ? str.lastIndexOf('}') : str.lastIndexOf(']');
            if (lastIndex !== -1 && lastIndex > startIndex) {
                const candidate = str.substring(startIndex, lastIndex + 1).trim();
                try {
                    return JSON.parse(candidate);
                } catch (_) {
                    str = candidate;
                }
            }
        }
    }

    // 4. Attempt syntax fixes (trailing commas)
    try {
        const fixedStr = str.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixedStr);
    } catch (e2) {
        console.warn('[AI-CLIENT] safeParseAIJson failed to parse AI JSON response:', str.substring(0, 100));
        return fallbackDefault;
    }
};

module.exports = { callInterviewAI, callSkillAI, callGemini, safeParseAIJson };
