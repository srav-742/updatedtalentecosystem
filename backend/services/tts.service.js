/**
 * Service for Text-to-Speech synthesis.
 * Note: TTS previously used OpenAI API key which is no longer configured.
 * Returns null gracefully — interview continues with browser-side voice synthesis.
 */
const generateSpeech = async (text, voice = "onyx") => {
    // TTS requires OpenAI key which is no longer used in this project
    // Returning null triggers browser-side fallback
    console.warn("[TTS] OpenAI TTS not available (key removed). Using browser-side voice synthesis.");
    return null;
};

module.exports = { generateSpeech };
