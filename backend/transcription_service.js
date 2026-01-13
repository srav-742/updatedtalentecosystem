const fs = require('fs-extra');
const axios = require('axios');
const { WaveFile } = require('wavefile');

async function transcribeAudio(audioPath) {
    try {
        console.log("[STT-GOOGLE] Transcribing audio...");
        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (!googleApiKey) throw new Error("GOOGLE_API_KEY missing in .env");

        const audioBuffer = await fs.readFile(audioPath);
        console.log(`[STT-GOOGLE] Input Buffer Size: ${audioBuffer.length} bytes`);

        const wav = new WaveFile(audioBuffer);
        wav.toSampleRate(16000);
        wav.toBitDepth('16');

        const samples = wav.data.samples;
        console.log(`[STT-GOOGLE] Sample Count: ${samples.length} (Type: ${samples.constructor.name})`);

        const base64Audio = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength).toString('base64');
        console.log(`[STT-GOOGLE] Payload: ${base64Audio.length} chars`);

        const url = `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`;
        const payload = {
            config: {
                encoding: "LINEAR16",
                sampleRateHertz: 16000,
                languageCode: "en-US",
                model: "latest_long",
                useEnhanced: true,
                enableAutomaticPunctuation: true,
                metadata: {
                    interactionType: "DISCUSSION"
                }
            },
            audio: {
                content: base64Audio
            }
        };

        const response = await axios.post(url, payload);
        const transcription = response.data.results
            ?.map(result => result.alternatives[0].transcript)
            .join('\n');

        if (!transcription) {
            console.warn("[STT-GOOGLE] No transcription found (silence or low quality).");
            return "";
        }

        console.log("[STT-GOOGLE] Transcription successful.");

        // Basic hallucination filter for specific phrases if needed
        if (isNonsense(transcription)) {
            console.warn("[STT-GOOGLE] Nonsense detected, filtering.");
            return "";
        }

        return transcription.trim();
    } catch (error) {
        console.error("[STT-GOOGLE] Error:", error.response?.data || error.message);
        return "[Transcription Failed]";
    }
}

function isNonsense(text) {
    if (!text) return true;
    const lower = text.toLowerCase();
    // Keep the core filters as they are helpful for any model
    if (lower.includes("he used to call me") || lower.includes("thank you for watching") || lower.includes("beadaholique")) {
        return true;
    }
    return false;
}

module.exports = { transcribeAudio };
