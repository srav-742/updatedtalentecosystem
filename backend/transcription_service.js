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
        console.log("[STT-FALLBACK] Switch to Local Whisper (Transformers.js)...");

        try {
            // Lazy load to prevent startup lag
            const { pipeline } = await import('@xenova/transformers');

            // Singleton pattern could be better but for now let's just initialize
            const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');

            // Transformers.js in Node usually needs the raw float32 buffer
            // But it can also take a buffer if we use its utility or just pass it in.
            // Let's use fs-extra to read the buffer and then let the transcriber handle it.
            const audioBuffer = await fs.readFile(audioPath);
            const wav = new WaveFile(audioBuffer);
            wav.toSampleRate(16000);
            wav.toBitDepth('32f'); // Float32 format for transformers.js

            const samples = wav.getSamples(false, Float32Array);
            const result = await transcriber(samples, {
                chunk_length_s: 30,
                stride_length_s: 5
            });

            console.log("[STT-WHISPER] Result:", result.text);
            let transcript = result.text || "";

            // 🛠️ AGGRESSIVE HALLUCINATION FILTER
            // 1. Remove markers
            transcript = transcript.replace(/\[Music\]|\[Laughter\]|\[Applause\]/gi, '').trim();

            // 2. Loop Cleaning (e.g., "if you can't eat it, if you can't eat it...")
            if (transcript.includes("if you can't eat it") || transcript.includes("i'm so proud of you") || transcript.includes("if you can't hear it")) {
                console.warn("[STT-WHISPER] Loop detected. Truncating to first segment.");
                transcript = transcript.split(',')[0].split('.')[0].trim();
            }

            // 3. Word-level repetition check (e.g., "I worked on I worked on I worked on")
            const words = transcript.split(' ');
            if (words.length > 15) {
                const chunk1 = words.slice(0, 5).join(' ');
                const chunk2 = words.slice(5, 10).join(' ');
                if (chunk1 === chunk2) {
                    console.warn("[STT-WHISPER] Phrase repetition detected.");
                    return ""; // Reject noisy loops
                }
            }

            if (isNonsense(transcript)) {
                console.warn("[STT-WHISPER] Content classified as noise.");
                return "";
            }

            return transcript;
        } catch (localError) {
            console.error("[STT-WHISPER] Local Fallback Failed:", localError);
            return "[Transcription Failed]";
        }
    }
}

function isNonsense(text) {
    if (!text || text.length < 5) return true;
    const lower = text.toLowerCase();

    const hallucinationMarkers = [
        "he used to call me",
        "thank you for watching",
        "beadaholique",
        "if you can't eat it",
        "i think i'm not bit of a surprise",
        "of the water leaves",
        "i'm so proud of you",
        "i have been working because it's true", // From user log
        "if the water is as a key" // From user log
    ];

    if (hallucinationMarkers.some(m => lower.includes(m))) {
        // Double check: if it's ONLY the marker, it's nonsense. If it's a long text with one marker, maybe it's fine?
        // Actually, for these specific Whisper hallmarks, they are almost always 100% noise.
        return true;
    }

    // Detect high-frequency repetition
    const segments = lower.split(/[,.]+/);
    if (segments.length > 3) {
        const first = segments[0].trim();
        const second = segments[1].trim();
        if (first === second && first.length > 5) return true;
    }

    return false;
}

module.exports = { transcribeAudio };
