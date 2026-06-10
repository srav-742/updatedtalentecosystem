const axios = require('axios');
const { Communicate } = require('edge-tts-universal');

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
    // Personas / Special roles
    senior_engineering_manager: 'en-US-AndrewNeural',
    principal_ai_engineer: 'en-US-ChristopherNeural',
    vp_sales: 'en-US-BrianNeural',
    director_vp: 'en-US-SteffanNeural',
    professional_interviewer: 'en-US-AndrewNeural',
    professional_interviewer_female: 'en-US-AvaNeural',
    joerogan: 'en-US-BrianNeural',
    broadcaster: 'en-US-AndrewNeural',
    podcast_host: 'en-US-AndrewNeural',
    cohost: 'en-US-AvaNeural',

    // Male voices
    adam: 'en-US-AndrewNeural',
    antoni: 'en-US-ChristopherNeural',
    charlie: 'en-US-EricNeural',
    josh: 'en-US-GuyNeural',
    arnold: 'en-US-BrianNeural',
    sam: 'en-US-ChristopherNeural',
    george: 'en-US-AndrewNeural',
    brian: 'en-US-BrianNeural',

    // Female voices
    rachel: 'en-US-AvaNeural',
    alice: 'en-US-EmmaNeural',
    charlotte: 'en-US-JennyNeural',
    domi: 'en-US-AnaNeural',
    elli: 'en-US-EmmaNeural',
    bella: 'en-US-AvaNeural',
    jessica: 'en-US-EmmaNeural',

    // OpenAI voice name mappings
    alloy: 'en-US-AndrewNeural',
    echo: 'en-US-ChristopherNeural',
    fable: 'en-US-EricNeural',
    onyx: 'en-US-GuyNeural',
    nova: 'en-US-AvaNeural',
    shimmer: 'en-US-EmmaNeural'
};

const DEFAULT_EDGE_VOICE = 'en-US-AndrewNeural';

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
            rate: '-5%',      // Slightly slower for professional interviewer feel
            pitch: '+0Hz'
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

// ─── Main Entry Point ─────────────────────────────────────────────────────────

const generateSpeech = async (text, voice = 'podcast_host') => {
    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) {
        console.warn('[TTS] Empty text after cleaning. Skipping.');
        return null;
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    // 1. Try ElevenLabs first if API Key is configured
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

    // 2. Fallback to Microsoft Edge TTS (free, no IP restrictions, human-quality neural voices)
    return await generateEdgeSpeech(cleanedText, voice);
};

module.exports = { generateSpeech, generateEdgeSpeech };
