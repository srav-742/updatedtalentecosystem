const axios = require('axios');

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

function resolveVoiceId(voice) {
    const voiceKey = String(voice || '').toLowerCase();
    const voiceId = VOICE_LIBRARY[voiceKey] || voice || DEFAULT_VOICE_ID;
    return String(voiceId).length >= 15 ? voiceId : DEFAULT_VOICE_ID;
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

const generateSpeech = async (text, voice = 'podcast_host') => {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
            console.warn('[TTS] ELEVENLABS_API_KEY is not defined.');
            return null;
        }

        const cleanedText = cleanTextForSpeech(text);
        if (!cleanedText) {
            console.warn('[TTS] Empty text after cleaning. Skipping.');
            return null;
        }

        const voiceId = resolveVoiceId(voice);
        console.log(`[TTS] Generating ElevenLabs speech | model: ${ELEVENLABS_MODEL_ID} | voice: ${voiceId} | chars: ${cleanedText.length}`);

        const audioBuffer = await requestElevenLabsSpeech({
            text: cleanedText,
            voiceId,
            modelId: ELEVENLABS_MODEL_ID,
            timeout: 20000
        });

        console.log(`[TTS] Audio generated successfully: ${audioBuffer.length} bytes`);
        return audioBuffer;
    } catch (error) {
        console.error('[TTS-ELEVENLABS ERROR]:', error.response?.status || 'NETWORK', getErrorDetail(error));

        if (error.response?.status === 400 || error.response?.status === 422) {
            try {
                const cleanedText = cleanTextForSpeech(text);
                const fallbackBuffer = await requestElevenLabsSpeech({
                    text: cleanedText,
                    voiceId: DEFAULT_VOICE_ID,
                    modelId: 'eleven_turbo_v2_5',
                    timeout: 15000
                });

                console.log(`[TTS] Fallback audio generated: ${fallbackBuffer.length} bytes`);
                return fallbackBuffer;
            } catch (fallbackErr) {
                console.error('[TTS-FALLBACK ERROR]:', getErrorDetail(fallbackErr));
            }
        }

        return null;
    }
};

module.exports = { generateSpeech };
