/**
 * Transcript Sanitizer Utility
 * 
 * Cleans candidate speech-to-text transcripts by:
 * 1. Filtering non-English scripts (Indic scripts like Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Gujarati, & Arabic/Urdu).
 * 2. Blocking silence/subtitle hallucinations ("Thank you for watching", "Subtitles by", "Subscribe", etc.).
 * 3. Stripping conversational filler words ("uh", "um", "okey", "okay", "yeah", "yea", "ah", "er", "hmm") while preserving valid response text.
 */

// Indic and Arabic/Urdu script Unicode ranges
const NON_ENGLISH_SCRIPT_REGEX = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF]/;

// Known silence/static hallucination phrases (lowercase stripped of punctuation)
const INVALID_HALLUCINATION_PHRASES = new Set([
    "thank you",
    "thank you for watching",
    "thanks for watching",
    "thanks for watching!",
    "thank you for watching.",
    "e ai",
    "legend by",
    "watching",
    "by subtitle",
    "subtitles by",
    "english subtitles",
    "you",
    "e aí",
    "i am describing my technical experience and relevant skills for this specific role",
    "amaraorg",
    "subtitles",
    "subscribe",
    "like and subscribe",
    "thank you very much",
    "bye",
    "goodbye",
    "translated by",
    "copyright",
    "all rights reserved",
    "so",
    "ok",
    "okay",
    "yeah",
    "uh",
    "um",
    "ah"
]);

/**
 * Sanitize candidate transcript text.
 * @param {string} rawText - Raw transcript string
 * @returns {string} - Cleaned transcript or empty string if invalid/hallucinated
 */
function sanitizeTranscript(rawText) {
    if (!rawText || typeof rawText !== 'string') return "";
    let text = rawText.trim();
    if (!text) return "";

    // ── 1. Non-English Script Guard (Telugu, Hindi, Urdu, etc.) ──
    if (NON_ENGLISH_SCRIPT_REGEX.test(text)) {
        console.log(`[TRANSCRIPT-SANITIZER] Detected non-English script (Telugu/Hindi/Urdu/Indic). Stripping non-English characters from: "${text.substring(0, 40)}..."`);
        text = text.replace(new RegExp(NON_ENGLISH_SCRIPT_REGEX, 'g'), '').trim();
        if (text.length < 3) {
            console.log(`[TRANSCRIPT-SANITIZER] Transcript contained only foreign script. Rejecting.`);
            return "";
        }
    }

    // ── 2. Silence / Subtitle Hallucination Check ──
    const normalized = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    if (INVALID_HALLUCINATION_PHRASES.has(normalized)) {
        console.log(`[TRANSCRIPT-SANITIZER] Rejected silence/subtitle hallucination phrase: "${text}"`);
        return "";
    }

    // ── 3. Filler Word Removal ──
    text = text
        // Remove standalone filler interjections: uh, uhh, um, umm, okey, okay, ok, hmm, hmmm, er, ah, oh
        .replace(/\b(uh+|um+|okey|er+|hmm+)\b/gi, '')
        // Clean leading conversational filler intros like "yeah," "yea," "ah," "oh," "okay," "okey," "ok," "so,"
        .replace(/^(yeah|yea|ah|oh|okay|okey|ok|so)\b[,\s]*/gi, '')
        // Remove mid-sentence filler "yeah", "yea", "okay", "okey", "ok" hesitations
        .replace(/,\s*(yeah|yea|okay|okey|ok)\s*,/gi, ',')
        .replace(/\b(yeah|yea)\b/gi, '')
        .replace(/\b(okey|okay)\b/gi, '')
        // Clean filler "like," or "you know," hesitations
        .replace(/,\s*like,\s*/gi, ', ')
        .replace(/\b(you know)\b[,\s]*/gi, '')
        // Clean double spaces and orphaned leading/trailing punctuation
        .replace(/\s{2,}/g, ' ')
        .replace(/^\s*[,\.\:\;\-]\s*/, '')
        .replace(/\s*[,\;]\s*$/, '.')
        .trim();

    // Capitalize first letter if needed
    if (text.length > 0) {
        text = text.charAt(0).toUpperCase() + text.slice(1);
    }

    return text;
}

/**
 * Checks if a raw transcript is an invalid hallucination or empty.
 * @param {string} rawText 
 * @returns {boolean}
 */
function isInvalidTranscript(rawText) {
    const cleaned = sanitizeTranscript(rawText);
    return !cleaned || cleaned.length < 2;
}

module.exports = {
    sanitizeTranscript,
    isInvalidTranscript
};
