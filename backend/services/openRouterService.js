// services/openRouterService.js
const axios = require('axios');
require('dotenv').config();

const callOpenRouter = async (prompt, maxTokens = 500) => {
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions', // ✅ NO TRAILING SPACES
            {
                model: "meta-llama/llama-3-70b-instruct",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: maxTokens
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NODE_ENV === 'production'
                        ? 'https://yourdomain.com' // ✅ NO TRAILING SPACES
                        : 'http://localhost:5173',
                    'X-Title': 'TalentEcoSystem'
                }
            }
        );
        return response.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
        console.error("[OPENROUTER ERROR]:", error.response?.data || error.message);
        throw new Error("OpenRouter service unavailable");
    }
};

module.exports = { callOpenRouter };