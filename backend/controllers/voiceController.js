const transcriptionService = require('../transcription_service');
const ttsService = require('../services/tts.service');
const path = require('path');
const fs = require('fs-extra');
const { sanitizeTranscript, isInvalidTranscript } = require('../utils/transcriptSanitizer');

const uploadAudio = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No audio file uploaded" });
        const audioPath = path.resolve(req.file.path);
        const rawLocalTranscript = req.body?.localTranscript || "";
        const localTranscript = sanitizeTranscript(rawLocalTranscript);
        console.log(`[STT] Processing: ${audioPath}. Sanitized Local transcript: "${localTranscript}"`);

        let rawTranscript = await transcriptionService.transcribeAudio(audioPath);
        let transcript = sanitizeTranscript(rawTranscript);
        console.log(`[STT] STT Sanitized Result: "${transcript}"`);

        // Check if STT result is a hallucination or empty, and we have a valid local transcript
        const isWhisperInvalid = isInvalidTranscript(transcript);

        if (isWhisperInvalid && localTranscript && localTranscript.trim().length > 0) {
            console.log(`[STT] Whisper returned invalid/empty. Falling back to sanitized local transcript: "${localTranscript}"`);
            transcript = localTranscript.trim();
        } else if (localTranscript && localTranscript.trim().length > (transcript || "").trim().length + 10 && localTranscript.trim().length > (transcript || "").trim().length * 1.3) {
            console.log(`[STT] Local transcript has significantly more spoken content than Whisper. Using local transcript.`);
            transcript = localTranscript.trim();
        }

        // Final sanitation check on transcript before returning
        transcript = sanitizeTranscript(transcript);

        // Cleanup only if NOT in private_storage (regular uploads)
        if (!audioPath.includes('private_storage')) {
            await fs.remove(audioPath).catch(err => console.error("Cleanup error:", err));
        } else {
            console.log(`[STT] Preserving secure recording at: ${audioPath}`);
        }

        res.json({ text: transcript });
    } catch (error) {
        console.error("[STT ERROR]:", error.message);
        res.status(500).json({ message: "Transcription failed", details: error.message });
    }
};

const tts = async (req, res) => {
    try {
        const { text, voice = "alloy" } = req.body;
        if (!text) return res.status(400).json({ message: "Text is required" });

        console.log(`[TTS] Generating speech for text: ${text.substring(0, 50)}...`);
        const ttsResult = await ttsService.generateSpeech(text, voice);

        if (!ttsResult) {
            console.warn("[TTS] AI Voice synthesis failed. Sending null for browser fallback.");
            return res.json({ success: true, audio: null });
        }

        const audioBase64 = ttsResult.buffer.toString('base64');
        res.json({ success: true, audio: audioBase64 });
    } catch (error) {
        console.error("[TTS ERROR]:", error.message);
        res.json({ success: true, audio: null }); // Still allow fallback
    }
};

const getAudio = (req, res) => {
    const filePath = path.join(__dirname, '../uploads', 'output.mp3');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: "Audio file not found" });
    }
};

module.exports = { uploadAudio, tts, getAudio };
