const openai = require('../config/openai');

/**
 * Service for OpenAI Text-to-Speech synthesis.
 */
const generateSpeech = async (text, voice = "alloy") => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            console.warn("[TTS] OPENAI_API_KEY missing. Returning null.");
            return null;
        }

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        return buffer;
    } catch (error) {
        if (error.status === 429 || error.message?.includes('429')) {
            console.warn("[TTS] Quota exceeded. Switching to browser-side voice synthesis fallback.");
        } else {
            console.error("[TTS SERVICE ERROR]:", error.message);
        }
        return null; // Return null so the interview can continue with text-only
    }
};

module.exports = { generateSpeech };
