const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');

const INTERVIEWS_DIR = path.join(__dirname, "../private_storage/interviews");
const TEMP_CHUNKS_DIR = path.join(__dirname, "../private_storage/temp_chunks");
const TEMP_RECORDINGS_DIR = path.join(__dirname, "../private_storage/interview-recordings-temp");

const startCleanupJob = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[CLEANUP] Starting scheduled cleanup...');

        try {
            // --- 1. Remove old interview folders (30-day retention) ---
            if (fs.existsSync(INTERVIEWS_DIR)) {
                const folders = await fs.readdir(INTERVIEWS_DIR);
                const now = Date.now();
                const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

                for (const folder of folders) {
                    const folderPath = path.join(INTERVIEWS_DIR, folder);
                    const stats = await fs.stat(folderPath);

                    if (now - stats.mtimeMs > retentionPeriod) {
                        console.log(`[CLEANUP] Deleting old interview folder: ${folder}`);
                        await fs.remove(folderPath);
                    }
                }
            }

            // --- 2. Remove orphaned temp_chunks (24-hour retention) ---
            if (fs.existsSync(TEMP_CHUNKS_DIR)) {
                const chunkSessions = await fs.readdir(TEMP_CHUNKS_DIR);
                const now = Date.now();
                const chunkRetention = 24 * 60 * 60 * 1000; // 24 hours

                for (const session of chunkSessions) {
                    const sessionPath = path.join(TEMP_CHUNKS_DIR, session);
                    const stats = await fs.stat(sessionPath);

                    if (now - stats.mtimeMs > chunkRetention) {
                        console.log(`[CLEANUP] Deleting orphaned chunk session: ${session}`);
                        await fs.remove(sessionPath);
                    }
                }
            }

            // --- 3. Remove stale merged temp recordings (24-hour retention) ---
            if (fs.existsSync(TEMP_RECORDINGS_DIR)) {
                const tempFiles = await fs.readdir(TEMP_RECORDINGS_DIR);
                const now = Date.now();
                const tempRetention = 24 * 60 * 60 * 1000; // 24 hours

                for (const file of tempFiles) {
                    const filePath = path.join(TEMP_RECORDINGS_DIR, file);
                    const stats = await fs.stat(filePath);

                    if (now - stats.mtimeMs > tempRetention) {
                        console.log(`[CLEANUP] Deleting stale temp recording: ${file}`);
                        await fs.remove(filePath);
                    }
                }
            }

            console.log('[CLEANUP] Cleanup completed.');
        } catch (error) {
            console.error('[CLEANUP] Error during cleanup:', error);
        }
    });

    console.log('[SERVICES] Cleanup job scheduled (30-day interviews, 24-hour temp files)');
};

module.exports = { startCleanupJob };

