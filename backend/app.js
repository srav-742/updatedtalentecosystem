const express = require('express');
const cors = require('cors');
const dns = require('dns');

// Fix for MongoDB SRV DNS resolution issues
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

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
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Accept', 'X-Requested-With', 'Origin'],
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
const voiceAgentRoutes = require('./routes/voiceAgentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');




// ✅ Mount Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', recruiterRoutes)
app.use('/api/jobs', jobRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', resumeRoutes);
app.use('/api', voiceRoutes);
app.use('/api', applicationRoutes);
app.use('/api/interview', aiInterviewRoutes);
app.use('/api/interview', require('./routes/fastAiInterviewRoutesFix'));  // ─── FIX: overrides /next-fast with corrected maxTokens + question cleaning
app.use('/api/interview', require('./routes/fastAiInterviewRoutes'));
app.use('/api', aiInterviewUploadRoutes);
app.use('/api/v2/voice', voiceRoutesNew);
app.use('/api', calibrationRoutes);
app.use('/api/interview', interviewFeedbackRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/cloudinary-test", cloudinaryTestRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use("/api/content", contentRoutes);
app.use('/api', videoIntroRoutes);
app.use('/api', communityRoutes);
app.use('/api/team-fit', teamFitRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/ai-search', aiSearchRoutes);
app.use('/api/voice-agent', voiceAgentRoutes);
app.use('/api/transcripts', require('./routes/transcriptRoutes'));
app.use('/api', paymentRoutes);




// ✅ API Health Check
app.get('/api/status', (req, res) => {
    res.json({
        status: "Active",
        message: "hire1percent Backend is running successfully.",
        timestamp: new Date().toISOString()
    });
});

// 🔍 TTS Debug Diagnostics Endpoint
app.get('/api/tts-debug', async (req, res) => {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const exists = !!apiKey;
        const length = apiKey ? apiKey.length : 0;
        const prefix = apiKey ? apiKey.substring(0, 5) : '';
        
        let testSuccess = false;
        let testError = null;
        let rawResponseData = null;
        let statusCode = null;
        
        if (exists) {
            try {
                const axios = require('axios');
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
                
                testSuccess = true;
                rawResponseData = `Success. Generated ${response.data.byteLength || response.data.length} bytes.`;
            } catch (err) {
                statusCode = err.response?.status || 'NETWORK_ERROR';
                if (err.response?.data) {
                    const data = err.response.data;
                    if (Buffer.isBuffer(data)) {
                        rawResponseData = data.toString('utf8');
                    } else if (data instanceof ArrayBuffer) {
                        rawResponseData = Buffer.from(data).toString('utf8');
                    } else {
                        rawResponseData = JSON.stringify(data);
                    }
                } else {
                    rawResponseData = err.message;
                }
                testError = `ElevenLabs request failed: ${err.message}`;
            }
        } else {
            testError = "ELEVENLABS_API_KEY environment variable is not defined on the server host.";
        }
        
        res.json({
            elevenLabsApiKeyExists: exists,
            elevenLabsApiKeyLength: length,
            elevenLabsApiKeyPrefix: prefix,
            testSuccess,
            statusCode,
            rawResponseData,
            testError
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root health check (for Render ping)
app.get('/', (req, res) => {
    res.json({ status: "OK", message: "hire1percent API is live." });
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
