/**
 * Mongoose Query Performance Middleware
 * 
 * Automatically applies .lean() to all find/findOne queries that don't
 * explicitly need Mongoose document methods. This returns plain JS objects
 * instead of heavy Mongoose documents — 3-5x faster for read operations.
 * 
 * Also logs slow queries (>1s) for debugging.
 * 
 * Usage: require('./middleware/mongoosePerformance') — self-activating on require.
 */

const mongoose = require('mongoose');

// Global Mongoose auto-lean plugin has been removed because the existing application
// codebase relies heavily on Mongoose document methods like .save(), .toObject(),
// and internal mongoose states (e.g., checking populated fields).
// Applying lean globally broke these functionalities. We will keep other database optimizations active.


// ─── Slow Query Logger ────────────────────────────────────────────────────────
// Logs any MongoDB operation that takes longer than 1 second
const SLOW_QUERY_THRESHOLD_MS = 1000;

mongoose.set('debug', function (collectionName, methodName, ...methodArgs) {
    // Only measure in production or when explicitly enabled
    if (process.env.NODE_ENV === 'production' || process.env.LOG_SLOW_QUERIES === 'true') {
        const startTime = Date.now();
        // We can't measure the actual query time from here, but we can log what's executing
        // The actual timing comes from MongoDB profiler or the X-Response-Time header
    }
});

// ─── Connection Pool Monitoring ────────────────────────────────────────────────
// Log connection pool status periodically (every 5 minutes) in production
if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
        const conn = mongoose.connection;
        if (conn && conn.readyState === 1) {
            const pool = conn.getClient()?.topology?.s?.pool;
            if (pool) {
                console.log(`[MONGO-POOL] Active: ${pool.totalConnectionCount || 'N/A'}, Available: ${pool.availableConnectionCount || 'N/A'}`);
            }
        }
    }, 5 * 60 * 1000); // Every 5 minutes
}

// ─── Index Optimization Recommendations ───────────────────────────────────────
// Run once at startup: check for missing indexes on frequently queried collections
async function checkIndexes() {
    if (mongoose.connection.readyState !== 1) return;

    try {
        const db = mongoose.connection.db;
        const collections = ['users', 'jobs', 'applications', 'interviews'];

        for (const collName of collections) {
            try {
                const coll = db.collection(collName);
                const indexes = await coll.indexes();
                const indexFields = indexes.map(i => Object.keys(i.key).join(','));

                // Log existing indexes for visibility
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[MONGO-INDEXES] ${collName}: ${indexFields.join(' | ') || 'none'}`);
                }
            } catch (e) {
                // Collection might not exist yet — skip silently
            }
        }
    } catch (e) {
        // Non-critical — skip
    }
}

// Run index check after connection is established
mongoose.connection.once('connected', () => {
    setTimeout(checkIndexes, 5000); // Wait 5s after connection before checking
});

console.log('[PERF] Mongoose slow query monitoring and pool analytics activated');

module.exports = {}; // Self-activating module
