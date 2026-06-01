const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

/**
 * Service for Groq Whisper API calls (previously OpenAI Whisper).
 */
const transcribeAudio = async (filePath) => {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("GROQ_API_KEY is not defined");

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('model', 'whisper-large-v3');

        const response = await axios.post(
            'https://api.groq.com/openai/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${apiKey}`,
                },
                timeout: 30000
            }
        );

        return response.data.text;
    } catch (error) {
        console.error("[WHISPER SERVICE ERROR]:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = { transcribeAudio };
