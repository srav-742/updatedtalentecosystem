const admin = require('../config/firebase');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    if (req.user) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Missing valid token' });
    }

    try {
        if (admin.apps.length === 0) {
            return res.status(401).json({ message: 'Unauthorized: Authentication service unavailable' });
        }

        const token = authHeader.slice('Bearer '.length);
        const decodedToken = await admin.auth().verifyIdToken(token);
        const user = await User.findOne({ uid: decodedToken.uid });

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
