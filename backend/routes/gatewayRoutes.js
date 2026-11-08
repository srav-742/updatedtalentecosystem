const express = require('express');
const router = express.Router();
const User = require('../models/User');
const admin = require('../config/firebase');
const {
    generateAccessToken,
    generateRefreshToken,
    refreshAccessToken,
    validateClientCredentials,
    verifyAccessToken,
    verifyRefreshToken,
    getUserRoles
} = require('../services/authService');

const validateClient = async (req, res) => {
    const clientId = req.headers['x-client-id'];
    const clientSecret = req.headers['x-client-secret'];
    if (!clientId || !clientSecret) {
        res.status(401).json({ success: false, message: 'Client credentials required.' });
        return null;
    }

    const client = await validateClientCredentials(clientId, clientSecret);
    if (!client) {
        res.status(401).json({ success: false, message: 'Invalid client credentials.' });
        return null;
    }

    return client;
};

router.post('/token', async (req, res) => {
    try {
        const client = await validateClient(req, res);
        if (!client) return;

        if (admin.apps.length === 0) {
            return res.status(503).json({ success: false, message: 'Firebase authentication is unavailable.' });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'A Firebase ID token is required.' });
        }

        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(authHeader.slice('Bearer '.length));
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid Firebase ID token.' });
        }

        const { email, uid } = req.body;
        if ((uid && uid !== decodedToken.uid)
            || (email && email.toLowerCase() !== (decodedToken.email || '').toLowerCase())) {
            return res.status(403).json({ success: false, message: 'The requested account does not match the authenticated user.' });
        }

        const user = await User.findOne({ uid: decodedToken.uid });
        if (!user || user.isActive === false) {
            return res.status(401).json({ success: false, message: 'User account is unavailable.' });
        }

        const clientId = req.headers['x-client-id'];
        const roles = getUserRoles(user);
        const accessToken = generateAccessToken(user, clientId, roles);
        const refreshToken = generateRefreshToken(user, clientId);

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
        console.error('[GATEWAY] Token generation failed:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to generate gateway tokens.' });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const client = await validateClient(req, res);
        if (!client) return;

        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token is required.' });
        }

        const clientId = req.headers['x-client-id'];
        const decodedToken = verifyRefreshToken(refreshToken);
        if (decodedToken.clientId !== clientId) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
        }

        const result = await refreshAccessToken(refreshToken);
        return res.status(200).json({
            success: true,
            message: 'Token refreshed successfully.',
            accessToken: result.accessToken
        });
    } catch (error) {
        const invalidToken = error.name === 'TokenExpiredError'
            || error.name === 'JsonWebTokenError'
            || error.code === 'SESSION_EXPIRED';
        const statusCode = invalidToken ? 401 : 500;
        return res.status(statusCode).json({
            success: false,
            message: invalidToken ? 'Invalid or expired refresh token.' : 'Failed to refresh token.',
            code: invalidToken ? 'SESSION_EXPIRED' : 'REFRESH_ERROR'
        });
    }
});

router.get('/validate', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, valid: false, message: 'No token provided.' });
    }

    try {
        const decoded = verifyAccessToken(authHeader.slice('Bearer '.length));
        return res.status(200).json({
            success: true,
            valid: true,
            user: {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.roles?.[0],
                name: decoded.name
            }
        });
    } catch {
        return res.status(401).json({
            success: false,
            valid: false,
            message: 'Invalid or expired access token.'
        });
    }
});

module.exports = router;
