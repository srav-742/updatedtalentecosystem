const axios = require('axios');
const { Communicate } = require('edge-tts-universal');
// const { GoogleGenerativeAI } = require('@google/generative-ai'); // Unused import removed

// ─── ElevenLabs Voice Configuration ─────────────────────────────────────────

// Premium ElevenLabs voice IDs curated for interview quality.
const PROFESSIONAL_INTERVIEWER_VOICE_ID = process.env.ELEVENLABS_INTERVIEWER_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID = process.env.ELEVENLABS_INTERVIEWER_FEMALE_VOICE_ID || 'cgSgspJ2msm6clMCkdW9';

const VOICE_LIBRARY = {
    // Podcast/broadcaster overrides.
    professional_interviewer: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    professional_interviewer_female: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    joerogan: process.env.VOICE_ROGAN_ID || PROFESSIONAL_INTERVIEWER_VOICE_ID,
    broadcaster: process.env.VOICE_BROADCASTER_ID || PROFESSIONAL_INTERVIEWER_VOICE_ID,
    podcast_host: process.env.VOICE_PODCAST_HOST_ID || PROFESSIONAL_INTERVIEWER_VOICE_ID,
    cohost: process.env.VOICE_COHOST_ID || PROFESSIONAL_INTERVIEWER_VOICE_ID,

    // Premium Curated Interviewer Personas
    senior_engineering_manager: 'nPczCjzI2devNBz1zQrb', // Brian: Calm, Confident, Authoritative
    principal_ai_engineer: 'erXwobaYiN019PBwHeBr',      // Antoni: Deep technical, Thoughtful pauses
    vp_sales: 'IKne3meq5aSn9XLyUdCD',                   // Arnold: Energetic, Professional
    director_vp: 'pNInz6obpgfrgxvn1567',                // Adam: Executive tone, professional

    // Male voices.
    adam: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    antoni: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    charlie: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    josh: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    arnold: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    sam: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    george: 'JBFqnCBsd6RMkjVDRZzb',
    brian: 'nPczCjzI2devNBz1zQrb',

    // Female voices.
    rachel: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    alice: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    charlotte: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    domi: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    elli: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    bella: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    jessica: 'cgSgspJ2msm6clMCkdW9',

    // OpenAI voice name mappings for backward compatibility.
    alloy: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    echo: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    fable: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    onyx: PROFESSIONAL_INTERVIEWER_VOICE_ID,
    nova: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID,
    shimmer: PROFESSIONAL_INTERVIEWER_FEMALE_VOICE_ID
};

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || PROFESSIONAL_INTERVIEWER_VOICE_ID;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

const PROFESSIONAL_VOICE_SETTINGS = {
    stability: 0.45,
    similarity_boost: 0.9,
    style: 0.7,
    use_speaker_boost: true,
    speed: 1.0
};

// ─── Microsoft Edge Neural TTS Voice Map ─────────────────────────────────────
// Free, zero-cost, human-sounding neural voices.
// Used as primary TTS if ELEVENLABS_API_KEY is not set, or as fallback if
// ElevenLabs fails (e.g. 401 Unusual Activity block on cloud server IPs).

const EDGE_VOICE_MAP = {
    // Personas / Special roles — upgraded to most human-sounding neural voices
    senior_engineering_manager: 'en-US-ChristopherNeural', // Deep, authoritative, commanding
    principal_ai_engineer: 'en-US-DavisNeural',          // Warm, thoughtful, confident
    vp_sales: 'en-US-TonyNeural',                        // Energetic, crisp, professional
    director_vp: 'en-US-ChristopherNeural',              // Executive tone, measured
    professional_interviewer: 'en-US-ChristopherNeural', // Primary interviewer voice
    professional_interviewer_female: 'en-US-AriaNeural', // Natural, warm female voice
    joerogan: 'en-US-TonyNeural',                        // Energetic, conversational
    broadcaster: 'en-US-ChristopherNeural',              // Clear broadcaster quality
    podcast_host: 'en-US-ChristopherNeural',             // Natural podcast delivery
    cohost: 'en-US-AriaNeural',                          // Warm co-host female voice

    // Male voices — mapped to best-quality neural equivalents
    adam: 'en-US-ChristopherNeural',
    antoni: 'en-US-DavisNeural',
    charlie: 'en-US-TonyNeural',
    josh: 'en-US-ChristopherNeural',
    arnold: 'en-US-TonyNeural',
    sam: 'en-US-DavisNeural',
    george: 'en-US-ChristopherNeural',
    brian: 'en-US-ChristopherNeural',

    // Female voices — mapped to best-quality neural equivalents
    rachel: 'en-US-AriaNeural',
    alice: 'en-US-JennyNeural',
    charlotte: 'en-US-JennyNeural',
    domi: 'en-US-AriaNeural',
    elli: 'en-US-AriaNeural',
    bella: 'en-US-AriaNeural',
    jessica: 'en-US-JennyNeural',

    // OpenAI voice name mappings
    alloy: 'en-US-ChristopherNeural',
    echo: 'en-US-DavisNeural',
    fable: 'en-US-TonyNeural',
    onyx: 'en-US-ChristopherNeural',
    nova: 'en-US-AriaNeural',
    shimmer: 'en-US-JennyNeural'
};

