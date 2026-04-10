const express = require('express');
const cors = require('cors');
const dns = require('dns');

// Fix for MongoDB SRV DNS resolution issues
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

// Middleware
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'https://www.hire1percent.com',
            'https://hire1percent.com',
            'https://api.hire1percent.com',
            'https://updatedtalentecosystem.onrender.com'
        ];
        
        // Simple check for allowed domains and localhost
        if (!origin || 
            allowedOrigins.includes(origin) || 
            origin.startsWith('http://localhost:') || 
            origin.endsWith('.hire1percent.com')) {
            callback(null, true);
        } else {
            console.log(`[CORS] Origin "${origin}" not explicitly in list, but checking...`);
            callback(null, true); // Fallback to allowing for now to resolve user blocker
        }
    },
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'Accept', 'X-Requested-With', 'Origin', 'Access-Control-Allow-Origin'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    optionsSuccessStatus: 200 
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes


app.use((req, res, next) => {
    // Only set COOP for routes that need popup windows
    if (req.path.includes('/auth/') || req.path.includes('/oauth/')) {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    }
    next();
});
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


// ✅ Mount Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', recruiterRoutes);
app.use('/api', jobRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', resumeRoutes);
app.use('/api', voiceRoutes);
app.use('/api', applicationRoutes);
app.use('/api/interview', aiInterviewRoutes);
app.use('/api', aiInterviewUploadRoutes);
app.use('/api/v2/voice', voiceRoutesNew);
app.use('/api', calibrationRoutes);
app.use('/api/interview', interviewFeedbackRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/cloudinary-test", cloudinaryTestRoutes);
app.use('/api/proctoring', proctoringRoutes);

// ✅ API Health Check
app.get('/api/status', (req, res) => {
    res.json({
        status: "Active",
        message: "hire1percent Backend is running successfully.",
        timestamp: new Date().toISOString()
    });
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
