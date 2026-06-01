/**
 * Service for Text-to-Speech synthesis.
 * Returns null gracefully — interview continues with browser-side voice synthesis.
 */
const generateSpeech = async (text, voice = "onyx") => {
    // Returning null triggers browser-side fallback
    console.warn("[TTS] Server-side TTS not available. Using browser-side voice synthesis.");
    return null;
};

module.exports = { generateSpeech };
