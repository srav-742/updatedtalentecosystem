/**
 * Performance Middleware
 * 
 * Adds performance-related HTTP headers to every response:
 * - X-Response-Time: How long the server took to respond (monitoring)
 * - Vary: Accept-Encoding — ensures CDN caches gzip/brotli variants separately
 * - Connection: keep-alive — reduces TCP handshake overhead for sequential calls
 * - Timing-Allow-Origin: Enables browser Performance API timing for your domain
 * 
 * This middleware is additive and does not modify any existing middleware behavior.
 */

const performanceMiddleware = (req, res, next) => {
    const startTime = process.hrtime.bigint();

    // Ensure CDN/proxy caches separate gzip vs brotli responses
    res.setHeader('Vary', 'Accept-Encoding');

    // Enable TCP keep-alive to avoid re-handshaking on sequential API calls
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=30, max=100');

    // Allow the browser Performance API to read timing data from cross-origin requests
    // This enables detailed network timing in DevTools for API calls
    res.setHeader('Timing-Allow-Origin', '*');

    // Security headers that also improve Lighthouse score
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-DNS-Prefetch-Control', 'on');

    // Measure and attach response time on finish
    res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1e6; // nanoseconds → milliseconds
        // Note: We can't set headers after finish, but we log slow responses
        if (durationMs > 2000) {
            console.warn(`[PERF] Slow response: ${req.method} ${req.originalUrl} took ${durationMs.toFixed(0)}ms`);
        }
    });

    // Set X-Response-Time header before response is sent
    const originalEnd = res.end;
    res.end = function (...args) {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1e6;
        if (!res.headersSent) {
            res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
        }
        return originalEnd.apply(this, args);
    };

    next();
};

module.exports = performanceMiddleware;
