const express = require('express');
const cors = require('cors');
const path = require('path');
const dns = require('dns');

// Fix for MongoDB SRV DNS resolution issues
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

// Middleware
app.use(cors({
    origin: '*', // For development, allow all origins. You can restrict this later.
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes');
const jobRoutes = require('./routes/jobRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const aiInterviewRoutes = require('./routes/aiInterviewRoutes');
const voiceRoutesNew = require('./routes/voice.routes'); // The new OpenAI routes
const calibrationRoutes = require('./routes/calibrationRoutes');
const interviewFeedbackRoutes = require('./routes/interviewFeedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');
const interviewRoutes = require('./routes/interview');

// Mount Routes
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', recruiterRoutes);
app.use('/api', jobRoutes);
app.use('/api', assessmentRoutes);
app.use('/api', resumeRoutes);
app.use('/api', voiceRoutes);
app.use('/api', applicationRoutes);
app.use('/api/interview', aiInterviewRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/v2/voice', voiceRoutesNew);
app.use('/api', calibrationRoutes);
app.use('/api/interview', interviewFeedbackRoutes);
app.use('/api', adminRoutes);

// Root route for health check / status
app.get('/', (req, res) => {
    res.json({
        status: "Active",
        message: "Updated Talent Ecosystem Backend is running successfully.",
        timestamp: new Date().toISOString()
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[FATAL-SERVER-ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({
        message: "Internal Server Error",
        error: err.message
    });
});

module.exports = app;
