require('./utils/codingTranscriptPatch');
require('./middleware/mongoosePerformance'); // Auto-lean plugin for 3-5x faster DB reads
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const compression = require('compression');
const { cacheMiddleware } = require('./middleware/cacheMiddleware');

// Fix for MongoDB SRV DNS resolution issues (only in development environments)
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const app = express();

// Fastest compression: level 1 gives ~60% size reduction at maximum speed
// Level 6 (default) is 3x slower with only ~5% better compression
app.use(compression({
    level: 1,           // fastest deflate level — best for high-throughput APIs
    threshold: 512,     // compress responses > 512 bytes (lower than default 1KB)
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

// Enable ETag so browsers can do conditional GET (304 Not Modified)
// This means unchanged responses return instantly with 0 bytes transferred
app.set('etag', 'strong');

// Performance headers: response timing, keep-alive, CDN cache separation
app.use(require('./middleware/performanceMiddleware'));

// Middleware
const corsOptions = {
    origin: (origin, callback) => {
        // Broadly allow hire1percent.com, admin dashboard and localhost
        if (!origin ||
            origin.includes('hire1percent.com') ||
            origin.includes('hire1admindashboard.vercel.app') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            console.log(`[CORS] Rejected Origin: ${origin}`);
            callback(null, true); // Still allow for now to resolve the blocker
        }
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Accept', 'X-Requested-With', 'Origin', 'X-Client-ID', 'X-Client-Secret', 'X-Refresh-Token', 'ACCESS_TOKEN', 'Cache-Control', 'Pragma', 'cache-control', 'pragma'],
    exposedHeaders: ['X-New-Access-Token'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    optionsSuccessStatus: 200
};

app.use((req, res, next) => {
    const gatewaySecret = req.headers['x-gateway-secret'];
    const trustedSecret = process.env.GATEWAY_SHARED_SECRET;
    if (trustedSecret && gatewaySecret && gatewaySecret === trustedSecret) {
        return next();
    }
    cors(corsOptions)(req, res, next);
});

// Explicitly handle all preflight OPTIONS requests to guarantee CORS headers
app.options('/{*path}', cors(corsOptions));

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
const aiInterviewRoutes = require('./routes/aiInterviewRoutes');
const aiInterviewUploadRoutes = require('./routes/interviewRecordingRoutes');
const voiceRoutesNew = require('./routes/voice.routes');
const calibrationRoutes = require('./routes/calibrationRoutes');
const interviewFeedbackRoutes = require('./routes/interviewFeedbackRoutes');
const agentRoutes = require("./routes/agentRoutes");
const cloudinaryTestRoutes = require("./routes/cloudinaryTest.routes");
const applicationRoutes = require('./routes/applicationRoutes');
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
const adminPilotRoutes = require('./routes/adminPilotRoutes');

// Helper for interview service health payload
const sendInterviewHealth = (res, message = "Interview Service is healthy.", extra = {}) => {
    return res.status(200).json({
        success: true,
        service: "talent-interview-service",
        message,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ...extra
    });
};

// ==========================================
// API Gateway Health & Diagnostic Probes
// (Declared BEFORE gateway middleware to allow public access)
// ==========================================

app.get('/health', (req, res) => {
    sendInterviewHealth(res);
});

app.get('/api/health', (req, res) => {
    sendInterviewHealth(res);
});

app.get('/live', (req, res) => {
    sendInterviewHealth(res, "Interview Service is live.", {
        alive: true,
        memoryUsage: process.memoryUsage()
    });
});

app.get('/ready', (req, res) => {
    const mongoose = require('mongoose');
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
        return res.status(503).json({
            success: false,
            service: "talent-interview-service",
            message: "Database connection not ready.",
            timestamp: new Date().toISOString()
        });
    }

    sendInterviewHealth(res, "Interview Service is ready to accept traffic.", {
        ready: true,
        database: "connected"
    });
});

app.get('/api/status', (req, res) => {
    const mongoose = require('mongoose');
    res.status(200).json({
        status: "online",
        service: "talent-interview-service",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
    });
});

// ✅ 2. Apply Global Gateway Middleware for all other /api routes
const { gatewayMiddleware } = require('./middleware/gatewayMiddleware');
app.use('/api', gatewayMiddleware);
app.use('/api/gateway', gatewayRoutes);

// ✅ Register Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', recruiterRoutes);
app.use('/api', adminPilotRoutes);

// 🚀 High-traffic read routes — wrapped with cache middleware for instant responses
// Jobs: cache 5 min (data changes rarely, public endpoint)
app.use('/api/jobs', cacheMiddleware(300, { httpMaxAge: 60, staleWhileRevalidate: 600 }), jobRoutes);
app.use('/api', cacheMiddleware(300, { httpMaxAge: 60, staleWhileRevalidate: 600 }), jobRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', resumeRoutes);
app.use('/api', voiceRoutes);

// Applications: cache 30s per user (user-specific so varyByUser = true, but do NOT let browser cache it locally)
app.use('/api', cacheMiddleware(30, { httpMaxAge: 0, staleWhileRevalidate: 0, varyByUser: true }), applicationRoutes);
app.use('/api/interview/technical', require('./routes/technicalInterviewRoutes')); // ─── Live Technical Problem-Solving Routes
app.use('/api/interview', require('./routes/keyPointInterceptor'));      // ─── Key-Point Interceptor (overrides /next-fast for AI_GENERATED with key-point follow-up logic)
app.use('/api/interview', require('./routes/fastAiInterviewRoutesFix'));  // ─── FIX Overlay (overrides /start and /next-fast for RECRUITER_PROVIDED)
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
app.use('/api/proctoring-pipeline', require('./routes/proctoringEventRoutes'));
// Content & Blog: cache 3 min (public read-heavy endpoints)
app.use("/api/content", cacheMiddleware(180, { httpMaxAge: 60, staleWhileRevalidate: 600 }), contentRoutes);
app.use("/api", cacheMiddleware(180, { httpMaxAge: 60, staleWhileRevalidate: 600 }), require("./blog"));
app.use('/api', videoIntroRoutes);
app.use('/api', communityRoutes);
app.use('/api/team-fit', teamFitRoutes);
// Insights & Search: cache 2 min (computed data, expensive queries)
app.use('/api/insights', cacheMiddleware(120, { httpMaxAge: 30, staleWhileRevalidate: 300 }), insightRoutes);
app.use('/api/ai-search', cacheMiddleware(60, { httpMaxAge: 0, staleWhileRevalidate: 120, varyByUser: true }), aiSearchRoutes);

// Dynamically load coding assessment routes to prevent crashes if files are missing/reverted
try {
    app.use('/api/coding-assessments', require('./routes/codingAssessmentRoutes'));
} catch (err) {
    console.warn('[App] Skipping /api/coding-assessments routes:', err.message);
}

try {
    app.use('/api/custom-coding-assessments', require('./routes/customCodingAssessmentRoutes'));
} catch (err) {
    console.warn('[App] Skipping /api/custom-coding-assessments routes:', err.message);
}

try {
    app.use('/api/question-bank', require('./routes/questionBankRoutes'));
} catch (err) {
    console.warn('[App] Skipping /api/question-bank routes:', err.message);
}

app.use('/api/voice-agent', voiceAgentRoutes);
app.use('/api/transcripts', require('./routes/transcriptRoutes'));
app.use('/api/user-resumes', require('./routes/userResumeRoutes'));
app.use('/api', require('./routes/recruiterUploadRoutes'));
app.use('/api', paymentRoutes);
app.use('/api/recruiter-knowledge', require('./routes/knowledgeHubRoutes'));
app.use('/api/candidate/job-readiness', require('./routes/jobReadinessRoutes'));
try {
    app.use('/api/candidate-career', require('./routes/candidateCareerRoutes'));
} catch (err) {
    console.warn('[App] Skipping /api/candidate-career routes:', err.message);
}

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
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': apiKey.trim()
                    },
                    data: {
                        text: 'Diagnostics test.',
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                    },
                    responseType: 'arraybuffer',
                    timeout: 8000
                });
                elevenLabsStatus = response.status;
                elevenLabsSuccess = response.status === 200 && response.data.length > 0;
            } catch (err) {
                elevenLabsStatus = err.response ? err.response.status : null;
                elevenLabsError = err.message;
                if (err.response && err.response.data) {
                    try {
                        elevenLabsRaw = JSON.parse(Buffer.from(err.response.data).toString('utf-8'));
                    } catch (e) {
                        elevenLabsRaw = Buffer.from(err.response.data).toString('utf-8').substring(0, 300);
                    }
                }
            }
        }

        // ── Test Edge TTS ─────────────────────────────────────────────────────
        let edgeTtsSuccess = false;
        let edgeTtsError = null;
        try {
            const { generateEdgeSpeech } = require('./services/tts.service');
            const testBuffer = await generateEdgeSpeech('Diagnostics test.');
            edgeTtsSuccess = testBuffer && testBuffer.length > 0;
        } catch (err) {
            edgeTtsError = err.message;
        }

        return res.status(200).json({
            timestamp: new Date().toISOString(),
            elevenLabs: {
                configured: elevenLabsExists,
                apiKeyPrefix: apiKey ? apiKey.substring(0, 6) + '...' : null,
                statusCode: elevenLabsStatus,
                success: elevenLabsSuccess,
                error: elevenLabsError,
                rawResponse: elevenLabsRaw
            },
            edgeTtsFallback: {
                success: edgeTtsSuccess,
                error: edgeTtsError
            },
            recommendation: !elevenLabsSuccess
                ? "ElevenLabs failed. Edge Neural TTS is active and will serve audio transparently."
                : "ElevenLabs is working normally."
        });
    } catch (unexpected) {
        return res.status(500).json({ error: unexpected.message });
    }
});

module.exports = app;
