const ttsService = require('../services/tts.service');

const convertTextToSpeech = async (req, res) => {
    try {
        const { text, voice } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const ttsResult = await ttsService.generateSpeech(text, voice);

        if (!ttsResult) {
            return res.status(500).json({ error: "TTS generation failed" });
        }

        res.set({
            'Content-Type': ttsResult.mimeType || 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="speech.mp3"',
        });

        res.send(ttsResult.buffer);
    } catch (error) {
        res.status(500).json({ error: "TTS failed", details: error.message });
    }
};

module.exports = { convertTextToSpeech };
