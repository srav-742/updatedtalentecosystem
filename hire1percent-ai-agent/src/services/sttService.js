const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const processVoiceCommand = async (base64Audio, session = null) => {
    const tempFilePath = path.join(__dirname, `../../temp_audio_${uuidv4()}.webm`);
    
    try {
        // 1. SAVE BASE64 TO TEMP FILE
        const audioBuffer = Buffer.from(base64Audio, "base64");
        fs.writeFileSync(tempFilePath, audioBuffer);

        // 2. TRANSCRIBE USING GROQ WHISPER
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-large-v3", // Updated model name
            response_format: "text",
            language: "en" // Enforce English to prevent hallucinated Hindi/Telugu translations
        });

        // Cleanup
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        console.log("Groq STT:", transcription);
        return transcription;

    } catch (error) {
        console.error("Groq STT Error:", error.message);
        
        // Cleanup on error
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

        return "Sorry, I couldn't understand that.";
    }
};

module.exports = processVoiceCommand;

