const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/talent-ecosystem", {
            // Connection pool: handle up to 10 concurrent DB operations
            // without blocking. Critical for high-traffic production.
            maxPoolSize: 10,
            minPoolSize: 2,

            // Timeouts tuned for production reliability
            serverSelectionTimeoutMS: 15000, // allow more time for cold-start Atlas clusters
            socketTimeoutMS: 45000,           // give existing queries time to finish
            connectTimeoutMS: 15000,          // TCP connection timeout

            // Heartbeat: detect dropped connections quickly
            heartbeatFrequencyMS: 10000,

            family: 4, // Force IPv4 to avoid Atlas IPv6 issues

            // Write concern: ensure writes are acknowledged by the primary
            // This prevents "phantom writes" that appear to succeed but are lost
            writeConcern: {
                w: 'majority',
                wtimeout: 10000
            },

            // Retry writes automatically on transient network errors
            retryWrites: true,
            retryReads: true,
        });
        console.log("Connected to MongoDB Cluster (IPv4, pool=10, writeConcern=majority)");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        throw err; // Throw instead of exit to allow caller to handle
    }
};

// ─── Connection Event Listeners ──────────────────────────────────────────────
// These fire throughout the application lifecycle, not just on initial connect

mongoose.connection.on('connected', () => {
    console.log('[MONGO] ✅ Connection established');
});

mongoose.connection.on('error', (err) => {
    console.error('[MONGO] ❌ Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('[MONGO] ⚠️ Disconnected from MongoDB. Mongoose will auto-reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('[MONGO] 🔄 Successfully reconnected to MongoDB');
});

// Handle process termination gracefully
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('[MONGO] Connection closed due to application termination');
        process.exit(0);
    } catch (err) {
        console.error('[MONGO] Error during graceful shutdown:', err);
        process.exit(1);
    }
});

module.exports = connectDB;
