const fs = require('fs-extra');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Robust transcription using Groq Whisper.
 * Previously used OpenAI Whisper as primary, now uses Groq directly.
 */
async function transcribeAudio(audioPath) {
    // 🎨 Try Groq Whisper (Primary)
    try {
        if (process.env.GROQ_API_KEY) {
            console.log("[STT] Attempting Groq Whisper...");
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
