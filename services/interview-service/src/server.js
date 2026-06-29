const fs = require('fs');
const path = require('path');

const serviceRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const backendRoot = path.join(projectRoot, 'backend');

const runtimePort = process.env.PORT || '5007';

require(path.join(backendRoot, 'node_modules', 'dotenv')).config({
    path: path.join(backendRoot, '.env'),
    override: true
});

try {
    require(path.join(backendRoot, 'node_modules', 'dotenv')).config({
        path: path.join(serviceRoot, '.env'),
        override: true
    });
} catch (_) {
    // Local interview-service .env is optional; backend .env carries the shared secrets.
}

process.env.PORT = runtimePort;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const connectDB = require(path.join(backendRoot, 'config', 'db'));
const app = require(path.join(backendRoot, 'app'));
const seedAdmin = require(path.join(backendRoot, 'utils', 'seedAdmin'));
const { startCleanupJob } = require(path.join(backendRoot, 'services', 'cleanupService'));

let server;

const startServer = async () => {
    try {
        const privateDir = path.join(backendRoot, 'private_storage', 'interviews');
        if (!fs.existsSync(privateDir)) {
            fs.mkdirSync(privateDir, { recursive: true });
            console.log(`[INTERVIEW-SERVICE] Created private storage: ${privateDir}`);
        }

        await connectDB();

        const port = Number(process.env.PORT) || 5007;
        server = app.listen(port, async () => {
            console.log('=====================================================');
            console.log(`? Interview Service listening on port ${port}`);
            console.log(`   Local:   http://localhost:${port}`);
            console.log(`   Health:  http://localhost:${port}/health`);
            console.log(`   Ready:   http://localhost:${port}/ready`);
            console.log(`   Live:    http://localhost:${port}/live`);
            console.log('=====================================================');

            await seedAdmin();
            startCleanupJob();
        });
    } catch (err) {
        console.error('[INTERVIEW-SERVICE:FATAL] Failed to start server:', err.message);
        process.exit(1);
    }
};

const shutdown = (signal) => {
    console.log(`[INTERVIEW-SERVICE] Received ${signal}. Shutting down...`);
    if (!server) process.exit(0);

    server.close(() => {
        console.log('[INTERVIEW-SERVICE] HTTP server closed.');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('[INTERVIEW-SERVICE] Force shutdown after timeout.');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();