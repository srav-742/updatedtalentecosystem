const axios = require('axios');
const { Communicate } = require('edge-tts-universal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    speed: 0.8
};

// ─── Microsoft Edge Neural TTS Voice Map ─────────────────────────────────────
// Free, zero-cost, human-sounding neural voices.
// Used as primary TTS if ELEVENLABS_API_KEY is not set, or as fallback if
// ElevenLabs fails (e.g. 401 Unusual Activity block on cloud server IPs).

const EDGE_VOICE_MAP = {
    // Personas / Special roles — upgraded to most human-sounding neural voices
    senior_engineering_manager: 'en-US-GuyNeural',       // Deep, authoritative, commanding
    principal_ai_engineer: 'en-US-DavisNeural',          // Warm, thoughtful, confident
    vp_sales: 'en-US-TonyNeural',                        // Energetic, crisp, professional
    director_vp: 'en-US-GuyNeural',                      // Executive tone, measured
    professional_interviewer: 'en-US-GuyNeural',         // Primary interviewer voice
    professional_interviewer_female: 'en-US-AriaNeural', // Natural, warm female voice
    joerogan: 'en-US-TonyNeural',                        // Energetic, conversational
    broadcaster: 'en-US-GuyNeural',                      // Clear broadcaster quality
    podcast_host: 'en-US-GuyNeural',                     // Natural podcast delivery
    cohost: 'en-US-AriaNeural',                          // Warm co-host female voice

    // Male voices — mapped to best-quality neural equivalents
    adam: 'en-US-GuyNeural',
    antoni: 'en-US-DavisNeural',
    charlie: 'en-US-TonyNeural',
    josh: 'en-US-GuyNeural',
    arnold: 'en-US-TonyNeural',
    sam: 'en-US-DavisNeural',
    george: 'en-US-GuyNeural',
    brian: 'en-US-GuyNeural',

    // Female voices — mapped to best-quality neural equivalents
    rachel: 'en-US-AriaNeural',
    alice: 'en-US-JennyNeural',
    charlotte: 'en-US-JennyNeural',
    domi: 'en-US-AriaNeural',
    elli: 'en-US-AriaNeural',
    bella: 'en-US-AriaNeural',
    jessica: 'en-US-JennyNeural',

    // OpenAI voice name mappings
    alloy: 'en-US-GuyNeural',
    echo: 'en-US-DavisNeural',
    fable: 'en-US-TonyNeural',
    onyx: 'en-US-GuyNeural',
    nova: 'en-US-AriaNeural',
    shimmer: 'en-US-JennyNeural'
};

// Best human-quality neural voice for professional interviewer persona
const DEFAULT_EDGE_VOICE = 'en-US-GuyNeural';

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
            rate: '-8%',       // Slightly slower — measured, confident interview cadence
            pitch: '+0Hz',     // Natural pitch (no artificial boost)
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
        return buffer;
    } catch (err) {
        console.error('[TTS-EDGE ERROR]:', err.message);
        return null;
    }
}

// ─── Gemini TTS Engine (Primary — Charon voice, medium-high speed) ───────────

async function generateGeminiSpeech(text) {
    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            console.log('[TTS-GEMINI] GEMINI_API_KEY not set. Skipping Gemini TTS.');
            return null;
        }

        console.log(`[TTS-GEMINI] Generating speech | voice: Charon | chars: ${text.length}`);

        // Use Gemini REST API directly for TTS (generateContent with audio modality)
        const response = await axios({
            method: 'post',
            url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
            data: {
                contents: [{ parts: [{ text }] }],
                generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Charon' }
                        },
                        // Medium-high speed: speaking rate 1.2 (1.0 = normal, 1.5 = fast)
                        speakingRate: 1.2
                    }
                }
            },
            headers: { 'Content-Type': 'application/json' },
            timeout: 25000
        });

        // Extract inline audio data from response
        const parts = response.data?.candidates?.[0]?.content?.parts;
        const audioPart = parts?.find(p => p.inlineData?.mimeType?.startsWith('audio/'));
        if (!audioPart?.inlineData?.data) {
            console.warn('[TTS-GEMINI] No audio data in response.');
            return null;
        }

        const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
        console.log(`[TTS-GEMINI] Audio generated successfully: ${audioBuffer.length} bytes | voice: Charon`);
        return audioBuffer;
    } catch (err) {
        const status = err.response?.status;
        const detail = err.response?.data?.error?.message || err.message;
        console.error(`[TTS-GEMINI ERROR] ${status || 'NETWORK'}: ${detail}`);
        return null;
    }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

const generateSpeech = async (text, voice = 'professional_interviewer') => {
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) {
        console.warn('[TTS] Empty text after cleaning. Skipping.');
        return null;
    }

    // 1. Try Gemini TTS first (Charon voice, medium-high speed)
    const geminiAudio = await generateGeminiSpeech(cleanedText);
    if (geminiAudio) return geminiAudio;

    console.warn('[TTS] Gemini TTS unavailable. Falling back to ElevenLabs...');

    const apiKey = process.env.ELEVENLABS_API_KEY;

    // 2. Try ElevenLabs if API Key is configured
    if (apiKey) {
        try {
            const voiceId = resolveVoiceId(voice);
            console.log(`[TTS-ELEVENLABS] Generating speech | model: ${ELEVENLABS_MODEL_ID} | voice: ${voiceId} | chars: ${cleanedText.length}`);

            const audioBuffer = await requestElevenLabsSpeech({
                text: cleanedText,
                voiceId,
                modelId: ELEVENLABS_MODEL_ID,
                timeout: 20000
            });

            console.log(`[TTS-ELEVENLABS] Audio generated successfully: ${audioBuffer.length} bytes`);
            return audioBuffer;
        } catch (error) {
            const errorDetail = getErrorDetail(error);
            console.error('[TTS-ELEVENLABS ERROR]:', error.response?.status || 'NETWORK', errorDetail);

            if (errorDetail.includes('detected_unusual_activity')) {
                console.warn('[TTS-ELEVENLABS] ⚠️  ElevenLabs Free Tier is BLOCKED on cloud IPs (Render/AWS/Heroku). Falling back to Microsoft Edge Neural TTS (free, human-quality voice).');
            } else if (error.response?.status === 401 || error.response?.status === 403) {
                console.warn('[TTS-ELEVENLABS] ⚠️  ElevenLabs auth failed. Falling back to Microsoft Edge Neural TTS.');
            } else {
                console.warn('[TTS-ELEVENLABS] ElevenLabs request failed. Falling back to Microsoft Edge Neural TTS...');
            }
        }
    } else {
        console.log('[TTS] ELEVENLABS_API_KEY not set. Using Microsoft Edge Neural TTS (free, human-quality neural voices)...');
    }

    // 3. Fallback to Microsoft Edge TTS (free, no IP restrictions, human-quality neural voices)
    return await generateEdgeSpeech(cleanedText, voice);
};

module.exports = { generateSpeech, generateEdgeSpeech, generateGeminiSpeech };
