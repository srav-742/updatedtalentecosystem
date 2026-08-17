/**
 * Retry utility with exponential backoff for critical database operations.
 * 
 * Usage:
 *   const { withRetry } = require('../utils/retry');
 *   const user = await withRetry(() => User.findOne({ email }), { maxAttempts: 3 });
 */

const withRetry = async (fn, options = {}) => {
    const {
        maxAttempts = 3,
        baseDelayMs = 300,
        maxDelayMs = 5000,
        label = 'operation'
    } = options;

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry on validation errors or intentional rejections
            if (error.name === 'ValidationError' || error.code === 11000) {
                throw error;
            }

            if (attempt < maxAttempts) {
                const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
                const jitter = Math.floor(Math.random() * delay * 0.3);
                const totalDelay = delay + jitter;
                console.warn(`[RETRY] ${label} failed (attempt ${attempt}/${maxAttempts}): ${error.message}. Retrying in ${totalDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, totalDelay));
            } else {
                console.error(`[RETRY] ${label} failed after ${maxAttempts} attempts: ${error.message}`);
            }
        }
    }
    throw lastError;
};

module.exports = { withRetry };
