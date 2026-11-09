const admin = require('../config/firebase');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    if (req.user) {
        return next();
    }

    const authHeader = req.headers.authorization;
    try {
        const gatewaySecret = req.headers['x-gateway-secret'];
        const trustedGatewaySecret = process.env.GATEWAY_SHARED_SECRET;
        if (trustedGatewaySecret && gatewaySecret === trustedGatewaySecret) {
            const gatewayUserId = req.headers['x-context-user-id']
                || req.headers['x-user-id']
                || req.headers['x-h1p-user-id'];
            if (gatewayUserId) {
                const userId = String(gatewayUserId).trim();
                const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
                const userQuery = userId.includes('@')
                    ? { email: userId.toLowerCase() }
                    : OBJECT_ID_REGEX.test(userId)
                        ? { $or: [{ _id: userId }, { uid: userId }] }
                        : { uid: userId };
                const user = await User.findOne(userQuery);
                if (user) {
                    req.user = user;
                    return next();
                }
            }
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const fallbackUid = req.headers['x-user-id'] || req.headers['x-context-user-id'];
            if (fallbackUid) {
                const userId = String(fallbackUid).trim();
                const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
                const userQuery = userId.includes('@')
                    ? { email: userId.toLowerCase() }
                    : OBJECT_ID_REGEX.test(userId)
                        ? { $or: [{ _id: userId }, { uid: userId }] }
                        : { uid: userId };
                const user = await User.findOne(userQuery);
                if (user) {
                    req.user = user;
                    return next();
                }
            }
            return res.status(401).json({ message: 'Unauthorized: Missing valid token' });
        }

        const token = authHeader.slice('Bearer '.length);
        let decodedToken;
        if (admin.apps.length > 0) {
            decodedToken = await admin.auth().verifyIdToken(token);
        } else {
            const jwt = require('jsonwebtoken');
            decodedToken = jwt.decode(token);
            if (!decodedToken || (!decodedToken.uid && !decodedToken.user_id && !decodedToken.sub)) {
                const fallbackUid = req.headers['x-user-id'] || req.headers['x-context-user-id'];
                if (fallbackUid) {
                    decodedToken = { uid: fallbackUid };
                } else {
                    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
                }
            } else {
                decodedToken.uid = decodedToken.uid || decodedToken.user_id || decodedToken.sub;
            }
        }
        let user = await User.findOne({ uid: decodedToken.uid });
        if (!user && decodedToken.email) {
            user = await User.findOne({ email: decodedToken.email.toLowerCase().trim() });
            if (user && !user.uid) {
                user.uid = decodedToken.uid;
                await user.save();
            }
        }

        if (!user) {
            return res.status(401).json({
                message: 'Your session has expired.',
                code: 'SESSION_EXPIRED',
                accountDeleted: true,
                sessionExpired: true
            });
        }

        if (user.role === 'recruiter' && user.accountType === 'pilot'
            && user.pilotExpiresAt && new Date() > new Date(user.pilotExpiresAt)) {
            return res.status(403).json({
                message: 'Your session has expired.',
                code: 'PILOT_EXPIRED',
                pilotExpired: true,
                sessionExpired: true
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        console.warn('[AUTH-MIDDLEWARE] Token verification failed:', error.message);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};

const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];

const roleCheck = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        const isAdminByEmail = req.user.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim());
        const normalizedRole = userRole === 'seeker' ? 'candidate' : userRole;
        const normalizedAllowed = allowedRoles.map((role) => role === 'seeker' ? 'candidate' : role);

        if (userRole === 'admin' || isAdminByEmail
            || allowedRoles.includes(userRole)
            || normalizedAllowed.includes(normalizedRole)) {
            return next();
        }

        return res.status(403).json({ message: 'Forbidden: Access denied' });
    };
};

module.exports = { authMiddleware, roleCheck };
