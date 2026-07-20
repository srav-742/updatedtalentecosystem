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
            // Leaving language_code omitted enables ElevenLabs auto-detection

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

    // ── Attempt 3: Gemini 2.5 Flash Multimodal (Fallback — no file size limit) ──
    try {
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            console.log("[STT] Attempting Gemini 2.5 Flash STT fallback...");
            const { GoogleAIFileManager } = require('@google/generative-ai/server');
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            const fileManager = new GoogleAIFileManager(geminiKey);
            const mimeType = audioPath.endsWith('.webm') ? 'video/webm' : audioPath.endsWith('.mp3') ? 'audio/mp3' : 'audio/wav';
            const uploadResult = await fileManager.uploadFile(audioPath, {
                mimeType,
                displayName: 'Candidate Audio Answer'
            });
            let fileState = await fileManager.getFile(uploadResult.file.name);
            let attempts = 0;
            while (fileState.state === 'PROCESSING' && attempts < 15) {
                await new Promise(r => setTimeout(r, 1000));
                fileState = await fileManager.getFile(uploadResult.file.name);
                attempts++;
            }
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const result = await model.generateContent([
                "Transcribe the candidate's exact spoken answer from this audio/video recording verbatim. Return ONLY the transcribed text without quotes, markdown, or commentary.",
                { fileData: { fileUri: uploadResult.file.uri, mimeType: uploadResult.file.mimeType } }
            ]);
            fileManager.deleteFile(uploadResult.file.name).catch(() => null);
            const transcript = result.response.text()?.trim() || "";
            if (transcript && transcript.length > 1) {
                console.log(`[STT] ✓ Gemini 2.5 Flash STT success | Length: ${transcript.length}`);
                return transcript;
            }
        }
    } catch (gErr) {
        console.error("[STT-GEMINI ERROR]:", gErr.message);
    }

    // ── Final Safety Fallback ──
    console.warn("[STT] All STT providers failed. Returning empty string.");
    return "";
}

module.exports = { transcribeAudio };
