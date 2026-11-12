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

/**
 * Diagnostic route to verify database records for vinay@gmail.com
 */
router.get('/check-vinay', async (req, res) => {
    try {
        const User = require('../models/User');
        const Client = require('../models/Client');
        const PlaintextClientCredential = require('../models/PlaintextClientCredential');
        
        const user = await User.findOne({ email: 'vinay@gmail.com' });
        if (!user) {
            return res.json({ success: false, message: 'User vinay@gmail.com not found in MongoDB' });
        }
        
        const client = await Client.findOne({ clientId: `client_${user.uid || user._id}` });
        const plaintext = await PlaintextClientCredential.findOne({ clientId: `client_${user.uid || user._id}` });
        
        return res.json({
            success: true,
            user: {
                _id: user._id,
                uid: user.uid,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
            },
            client: client ? {
                _id: client._id,
                clientId: client.clientId,
                hasHashedSecret: client.clientSecret ? client.clientSecret.startsWith('$2a$') || client.clientSecret.startsWith('$2b$') : false,
                clientSecretPrefix: client.clientSecret ? client.clientSecret.substring(0, 10) + '...' : null,
            } : null,
            plaintext: plaintext ? {
                clientId: plaintext.clientId,
                clientSecretRaw: plaintext.clientSecretRaw,
            } : null,
        });
    } catch (err) {
        return res.json({ success: false, error: err.message });
    }
});

/**
 * GET /api/gateway/clients
 * Admin endpoint to list all provisioned API clients with their credentials
 */
router.get('/clients', async (req, res) => {
    try {
        const PlaintextClientCredential = require('../models/PlaintextClientCredential');
        const Client = require('../models/Client');
        const User = require('../models/User');
        const RecruiterTicketWallet = require('../models/RecruiterTicketWallet');

        const filter = req.query.q ? String(req.query.q).toLowerCase().trim() : '';

        const [plaintexts, clients, users, wallets] = await Promise.all([
            PlaintextClientCredential.find().sort({ createdAt: -1 }).lean(),
            Client.find().lean(),
            User.find().lean(),
            RecruiterTicketWallet.find().lean()
        ]);

        const clientMap = new Map();
        clients.forEach(c => clientMap.set(c.clientId, c));

        const userMap = new Map();
        users.forEach(u => {
            if (u.uid) userMap.set(u.uid, u);
            if (u._id) userMap.set(u._id.toString(), u);
            if (u.email) userMap.set(u.email.toLowerCase(), u);
        });

        const walletMap = new Map();
        wallets.forEach(w => walletMap.set(w.recruiterId, w));

        let results = plaintexts.map(p => {
            const rawId = p.clientId.replace(/^client_/, '');
            const matchedUser = userMap.get(rawId) || userMap.get(p.clientId);
            const matchedClient = clientMap.get(p.clientId);
            const matchedWallet = walletMap.get(rawId) || walletMap.get(matchedUser?.uid) || walletMap.get(matchedUser?._id?.toString());

            return {
                clientName: p.name || matchedClient?.name || matchedUser?.name || 'Recruiter Client',
                email: matchedUser?.email || null,
                clientId: p.clientId,
                clientSecret: p.clientSecretRaw,
                status: p.status || matchedClient?.status || 'active',
                availableTickets: matchedWallet?.availableTickets || 0,
                totalTicketsPurchased: matchedWallet?.totalPurchased || 0,
                jobsCount: matchedWallet?.jobs?.length || 0,
                jobs: matchedWallet?.jobs || [],
                createdAt: p.createdAt
            };
        });

        if (filter) {
            results = results.filter(r => 
                (r.clientName && r.clientName.toLowerCase().includes(filter)) ||
                (r.email && r.email.toLowerCase().includes(filter)) ||
                (r.clientId && r.clientId.toLowerCase().includes(filter))
            );
        }

        return res.status(200).json({
            success: true,
            count: results.length,
            clients: results
        });
    } catch (err) {
        console.error('[GATEWAY-CLIENTS] Error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve clients',
            error: err.message
        });
    }
});

module.exports = router;
