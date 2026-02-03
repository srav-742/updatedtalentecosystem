const ttsService = require('../services/tts.service');

const convertTextToSpeech = async (req, res) => {
    try {
        const { text, voice } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const audioBuffer = await ttsService.generateSpeech(text, voice);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename="speech.mp3"',
        });

        res.send(audioBuffer);
    } catch (error) {
        res.status(500).json({ error: "TTS failed", details: error.message });
    }
};

module.exports = { convertTextToSpeech };
