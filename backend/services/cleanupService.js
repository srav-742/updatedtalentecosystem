const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');

const INTERVIEWS_DIR = path.join(__dirname, "../private_storage/interviews");

const startCleanupJob = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[CLEANUP] Starting scheduled cleanup of old recordings...');

        try {
            if (!fs.existsSync(INTERVIEWS_DIR)) return;

            const folders = await fs.readdir(INTERVIEWS_DIR);
            const now = Date.now();
            const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

            for (const folder of folders) {
                const folderPath = path.join(INTERVIEWS_DIR, folder);
                const stats = await fs.stat(folderPath);

                // If folder is older than 30 days, delete it
                if (now - stats.mtimeMs > retentionPeriod) {
                    console.log(`[CLEANUP] Deleting old interview folder: ${folder}`);
                    await fs.remove(folderPath);
                }
            }
            console.log('[CLEANUP] Cleanup completed.');
        } catch (error) {
            console.error('[CLEANUP] Error during cleanup:', error);
        }
    });

    console.log('[SERVICES] Cleanup job scheduled (30-day retention)');
};

module.exports = { startCleanupJob };
