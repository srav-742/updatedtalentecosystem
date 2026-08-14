const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/talent-ecosystem", {
            // Connection pool: handle up to 10 concurrent DB operations
            // without blocking. Critical for high-traffic production.
            maxPoolSize: 10,
            minPoolSize: 2,

            // Timeouts tuned for production reliability
            serverSelectionTimeoutMS: 10000, // fail fast if no DB server found
            socketTimeoutMS: 45000,           // give existing queries time to finish
            connectTimeoutMS: 10000,          // TCP connection timeout

            // Heartbeat: detect dropped connections quickly
            heartbeatFrequencyMS: 10000,

            family: 4, // Force IPv4 to avoid Atlas IPv6 issues
        });
        console.log("Connected to MongoDB Cluster (IPv4, pool=10)");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        throw err; // Throw instead of exit to allow caller to handle
    }
};

module.exports = connectDB;
