const axios = require('axios');

/**
 * Service for Text-to-Speech synthesis using ElevenLabs.
 * 
 * Upgraded to use eleven_multilingual_v2 — the highest-quality ElevenLabs model
 * with native multilingual support and the most natural, human-like speech.
 * 
 * Voice settings are tuned for a professional interview context:
 *   - stability: 0.40 → allows natural vocal variation (less robotic)
 *   - similarity_boost: 0.80 → keeps the voice consistent and clear
 *   - style: 0.15 → subtle expressiveness without being dramatic
 *   - use_speaker_boost: true → enhances clarity and presence
 */

// Premium ElevenLabs voice IDs — curated for interview quality
const VOICE_LIBRARY = {
    // ── Male Voices ──
    "adam":      "pNInz6obpgDQGcFmaJgB",   // Adam — deep, authoritative male
    "antoni":    "ErXwobaYiN019PkySvjV",    // Antoni — warm, professional male
    "charlie":   "IKne3meq5aSn9XLyUdCD",    // Charlie — confident, clear male
    "josh":      "TxGEqnHWrfWFTfGW9XjX",   // Josh — young professional male
    "arnold":    "VR6AewLTigWG4xSOukaG",    // Arnold — strong, commanding male
    "sam":       "yoZ06aMxZJJ28mfd3POQ",    // Sam — calm, measured male

    // ── Female Voices ──
    "rachel":    "21m00Tcm4TlvDq8ikWAM",    // Rachel — smooth, professional female
    "alice":     "Xb7hH8MSUJpSbSDYk0k2",    // Alice — clear, articulate female
    "charlotte": "XB0fDUnXU5powFXDhCwa",    // Charlotte — warm, natural female
    "domi":      "AZnzlk1XvdvUeBnXmlld",    // Domi — strong, confident female
    "elli":      "MF3mGyEYCl7XYWbV9V6O",    // Elli — young, friendly female
    "bella":     "EXAVITQu4vr4xnSDxMaL",    // Bella — expressive, engaging female

    // ── OpenAI voice name mappings (for backward compatibility) ──
    "alloy":     "pNInz6obpgDQGcFmaJgB",    // → Adam
    "echo":      "ErXwobaYiN019PkySvjV",    // → Antoni
    "fable":     "IKne3meq5aSn9XLyUdCD",    // → Charlie
    "onyx":      "VR6AewLTigWG4xSOukaG",    // → Arnold
    "nova":      "Xb7hH8MSUJpSbSDYk0k2",    // → Alice
    "shimmer":   "XB0fDUnXU5powFXDhCwa",    // → Charlotte
};

// Default interviewer voice — "Josh" is clear, professional, and natural-sounding
const DEFAULT_VOICE_ID = "TxGEqnHWrfWFTfGW9XjX";

const generateSpeech = async (text, voice = "josh") => {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            console.warn("[TTS] ELEVENLABS_API_KEY is not defined. Using fallback.");
            return null;
        }

        // Resolve voice ID from name or use raw ID
        let voiceId = VOICE_LIBRARY[String(voice).toLowerCase()] || voice;
        if (!voiceId || voiceId.length < 15) {
            voiceId = DEFAULT_VOICE_ID;
        }

        // Clean text for better TTS output — remove markdown artifacts
        const cleanedText = String(text || '')
            .replace(/\*\*/g, '')
            .replace(/#{1,6}\s*/g, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .trim();

        if (!cleanedText) {
            console.warn("[TTS] Empty text after cleaning. Skipping.");
            return null;
        }

        console.log(`[TTS] Generating speech with ElevenLabs | model: eleven_multilingual_v2 | voice: ${voiceId} | text length: ${cleanedText.length}`);

        const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            data: {
                text: cleanedText,
                model_id: 'eleven_multilingual_v2',  // Best quality model — natural human voice with multilingual support
                voice_settings: {
                    stability: 0.40,              // Lower = more natural vocal variation (less robotic)
                    similarity_boost: 0.80,       // High = consistent, clear voice identity
                    style: 0.15,                  // Subtle expressiveness — professional interview tone
                    use_speaker_boost: true        // Enhanced clarity and presence
                },
                output_format: 'mp3_44100_128'    // High quality audio output
            },
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 20000,  // 20 second timeout for multilingual model (slightly slower than turbo)
        });

        const audioBuffer = Buffer.from(response.data);
        console.log(`[TTS] ✓ Audio generated successfully: ${audioBuffer.length} bytes`);
        return audioBuffer;
    } catch (error) {
        const errDetail = error.response?.data
            ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : String(error.response.data))
            : error.message;
        console.error("[TTS-ELEVENLABS ERROR]:", error.response?.status || 'NETWORK', errDetail);

        // If multilingual model fails, try fallback to turbo model
        if (error.response?.status === 422 || error.response?.status === 400) {
            try {
                console.log("[TTS] Retrying with eleven_turbo_v2_5 fallback model...");
                const fallbackResponse = await axios({
                    method: 'post',
                    url: `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}`,
                    data: {
                        text: String(text || '').trim(),
                        model_id: 'eleven_turbo_v2_5',
                        voice_settings: {
                            stability: 0.45,
                            similarity_boost: 0.75,
                            style: 0.20,
                            use_speaker_boost: true
                        }
                    },
                    headers: {
                        'Accept': 'audio/mpeg',
                        'xi-api-key': process.env.ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer',
                    timeout: 15000,
                });

                const fallbackBuffer = Buffer.from(fallbackResponse.data);
                console.log(`[TTS] ✓ Fallback audio generated: ${fallbackBuffer.length} bytes`);
                return fallbackBuffer;
            } catch (fallbackErr) {
                console.error("[TTS-FALLBACK ERROR]:", fallbackErr.message);
            }
        }

        return null;
    }
};

module.exports = { generateSpeech };
