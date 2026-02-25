const transcriptionService = require('../transcription_service');
const ttsService = require('../services/tts.service');
const path = require('path');
const fs = require('fs-extra');

const uploadAudio = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No audio file uploaded" });
        const audioPath = path.resolve(req.file.path);
        console.log(`[STT] Processing: ${audioPath}`);

        const transcript = await transcriptionService.transcribeAudio(audioPath);
        console.log(`[STT] Result: ${transcript}`);

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

        console.log(`[TTS-OPENAI] Generating speech for text: ${text.substring(0, 50)}...`);
        const audioBuffer = await ttsService.generateSpeech(text, voice);

        if (!audioBuffer) {
            console.warn("[TTS] AI Voice synthesis failed. Sending null for browser fallback.");
            return res.json({ success: true, audio: null });
        }

        const audioBase64 = audioBuffer.toString('base64');
        res.json({ success: true, audio: audioBase64 });
    } catch (error) {
        console.error("[TTS-OPENAI ERROR]:", error.message);
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