// Best human-quality neural voice for professional interviewer persona
const DEFAULT_EDGE_VOICE = 'en-US-ChristopherNeural';

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function resolveVoiceId(voice) {
    const voiceKey = String(voice || '').toLowerCase();
    const voiceId = VOICE_LIBRARY[voiceKey] || voice || DEFAULT_VOICE_ID;
    return String(voiceId).length >= 15 ? voiceId : DEFAULT_VOICE_ID;
}

function resolveEdgeVoice(voice) {
    const voiceKey = String(voice || '').toLowerCase();
    return EDGE_VOICE_MAP[voiceKey] || DEFAULT_EDGE_VOICE;
}

function cleanTextForSpeech(text) {
    return String(text || '')
        .replace(/\*\*/g, '')
        .replace(/#{1,6}\s*/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();
}

function getErrorDetail(error) {
    const data = error.response?.data;
    if (!data) return error.message;
    if (Buffer.isBuffer(data)) return data.toString('utf8');
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
    if (typeof data === 'object') return JSON.stringify(data);
    return String(data);
}

// ─── ElevenLabs Engine ───────────────────────────────────────────────────────

async function requestElevenLabsSpeech({ text, voiceId, modelId, timeout }) {
    const response = await axios({
        method: 'post',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${encodeURIComponent(ELEVENLABS_OUTPUT_FORMAT)}`,
        data: {
            text,
            model_id: modelId,
            voice_settings: PROFESSIONAL_VOICE_SETTINGS
        },
        headers: {
            Accept: 'audio/mpeg',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout
    });

    return Buffer.from(response.data);
}

// ─── Microsoft Edge Neural TTS Engine ────────────────────────────────────────

async function generateEdgeSpeech(text, voice) {
    try {
        const edgeVoice = resolveEdgeVoice(voice);
        console.log(`[TTS-EDGE] Generating Edge Neural TTS | voice: ${edgeVoice} | chars: ${text.length}`);

        const communicate = new Communicate(text, {
            voice: edgeVoice,
            rate: '-5%',       // Slightly slower — natural professional pacing
            pitch: '-3Hz',     // Deeper, gentle, low-pitch human resonance
            volume: '+0%'      // Neutral volume for clean audio
        });

        const chunks = [];
        for await (const chunk of communicate.stream()) {
            if (chunk.type === 'audio' && chunk.data) {
                chunks.push(chunk.data);
            }
        }

        if (chunks.length === 0) {
            console.warn('[TTS-EDGE] No audio chunks received.');
            return null;
        }

        const buffer = Buffer.concat(chunks);
        console.log(`[TTS-EDGE] Audio generated successfully: ${buffer.length} bytes`);
        return { buffer, mimeType: 'audio/mpeg', engine: 'edge' };
    } catch (err) {
        console.error('[TTS-EDGE ERROR]:', err.message);
        return null;
    }
}

// ─── Gemini TTS Engine (Primary — Charon voice, medium-high speed) ───────────

// Gemini TTS voice mapping - maps interview personas to Google's neural voices
const GEMINI_VOICE_MAP = {
    // Premium Interviewer Personas
    senior_engineering_manager: 'Charon',      // Deep, authoritative, commanding
    principal_ai_engineer: 'Charon',           // Warm, thoughtful, confident
    vp_sales: 'Charon',                        // Energetic, professional
    director_vp: 'Charon',                     // Executive tone, measured
    professional_interviewer: 'Charon',        // Primary interviewer voice
    professional_interviewer_female: 'Charon', // Natural, warm female voice

    // Male voices
    adam: 'Charon',
    antoni: 'Charon',
    charlie: 'Charon',
    josh: 'Charon',
    arnold: 'Charon',
    sam: 'Charon',
    george: 'Charon',
    brian: 'Charon',

    // Female voices
    rachel: 'Charon',
    alice: 'Charon',
    charlotte: 'Charon',
    domi: 'Charon',
    elli: 'Charon',
    bella: 'Charon',
    jessica: 'Charon',

    // OpenAI voice name mappings for backward compatibility
    alloy: 'Charon',
    echo: 'Charon',
    fable: 'Charon',
    onyx: 'Charon',
    nova: 'Charon',
    shimmer: 'Charon'
};

const DEFAULT_GEMINI_VOICE = 'Charon';

function resolveGeminiVoice(voice) {
    const voiceKey = String(voice || '').toLowerCase();
    return GEMINI_VOICE_MAP[voiceKey] || DEFAULT_GEMINI_VOICE;
}

async function generateGeminiSpeech(text, voice) {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            console.log('[TTS-GEMINI] GEMINI_API_KEY not set. Skipping Gemini TTS.');
            return null;
        }

        const geminiVoice = resolveGeminiVoice(voice);
        console.log(`[TTS-GEMINI] Generating speech | voice: ${geminiVoice} | chars: ${text.length}`);

        // Use Gemini REST API directly for TTS (generateContent with audio modality)
        // Correct model: gemini-3.1-flash-tts-preview
        const response = await axios({
            method: 'post',
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${geminiApiKey}`,
            data: {
                contents: [{ parts: [{ text }] }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: geminiVoice }
                        }
                    }
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            },
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 45000
        });

        // Extract inline audio data from response
        const parts = response.data?.candidates?.[0]?.content?.parts;
        const audioPart = parts?.find(p => p.inlineData?.mimeType?.startsWith('audio/'));
        if (!audioPart?.inlineData?.data) {
            console.warn('[TTS-GEMINI] No audio data in response.');
            return null;
        }

        const rawPcmBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
        
        // Wrap the raw PCM buffer with a standard 44-byte WAV header so browsers can play it natively
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        
        const wavHeader = Buffer.alloc(44);
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(rawPcmBuffer.length + 36, 4);
        wavHeader.write('WAVE', 8);
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16);
        wavHeader.writeUInt16LE(1, 20); // Audio format 1 = uncompressed PCM
        wavHeader.writeUInt16LE(numChannels, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
        wavHeader.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
        wavHeader.writeUInt16LE(bitsPerSample, 34);
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(rawPcmBuffer.length, 40);
        
        const audioBuffer = Buffer.concat([wavHeader, rawPcmBuffer]);
        const audioMimeType = 'audio/wav';
        console.log(`[TTS-GEMINI] Audio wrapped in WAV successfully: ${audioBuffer.length} bytes | voice: ${geminiVoice} | mime: ${audioMimeType}`);
        return { buffer: audioBuffer, mimeType: audioMimeType, engine: 'gemini' };
    } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.error?.message || err.message;
        console.error(`[TTS-GEMINI ERROR] ${status || 'NETWORK'}: ${detail}`);
        return null;
    }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Main TTS entry point.
 * Returns: { buffer: Buffer, mimeType: string, engine: 'gemini'|'edge' } | null
 *
 * @param {string} text           - Text to synthesize
 * @param {string} voice          - Voice persona key
 * @param {object} [options]      - Optional configuration
 * @param {string} [options.preferredEngine] - 'gemini' or 'edge' — lock to a specific engine
 * @param {number} [options.retries]        - Number of retries for the preferred engine (default: 2)
 */
