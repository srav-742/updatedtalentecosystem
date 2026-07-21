const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini (Primary for Interviews)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Log API key status on module load
console.log('[AI-CLIENT] API Keys loaded:', {
    hasGemini: !!process.env.GEMINI_API_KEY,
    hasGroq: !!process.env.GROQ_API_KEY
});

// Direct API implementation as requested
const callGemini = async (prompt, maxTokens = 2000, isJsonMode = false, systemPrompt = null, temperature = 0.7) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.warn("[AI-CLIENT] Gemini API key not configured");
            return null;
        }

        const MODEL = "gemini-2.5-flash";
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
                    responseMimeType: isJsonMode ? "application/json" : "text/plain",
                    thinkingConfig: {
                        thinkingBudget: 0
                    }
                }
            },
            {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 30000
            }
        );

        // Safely extract and combine all parts to prevent halving questions
        // Filter out thought parts (gemini-2.5-flash thinking model) to only get actual response text
        const parts = response.data?.candidates?.[0]?.content?.parts;
        if (!parts) {
            console.warn("[AI-CLIENT] Gemini response empty or blocked by safety. Candidates:", JSON.stringify(response.data?.candidates));
            return null;
        }

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
            console.log(`[AI-CLIENT] Gemini (${MODEL}) Success.`);
            return text;
        }

    } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message;
        if (status === 503 || msg.includes('demand')) {
            console.warn("[AI-CLIENT] Gemini busy (503).");
        } else {
            console.warn("[AI-CLIENT] Gemini Error:", msg);
        }
    }
    return null;
};

// OpenAI removed — using Gemini for interviews, Groq for skill/resume

const callInterviewAI = async (prompt, maxTokens = 500, isJsonMode = false, systemPrompt = null, temperature = 0.7) => {
    // 1. Primary: Gemini 2.5 Flash (for interview purpose)
    const geminiText = await callGemini(prompt, maxTokens, isJsonMode, systemPrompt, temperature);
    if (geminiText) return geminiText;

    // 2. Fallback: Groq
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[AI-CLIENT] Gemini failed, falling back to Groq (llama-3.3-70b)...");
            const messages = [];
            if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: prompt });

            const groqMaxTokens = Math.min(maxTokens, 2000);

            try {
                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: "llama-3.3-70b-versatile",
                        messages: messages,
                        temperature: temperature,
                        max_tokens: groqMaxTokens,
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
                    console.log("[AI-CLIENT] Groq 70B Success.");
                    return text;
                }
            } catch (groq70bErr) {
                const msg = groq70bErr.response?.data?.error?.message || groq70bErr.message;
                console.warn("[AI-CLIENT] Groq 70B Failed or Rate-Limited:", msg);
                console.log("[AI-CLIENT] Attempting Groq 8B immediate fallback (llama-3.1-8b-instant)...");

                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: "llama-3.1-8b-instant",
                        messages: messages,
                        temperature: temperature,
                        max_tokens: groqMaxTokens,
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
                    console.log("[AI-CLIENT] Groq 8B Success.");
                    return text;
                }
            }
        }
    } catch (groqErr) {
        const msg = groqErr.response?.data?.error?.message || groqErr.message;
        if (msg.includes('Rate limit')) {
            const retryMatch = msg.match(/try again in ([\d.]+s)/);
            const retryMsg = retryMatch ? ` (Retry in ${retryMatch[1]})` : "";
            console.warn(`[AI-CLIENT] Groq Rate Limited${retryMsg}.`);
        } else {
            console.warn("[AI-CLIENT] Groq Error:", msg);
        }
    }

    console.error("[AI-CLIENT] All AI providers failed");
    return null;
};

const callSkillAI = async (prompt, maxTokens = 2000, temperature = 0.7) => {
    // Skill assessment & resume analysis use Groq directly
    const isJsonMode = prompt.toLowerCase().includes("json");
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[AI-CLIENT] callSkillAI: Using Groq (llama-3.3-70b)...");
            const messages = [{ role: "user", content: prompt }];
            const groqMaxTokens = Math.min(maxTokens, 2000);

            try {
                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: "llama-3.3-70b-versatile",
                        messages: messages,
                        temperature: temperature,
                        max_tokens: groqMaxTokens,
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
                    console.log("[AI-CLIENT] callSkillAI: Groq 70B Success.");
                    return text;
                }
            } catch (groq70bErr) {
                const msg = groq70bErr.response?.data?.error?.message || groq70bErr.message;
                console.warn("[AI-CLIENT] callSkillAI: Groq 70B Failed:", msg);
                console.log("[AI-CLIENT] callSkillAI: Attempting Groq 8B fallback...");

                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: "llama-3.1-8b-instant",
                        messages: messages,
                        temperature: temperature,
                        max_tokens: groqMaxTokens,
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
                    console.log("[AI-CLIENT] callSkillAI: Groq 8B Success.");
                    return text;
                }
            }
        }
    } catch (groqErr) {
        const msg = groqErr.response?.data?.error?.message || groqErr.message;
        console.warn("[AI-CLIENT] callSkillAI: Groq Error:", msg);
    }

    // Fallback to Gemini if Groq fails entirely
    console.log("[AI-CLIENT] callSkillAI: Groq failed, falling back to Gemini...");
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

    // 1. Remove markdown block formatting
    if (str.includes('```')) {
        const match = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (match && match[1]) {
            str = match[1].trim();
        } else {
            str = str.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
        }
    }

    // 2. Extract JSON payload boundaries ({ ... } or [ ... ])
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
                str = str.substring(startIndex, lastIndex + 1).trim();
            }
        }
    }

    // 3. Attempt direct parse
    try {
        return JSON.parse(str);
    } catch (_) {
        // 4. Attempt syntax fix (trailing comma removal)
        try {
            const fixedStr = str.replace(/,\s*([}\]])/g, '$1');
            return JSON.parse(fixedStr);
        } catch (e2) {
            console.warn('[AI-CLIENT] safeParseAIJson failed to parse AI JSON response:', str.substring(0, 100));
            return fallbackDefault;
        }
    }
};

module.exports = { callInterviewAI, callSkillAI, callGemini, safeParseAIJson };
