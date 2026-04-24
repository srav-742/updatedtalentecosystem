require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

const { startCleanupJob } = require('./services/cleanupService');
const seedAdmin = require('./utils/seedAdmin');
const fs = require('fs');
const path = require('path');

const startServer = async () => {
    try {
        // Ensure private storage exists
        const privateDir = path.join(__dirname, 'private_storage/interviews');
        if (!fs.existsSync(privateDir)) {
            fs.mkdirSync(privateDir, { recursive: true });
            console.log(`[STORAGE] Created private storage: ${privateDir}`);
        }

        // Connect to MongoDB first
        await connectDB();

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, async () => {
            console.log(`[CORE] TalentEcoSystem Server - RUNNING on Port: ${PORT}`);
            await seedAdmin();
            startCleanupJob();
        });
    } catch (err) {
        console.error("[FATAL] Failed to start server:", err.message);
        process.exit(1);
    }
};

startServer();


// server.js remains clean and only handles initialization

// Note: /generate-posts is now handled via app.js and routes/index.js

// Content generation is handled in cron/contentCron.js