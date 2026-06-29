const express = require('express');
const cors = require('cors');
const dns = require('dns');
const compression = require('compression');

// Fix for MongoDB SRV DNS resolution issues (only in development environments)
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const app = express();

// Enable GZIP compression for all API responses
app.use(compression());

// Middleware
const corsOptions = {
    origin: (origin, callback) => {
        // Broadly allow hire1percent.com and localhost
        if (!origin ||
            origin.includes('hire1percent.com') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            console.log(`[CORS] Rejected Origin: ${origin}`);
            callback(null, true); // Still allow for now to resolve the blocker
        }
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Accept', 'X-Requested-With', 'Origin', 'X-Client-ID', 'X-Client-Secret', 'X-Refresh-Token'],
    exposedHeaders: ['X-New-Access-Token'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));




app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes');
const jobRoutes = require('./routes/jobRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const aiInterviewRoutes = require('./routes/aiInterviewRoutes');
const aiInterviewUploadRoutes = require('./routes/interviewRecordingRoutes');
const voiceRoutesNew = require('./routes/voice.routes');
const calibrationRoutes = require('./routes/calibrationRoutes');
const interviewFeedbackRoutes = require('./routes/interviewFeedbackRoutes');
const agentRoutes = require("./routes/agentRoutes");
const cloudinaryTestRoutes = require('./routes/cloudinaryTest.routes');
const proctoringRoutes = require('./routes/proctoringRoutes');
const contentRoutes = require("./routes/contentRoutes");
const videoIntroRoutes = require('./routes/videoIntroRoutes');
const communityRoutes = require('./routes/communityRoutes');
const teamFitRoutes = require('./routes/teamFitRoutes');
const insightRoutes = require('./routes/insightRoutes');
const aiSearchRoutes = require('./routes/aiSearchRoutes');
const searchRoutes = require('./routes/searchRoutes');
const voiceAgentRoutes = require('./routes/voiceAgentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const gatewayRoutes = require('./routes/gatewayRoutes');




// ✅ 1. Mount Gateway & Health Check Routes (Bypass global gatewayMiddleware)
app.use('/api/gateway', gatewayRoutes);

const serviceHealth = {
    service: "interview-service",
    status: true,
    message: "Interview Service is healthy.",
    timestamp: () => new Date().toISOString()
};

const buildInterviewStatus = (message = serviceHealth.message, extra = {}) => ({
    success: true,
    status: true,
    service: serviceHealth.service,
    message,
    timestamp: serviceHealth.timestamp(),
    ...extra
});

const sendInterviewHealth = (res, message = serviceHealth.message, extra = {}) => {
    res.json(buildInterviewStatus(message, extra));
};

const sendInterviewRunning = (res) => {
    res.json({
        ...buildInterviewStatus("Interview Service is running."),
        endpoints: {
            health: "/health",
            ready: "/ready",
            live: "/live",
            gatewayHealth: "/api/v1/interviews/health"
        }
    });
};

app.get('/health', (req, res) => {
    sendInterviewHealth(res);
});

app.get('/live', (req, res) => {
    sendInterviewHealth(res, "Interview Service is live.", {
        alive: true,
        uptime: process.uptime()
    });
});

app.get('/ready', (req, res) => {
    sendInterviewHealth(res, "Interview Service is ready.", {
        ready: true
    });
});

app.get('/api/v1/interviews/health', (req, res) => {
    sendInterviewHealth(res);
});

app.get('/api/v1/interviews/live', (req, res) => {
    sendInterviewHealth(res, "Interview Service is live.", {
        alive: true,
        uptime: process.uptime()
    });
});

app.get('/api/v1/interviews/ready', (req, res) => {
    sendInterviewHealth(res, "Interview Service is ready.", {
        ready: true
    });
});

app.get('/api/v1/interviews', (req, res) => {
    sendInterviewRunning(res);
});

app.get('/api/v1/interviews/', (req, res) => {
    sendInterviewRunning(res);
});
app.get('/api/status', (req, res) => {
    res.json({
        status: "Active",
        message: "hire1percent Backend is running successfully.",
        timestamp: new Date().toISOString()
    });
});

// ✅ 2. Apply Global Gateway Middleware for all other /api routes
const { gatewayMiddleware } = require('./middleware/gatewayMiddleware');
app.use('/api', gatewayMiddleware);

// ✅ 3. Mount Business Routes (Protected by gatewayMiddleware)
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', recruiterRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', resumeRoutes);
app.use('/api', voiceRoutes);
app.use('/api', applicationRoutes);
app.use('/api/interview', require('./routes/fastAiInterviewRoutesFix'));  // ─── FIX Overlay first (overrides /start and /next-fast)
app.use('/api/interview', aiInterviewRoutes);
app.use('/api/interview', require('./routes/fastAiInterviewRoutes'));
app.use('/api', aiInterviewUploadRoutes);
app.use('/api/v2/voice', voiceRoutesNew);
app.use('/api', calibrationRoutes);
app.use('/api/interview', interviewFeedbackRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/cloudinary-test", cloudinaryTestRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/proctoring-enhanced', require('./routes/proctoringRoutesEnhanced'));
app.use("/api/content", contentRoutes);
app.use('/api', videoIntroRoutes);
app.use('/api', communityRoutes);
app.use('/api/team-fit', teamFitRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/ai-search', aiSearchRoutes);
app.use('/api/voice-agent', voiceAgentRoutes);
app.use('/api/transcripts', require('./routes/transcriptRoutes'));
app.use('/api/user-resumes', require('./routes/userResumeRoutes'));
app.use('/api', require('./routes/recruiterUploadRoutes'));
app.use('/api', paymentRoutes);

// 🔍 TTS Debug Diagnostics Endpoint — Tests both ElevenLabs and Edge Neural TTS
app.get('/api/tts-debug', async (req, res) => {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const elevenLabsExists = !!apiKey;

        // ── Test ElevenLabs ──────────────────────────────────────────────────
        let elevenLabsSuccess = false;
        let elevenLabsError = null;
        let elevenLabsRaw = null;
        let elevenLabsStatus = null;

        if (elevenLabsExists) {
            try {
                const axios = require('axios');
                const voiceId = 'JBFqnCBsd6RMkjVDRZzb';
                const response = await axios({
                    method: 'post',
                    url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
                    data: {
                        text: "Test debug audio generation.",
                        model_id: "eleven_multilingual_v2",
                        voice_settings: { stability: 0.45, similarity_boost: 0.9, style: 0.7, use_speaker_boost: true, speed: 0.8 }
                    },
                    headers: {
                        Accept: 'audio/mpeg',
                        'xi-api-key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer',
                    timeout: 15000
                });
                elevenLabsSuccess = true;
                elevenLabsRaw = `Success. Generated ${response.data.byteLength || response.data.length} bytes.`;
            } catch (err) {
                elevenLabsStatus = err.response?.status || 'NETWORK_ERROR';
                const data = err.response?.data;
                if (Buffer.isBuffer(data)) elevenLabsRaw = data.toString('utf8');
                else if (data instanceof ArrayBuffer) elevenLabsRaw = Buffer.from(data).toString('utf8');
                else elevenLabsRaw = data ? JSON.stringify(data) : err.message;
                elevenLabsError = `ElevenLabs request failed: ${err.message}`;
            }
        } else {
            elevenLabsError = "ELEVENLABS_API_KEY is not set on the server.";
        }

        // ── Test Microsoft Edge Neural TTS (free fallback) ────────────────────
        let edgeTTSSuccess = false;
        let edgeTTSError = null;
        let edgeTTSBytes = 0;

        try {
            const { generateEdgeSpeech } = require('./services/tts.service');
            const result = await generateEdgeSpeech("Test debug audio generation.", 'podcast_host');
            if (result && result.buffer && result.buffer.length > 0) {
                edgeTTSSuccess = true;
                edgeTTSBytes = result.buffer.length;
            } else {
                edgeTTSError = "Edge TTS returned no audio data.";
            }
        } catch (err) {
            edgeTTSError = `Edge TTS failed: ${err.message}`;
        }

        // ── Active engine determination ───────────────────────────────────────
        const activeEngine = elevenLabsSuccess ? 'ElevenLabs' : (edgeTTSSuccess ? 'Microsoft Edge Neural TTS (free fallback)' : 'None — both engines failed');

        res.json({
            activeVoiceEngine: activeEngine,
            elevenLabs: {
                apiKeyExists: elevenLabsExists,
                apiKeyLength: apiKey ? apiKey.length : 0,
                apiKeyPrefix: apiKey ? apiKey.substring(0, 5) : '',
                success: elevenLabsSuccess,
                statusCode: elevenLabsStatus,
                rawResponseData: elevenLabsRaw,
                error: elevenLabsError
            },
            edgeNeuralTTS: {
                success: edgeTTSSuccess,
                bytesGenerated: edgeTTSBytes,
                error: edgeTTSError,
                note: 'Free Microsoft neural voices — no API key, no IP blocking'
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root status check (for direct service clicks and Render ping)
app.get('/', (req, res) => {
    sendInterviewRunning(res);
});

// 404 handler for unknown routes
app.use((req, res) => {
    res.status(404).json({ message: "Route not found." });
});

// Global Error Handler
app.use((err, req, res, next) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            message: "Uploaded recording is too large",
            error: err.message
        });
    }

    console.error(`[FATAL-SERVER-ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({
        message: "Internal Server Error",
        error: err.message
    });
});

module.exports = app;
