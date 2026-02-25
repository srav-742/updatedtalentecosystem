require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;
const { startCleanupJob } = require('./services/cleanupService');

const fs = require('fs');
const path = require('path');

// Ensure private storage exists
const privateDir = path.join(__dirname, 'private_storage/interviews');
if (!fs.existsSync(privateDir)) {
    fs.mkdirSync(privateDir, { recursive: true });
    console.log(`[STORAGE] Created private storage: ${privateDir}`);
}

app.listen(PORT, () => {
    console.log(`[CORE] TalentEcoSystem Server - RUNNING on Port: ${PORT}`);
    startCleanupJob();
});
