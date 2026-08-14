/**
 * Production API Response Cache Middleware
 * 
 * Uses node-cache for fast in-memory caching of API responses.
 * - Serves cached responses instantly (sub-millisecond)
 * - Automatically expires based on per-route TTL
 * - Skips cache for authenticated user-specific routes
 * - Sets HTTP Cache-Control headers so browsers + CDN cache too
 */

const NodeCache = require('node-cache');

// Main cache store: TTL in seconds, check period every 120s
const apiCache = new NodeCache({
    stdTTL: 60,         // default 60s TTL
    checkperiod: 120,   // sweep expired keys every 2 minutes
    useClones: false,   // don't clone objects (faster, lower memory)
    deleteOnExpire: true,
});

/**
 * Creates a caching middleware for a specific route.
 * 
 * @param {number} ttlSeconds - How long to cache the response (seconds)
 * @param {Object} options
 * @param {string} [options.httpMaxAge] - Cache-Control max-age for browser/CDN (default: same as ttl)
 * @param {number} [options.staleWhileRevalidate] - Stale-while-revalidate seconds (default: 5x TTL)
 * @param {boolean} [options.varyByUser] - Include user ID in cache key (for user-specific data)
 */
const cacheMiddleware = (ttlSeconds = 60, options = {}) => {
    const {
        httpMaxAge = ttlSeconds,
        staleWhileRevalidate = ttlSeconds * 5,
        varyByUser = false,
    } = options;

    return (req, res, next) => {
        // Bypass cache for admin/recruiter routes and non-GET requests
        const urlLower = req.originalUrl.toLowerCase();
        if (req.method !== 'GET' || urlLower.includes('/admin') || urlLower.includes('/recruiter')) {
            return next();
        }

        // Build cache key
        const userId = varyByUser
            ? (req.headers['x-user-id'] || req.user?.uid || req.user?.id || 'anon')
            : '';
        const cacheKey = `${req.originalUrl}__${userId}`;

        // Check if cached response exists
        const cached = apiCache.get(cacheKey);
        if (cached !== undefined) {
            res.set('X-Cache', 'HIT');
            res.set('Cache-Control', `public, max-age=${httpMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
            return res.json(cached);
        }

        // Override res.json to intercept and cache the response
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                apiCache.set(cacheKey, data, ttlSeconds);
                res.set('X-Cache', 'MISS');
                res.set('Cache-Control', `public, max-age=${httpMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
            }
            return originalJson(data);
        };

        next();
    };
};

/**
 * Invalidates all cached keys matching a given prefix pattern.
 * Call this after POST/PUT/DELETE operations.
 * 
 * Example: invalidateCache('/api/jobs') clears all job listing caches.
 */
const invalidateCache = (urlPrefix) => {
    const keys = apiCache.keys();
    const deleted = [];
    for (const key of keys) {
        if (key.startsWith(urlPrefix)) {
            apiCache.del(key);
            deleted.push(key);
        }
    }
    if (deleted.length > 0) {
        console.log(`[CACHE] Invalidated ${deleted.length} key(s) matching "${urlPrefix}"`);
    }
    return deleted.length;
};

/**
 * Returns current cache statistics for monitoring.
 */
const getCacheStats = () => apiCache.getStats();

// Export the cache instance too for manual operations
module.exports = { cacheMiddleware, invalidateCache, getCacheStats, apiCache };
