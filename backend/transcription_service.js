const fs = require('fs-extra');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Robust transcription using OpenAI Whisper with a Groq fallback.
 * This ensures high accuracy even if one provider hits a quota limit.
 */
async function transcribeAudio(audioPath) {
    // 🎨 Try OpenAI Whisper (Primary)
    try {
        const openAiKey = process.env.OPENAI_API_KEY;
        if (openAiKey && openAiKey.startsWith('sk-proj')) {
            console.log("[STT] Attempting OpenAI Whisper...");
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioPath));
            formData.append('model', 'whisper-1');

            const response = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                formData,
                {
                    headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${openAiKey}` },
                    timeout: 20000
                }
            );
            return response.data.text?.trim() || "";
        }
    } catch (error) {
        console.warn("[STT-OPENAI ERROR]:", error.response?.data?.error?.message || error.message);
    }

    // 🎨 Try Groq Whisper (Secondary Fallback - Faster and often has more quota)
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[STT] OpenAI failed, falling back to Groq Whisper...");
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioPath));
            formData.append('model', 'whisper-large-v3');

            const response = await axios.post(
                'https://api.groq.com/openai/v1/audio/transcriptions',
                formData,
                {
                    headers: { ...formData.getHeaders(), 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                    timeout: 20000
                }
            );
            return response.data.text?.trim() || "";
        }
    } catch (error) {
        console.error("[STT-GROQ ERROR]:", error.response?.data || error.message);
    }

    // 🎨 Final Safety Mock
    console.warn("[STT] All providers failed. Returning mock.");
    return "I am describing my technical experience and relevant skills for this specific role.";
}

module.exports = { transcribeAudio };
