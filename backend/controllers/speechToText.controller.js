const whisperService = require('../services/whisper.service');
const path = require('path');
const fs = require('fs');

const convertSpeechToText = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
        }

        const filePath = req.file.path;
        const transcription = await whisperService.transcribeAudio(filePath);

        // Optional: Clean up uploaded file
        // fs.unlinkSync(filePath);

        res.status(200).json({ transcription });
    } catch (error) {
        res.status(500).json({ error: "Transcription failed", details: error.message });
    }
};

module.exports = { convertSpeechToText };
