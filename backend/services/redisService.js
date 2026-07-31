const Redis = require('ioredis');

/**
 * Redis Caching Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Provides high-performance caching for proctoring sessions, scores, and device
 * fingerprints. Automatically falls back to a robust in-memory cache if the Redis
 * server is unreachable or offline.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Fallback in-memory cache
const memoryCache = new Map();
const memoryExpirations = new Map();

let redisClient = null;
let isConnected = false;

try {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || null;

    const redisOptions = {
        host,
        port,
        maxRetriesPerRequest: 2,
        enableOfflineQueue: false, // Prevent request stacking during downtime
        connectTimeout: 2000,
    };

    if (password) {
        redisOptions.password = password;
    }

    redisClient = new Redis(redisOptions);

    redisClient.on('connect', () => {
        isConnected = true;
        console.log('[Redis] Connected to caching server successfully.');
    });

    redisClient.on('error', (err) => {
        isConnected = false;
        console.warn('[Redis] Connection offline. Falling back to in-memory store:', err.message);
    });
} catch (err) {
    console.warn('[Redis] Failed to initialize client. Utilizing in-memory fallback:', err.message);
}

/**
 * Cache a key-value pair
 */
const set = async (key, value, ttlSeconds = 3600) => {
    const stringified = JSON.stringify(value);
    
    if (isConnected && redisClient) {
        try {
            await redisClient.set(key, stringified, 'EX', ttlSeconds);
            return true;
        } catch (err) {
            console.warn('[Redis] SET operation failed, writing to memory cache:', err.message);
        }
    }

    // In-memory fallback
    memoryCache.set(key, stringified);
    memoryExpirations.set(key, Date.now() + (ttlSeconds * 1000));
    return true;
};

/**
 * Retrieve a cached value
 */
const get = async (key) => {
    if (isConnected && redisClient) {
        try {
            const data = await redisClient.get(key);
            if (data) return JSON.parse(data);
        } catch (err) {
            console.warn('[Redis] GET operation failed, reading from memory cache:', err.message);
        }
    }

    // Check in-memory fallback
    const expiration = memoryExpirations.get(key);
    if (expiration && Date.now() > expiration) {
        memoryCache.delete(key);
        memoryExpirations.delete(key);
        return null;
    }

    const memoryData = memoryCache.get(key);
    return memoryData ? JSON.parse(memoryData) : null;
};

/**
 * Delete a cached key
 */
const del = async (key) => {
    if (isConnected && redisClient) {
        try {
            await redisClient.del(key);
            return true;
        } catch (err) {
            console.warn('[Redis] DEL operation failed, deleting from memory cache:', err.message);
        }
    }

    memoryCache.delete(key);
    memoryExpirations.delete(key);
    return true;
};

module.exports = {
    set,
    get,
    del,
    redisClient,
    isRedisConnected: () => isConnected,
};
