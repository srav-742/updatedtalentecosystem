const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

/**
 * Service for Speech-to-Text using Groq Whisper Large v3 (primary)
 * with ElevenLabs Scribe v2 as fallback.
 * 
 * Supports automatic language detection for multilingual candidates.
 */
const transcribeAudio = async (filePath) => {
    // ── Attempt 1: Groq Whisper Large v3 (fast + accurate) ──
    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            console.log("[WHISPER-SERVICE] Attempting Groq Whisper Large v3...");
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('model', 'whisper-large-v3');
            // Whisper auto-detects language natively

            const response = await axios.post(
                'https://api.groq.com/openai/v1/audio/transcriptions',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${groqKey}`,
                    },
                    timeout: 30000
                }
            );

            const transcript = response.data.text?.trim() || "";
            if (transcript && transcript.length > 1) {
                console.log(`[WHISPER-SERVICE] ✓ Groq Whisper success | Length: ${transcript.length}`);
                return transcript;
            }
            console.warn("[WHISPER-SERVICE] Groq Whisper returned empty transcript, trying fallback...");
        }
    } catch (error) {
        console.error("[WHISPER-SERVICE-GROQ ERROR]:", error.response?.data || error.message);
    }

    // ── Attempt 2: ElevenLabs Scribe v2 (fallback — multilingual) ──
    try {
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        if (elevenLabsKey) {
            console.log("[WHISPER-SERVICE] Attempting ElevenLabs Scribe v2 fallback...");
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('model_id', 'scribe_v2');
            formData.append('language_code', 'auto');

            const response = await axios.post(
                'https://api.elevenlabs.io/v1/speech-to-text',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'xi-api-key': elevenLabsKey
                    },
                    timeout: 30000
                }
            );

            const transcript = response.data.text?.trim() || "";
            if (transcript && transcript.length > 1) {
                console.log(`[WHISPER-SERVICE] ✓ ElevenLabs Scribe fallback success | Length: ${transcript.length}`);
                return transcript;
            }
        }
    } catch (error) {
        console.error("[WHISPER-SERVICE-ELEVENLABS ERROR]:", error.response?.data ? JSON.stringify(error.response.data) : error.message);
    }

    // ── All providers failed ──
    console.error("[WHISPER-SERVICE] All STT providers failed.");
    throw new Error("All speech-to-text providers failed to transcribe the audio.");
};

module.exports = { transcribeAudio };
