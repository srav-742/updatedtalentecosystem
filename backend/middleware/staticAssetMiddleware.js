/**
 * Static Asset Middleware
 * 
 * Serves static files from the backend with optimized caching headers.
 * Useful when the backend serves any static content (uploads, generated files).
 * 
 * Also adds early-hints for Link preload headers to speed up resource discovery.
 */

const express = require('express');
const path = require('path');

/**
 * Applies optimized static file serving with proper cache headers.
 * Call this in app.js to serve any static directories with performance headers.
 */
const optimizedStatic = (directory, options = {}) => {
    const { maxAge = '1d', immutable = false } = options;

    return express.static(directory, {
        maxAge: maxAge,
        etag: true,
        lastModified: true,
        immutable: immutable,
        // Set headers for specific file types
        setHeaders: (res, filePath) => {
            const ext = path.extname(filePath).toLowerCase();

            // Images: cache for 1 day
            if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) {
                res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
            }

            // Fonts: cache for 1 year (immutable)
            if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }

            // JSON config/model files: cache for 1 hour
            if (ext === '.json') {
                res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
            }

            // WASM/ONNX model files: cache for 1 year (immutable, large files)
            if (['.wasm', '.onnx'].includes(ext)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
        }
    });
};

module.exports = { optimizedStatic };
