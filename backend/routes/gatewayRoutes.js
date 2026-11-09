const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Client = require('../models/Client');
const admin = require('../config/firebase');
const {
    generateAccessToken,
    generateRefreshToken,
    refreshAccessToken,
    verifyAccessToken,
    verifyRefreshToken,
    getUserRoles
} = require('../services/authService');

const PUBLIC_CLIENT_ID = process.env.GATEWAY_PUBLIC_CLIENT_ID || 'hire1percent_web_client';

const validatePublicClient = async (req, res) => {
    const clientId = req.headers['x-client-id'];
    if (clientId !== PUBLIC_CLIENT_ID) {
        res.status(401).json({ success: false, message: 'Invalid gateway client.' });
        return null;
    }

    const client = await Client.findOne({ clientId, status: 'active' });
    if (!client) {
        res.status(401).json({ success: false, message: 'Gateway client is unavailable.' });
        return null;
    }

    return client;
};

router.post('/token', async (req, res) => {
    try {
        const client = await validatePublicClient(req, res);
        if (!client) return;

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'A Firebase ID token is required.' });
        }

        let decodedToken;
        try {
            if (admin.apps.length > 0) {
                decodedToken = await admin.auth().verifyIdToken(authHeader.slice('Bearer '.length));
            } else {
                const jwt = require('jsonwebtoken');
                const rawToken = authHeader.slice('Bearer '.length);
                decodedToken = jwt.decode(rawToken);
                if (!decodedToken || (!decodedToken.uid && !decodedToken.user_id && !decodedToken.sub)) {
                    throw new Error('Unable to decode Firebase ID token');
                }
                decodedToken.uid = decodedToken.uid || decodedToken.user_id || decodedToken.sub;
            }
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid Firebase ID token.' });
        }

        const { email, uid } = req.body;
        if ((uid && uid !== decodedToken.uid)
            || (email && decodedToken.email && email.toLowerCase() !== decodedToken.email.toLowerCase())) {
            return res.status(403).json({ success: false, message: 'The requested account does not match the authenticated user.' });
        }

        let user = await User.findOne({ uid: decodedToken.uid });
        if (!user && (email || decodedToken.email)) {
            const queryEmail = (email || decodedToken.email).toLowerCase().trim();
            user = await User.findOne({ email: queryEmail });
            if (user && (!user.uid || user.uid !== decodedToken.uid)) {
                user.uid = decodedToken.uid;
                await user.save();
            }
        }
        if (!user || user.isActive === false) {
            return res.status(401).json({ success: false, message: 'User account is unavailable.' });
        }

        const roles = getUserRoles(user);
        const accessToken = generateAccessToken(user, client.clientId, roles);
        const refreshToken = generateRefreshToken(user, client.clientId);

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
        const client = await validatePublicClient(req, res);
        if (!client) return;

        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token is required.' });
        }

        const decodedToken = verifyRefreshToken(refreshToken);
        if (decodedToken.clientId !== client.clientId) {
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
