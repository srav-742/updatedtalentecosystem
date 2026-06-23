const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, refreshAccessToken, validateClient } = require('../services/authService');

/**
 * POST /api/gateway/token
 * Issue access + refresh tokens after user login
 * 
 * Body: { email, uid }
 * Headers: X-Client-ID, X-Client-Secret
 */
router.post('/token', async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const clientSecret = req.headers['x-client-secret'];

        // Validate client credentials
        if (!clientId || !clientSecret) {
            return res.status(401).json({
                success: false,
                message: 'Client credentials required.'
            });
        }

        const client = await validateClient(clientId, clientSecret);
        if (!client) {
            return res.status(401).json({
                success: false,
                message: 'Invalid client credentials.'
            });
        }

        const { email, uid } = req.body;
        if (!email && !uid) {
            return res.status(400).json({
                success: false,
                message: 'Email or UID is required.'
            });
        }

        // Find the user
        const query = uid ? { uid } : { email };
        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        return res.status(200).json({
            success: true,
            message: 'Tokens issued successfully.',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                uid: user.uid,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('[GATEWAY] Token generation error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate tokens.',
            error: error.message
        });
    }
});

/**
 * POST /api/gateway/refresh
 * Refresh an expired access token using a valid refresh token
 * 
 * Body: { refreshToken }
 * Headers: X-Client-ID, X-Client-Secret
 */
router.post('/refresh', async (req, res) => {
    try {
        const clientId = req.headers['x-client-id'];
        const clientSecret = req.headers['x-client-secret'];

        // Validate client credentials
        if (!clientId || !clientSecret) {
            return res.status(401).json({
                success: false,
                message: 'Client credentials required.'
            });
        }

        const client = await validateClient(clientId, clientSecret);
        if (!client) {
            return res.status(401).json({
                success: false,
                message: 'Invalid client credentials.'
            });
        }

        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required.'
            });
        }

        const result = await refreshAccessToken(refreshToken);

        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully.',
            accessToken: result.accessToken,
            user: {
                id: result.user._id,
                uid: result.user.uid,
                name: result.user.name,
                email: result.user.email,
                role: result.user.role
            }
        });

    } catch (error) {
        const statusCode = error.code === 'SESSION_EXPIRED' ? 401 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message,
            code: error.code || 'REFRESH_ERROR'
        });
    }
});

/**
 * GET /api/gateway/validate
 * Validate whether a current access token is still valid
 * 
 * Headers: Authorization: Bearer <token>
 */
router.get('/validate', async (req, res) => {
    try {
        const { verifyAccessToken } = require('../services/authService');

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, valid: false, message: 'No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        return res.status(200).json({
            success: true,
            valid: true,
            user: {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
                name: decoded.name
            }
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            valid: false,
            message: error.message,
            code: error.code
        });
    }
});

module.exports = router;
