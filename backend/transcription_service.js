const fs = require('fs-extra');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Robust multilingual transcription using ElevenLabs Speech-to-Text (Scribe v2).
 * 
 * Improvements:
 *   - Automatic language detection for foreign language support
 *   - Groq Whisper fallback if ElevenLabs fails
 *   - Better error handling and logging
 *   - Support for multiple audio formats
 */
async function transcribeAudio(audioPath) {
    // ── Attempt 1: ElevenLabs Scribe v2 (Primary — best multilingual support) ──
    try {
        const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
        if (elevenLabsKey) {
            console.log("[STT] Attempting ElevenLabs Scribe v2 transcription...");
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioPath));
            formData.append('model_id', 'scribe_v2');
            // Enable language detection for multilingual support
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
            const detectedLang = response.data.language_code || "unknown";
            
            if (transcript && transcript.length > 1) {
                console.log(`[STT] ✓ ElevenLabs Scribe success | Language: ${detectedLang} | Length: ${transcript.length}`);
                return transcript;
            }
            console.warn("[STT] ElevenLabs returned empty transcript, trying fallback...");
        }
    } catch (error) {
        console.error("[STT-ELEVENLABS ERROR]:", error.response?.data ? JSON.stringify(error.response.data) : error.message);
    }

    // ── Attempt 2: Groq Whisper Large v3 (Fallback — excellent accuracy) ──
    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            console.log("[STT] Attempting Groq Whisper Large v3 fallback...");
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioPath));
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
                console.log(`[STT] ✓ Groq Whisper fallback success | Length: ${transcript.length}`);
                return transcript;
            }
            console.warn("[STT] Groq Whisper returned empty transcript.");
        }
    } catch (error) {
        console.error("[STT-GROQ-WHISPER ERROR]:", error.response?.data || error.message);
    }

    // ── Final Safety Fallback ──
    console.warn("[STT] All STT providers failed. Returning empty string.");
    return "";
}

module.exports = { transcribeAudio };
