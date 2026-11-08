/**
 * In-memory response cache middleware for high-traffic read endpoints.
 * Reduces DB load and response time to <5ms for cached responses.
 *
 * Usage:
 *   router.get('/jobs', cacheMiddleware(300), jobController.getJobs); // 5 min cache
 *   router.get('/profile', cacheMiddleware(60, { varyByUser: true }), ...);
 */

const mcache = require('memory-cache');

/**
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {object} [options]
 * @param {boolean} [options.varyByUser=false] - If true, cache key includes x-user-id header
 * @param {number} [options.httpMaxAge] - If set, sets HTTP Cache-Control max-age header (browser caching)
 * @param {number} [options.staleWhileRevalidate] - stale-while-revalidate duration in seconds
 */
const cacheMiddleware = (ttlSeconds = 60, options = {}) => {
    const {
        varyByUser = false,
        httpMaxAge = 0,
        staleWhileRevalidate = 0,
    } = options;

    return (req, res, next) => {
        // Bypass cache for admin/recruiter paths, non-GET requests, or explicit no-cache headers
        const urlLower = req.originalUrl.toLowerCase();
        const isNoCache = req.headers['cache-control'] && req.headers['cache-control'].includes('no-cache');
        const hasCacheBuster = Boolean(req.query && (req.query._t || req.query.timestamp));
        if (req.method !== 'GET' || urlLower.includes('/admin') || urlLower.includes('/recruiter') || isNoCache || hasCacheBuster) {
            return next();
        }

        // Build cache key
        const userId = varyByUser
            ? (req.headers['x-user-id'] || req.user?.uid || req.user?.id || req.params?.userId || 'anon')
            : '';
        const cacheKey = `${req.originalUrl}__${userId}`;

        const cachedBody = mcache.get(cacheKey);
        if (cachedBody) {
            res.setHeader('X-Cache', 'HIT');
            if (httpMaxAge > 0) {
                const swr = staleWhileRevalidate ? `, stale-while-revalidate=${staleWhileRevalidate}` : '';
                res.setHeader('Cache-Control', `public, max-age=${httpMaxAge}${swr}`);
            }
            return res.json(cachedBody);
        }

        // Intercept res.json to store response before sending
        res.setHeader('X-Cache', 'MISS');
        if (httpMaxAge > 0) {
            const swr = staleWhileRevalidate ? `, stale-while-revalidate=${staleWhileRevalidate}` : '';
            res.setHeader('Cache-Control', `public, max-age=${httpMaxAge}${swr}`);
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            // Only cache successful 2xx responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                mcache.put(cacheKey, body, ttlSeconds * 1000);
            }
            return originalJson(body);
        };

        next();
    };
};

/**
 * Invalidate cache for a specific URL prefix.
 * Call this in mutation controllers (e.g., after creating/updating a job).
 * @param {string} urlPrefix - e.g. '/api/jobs'
 */
const invalidateCache = (urlPrefix) => {
    const keys = mcache.keys();
    let count = 0;
    keys.forEach((key) => {
        if (key.startsWith(urlPrefix)) {
            mcache.del(key);
            count++;
        }
    });
    if (count > 0) {
        console.log(`[Cache] Invalidated ${count} entries for prefix: ${urlPrefix}`);
    }
};

module.exports = { cacheMiddleware, invalidateCache };