const generateSpeech = async (text, voice = 'professional_interviewer', options = {}) => {
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) {
        console.warn('[TTS] Empty text after cleaning. Skipping.');
        return null;
    }

    const preferredEngine = options.preferredEngine || null;
    const maxRetries = options.retries || 2;

    // If a preferred engine is set (session locking), try it with retries before fallback
    if (preferredEngine === 'edge') {
        const edgeResult = await generateEdgeSpeech(cleanedText, voice);
        if (edgeResult) return edgeResult;
        // Edge failed — try Gemini as last resort
        const geminiResult = await generateGeminiSpeech(cleanedText, voice);
        if (geminiResult) return geminiResult;
        return null;
    }

    // Default: Try Gemini first with retries, then fallback to Edge
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const geminiResult = await generateGeminiSpeech(cleanedText, voice);
        if (geminiResult) return geminiResult;
        if (attempt < maxRetries) {
            console.warn(`[TTS] Gemini attempt ${attempt}/${maxRetries} failed. Retrying...`);
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.warn('[TTS] Gemini TTS failed after retries. Falling back to Edge TTS...');

    // Fallback to Microsoft Edge TTS (free, no IP restrictions, human-quality neural voices)
    return await generateEdgeSpeech(cleanedText, voice);
};

module.exports = { generateSpeech, generateEdgeSpeech, generateGeminiSpeech };
