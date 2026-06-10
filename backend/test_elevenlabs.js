const axios = require('axios');
require('dotenv').config({ override: true });

async function test() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log("Using API Key:", apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined');
    if (!apiKey) {
        console.error("No API key found in process.env.ELEVENLABS_API_KEY");
        return;
    }

    try {
        const voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // Default professional male voice
        const response = await axios({
            method: 'post',
            url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            data: {
                text: "Test debug audio generation.",
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.45,
                    similarity_boost: 0.9,
                    style: 0.7,
                    use_speaker_boost: true,
                    speed: 0.8
                }
            },
            headers: {
                Accept: 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 15000
        });

        console.log("Success! Response bytes:", response.data.length || response.data.byteLength);
    } catch (err) {
        console.error("Error occurred:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data.toString('utf8'));
        } else {
            console.error(err.message);
        }
    }
}

test();
