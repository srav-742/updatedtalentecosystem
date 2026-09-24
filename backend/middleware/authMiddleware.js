const admin = require('../config/firebase');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    // If user is already authenticated (e.g. by gatewayMiddleware), bypass checking again
    if (req.user) {
        return next();
    }

    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id']; // Fallback header

    try {
        // Method 1: Firebase Token Verification (Preferred)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                if (admin.apps.length > 0) {
                    const token = authHeader.split(' ')[1];
                    const decodedToken = await admin.auth().verifyIdToken(token);
                    const user = await User.findOne({ uid: decodedToken.uid });
                    if (user) {
                        req.user = user;
                        return next();
                    }
                }
            } catch (fbError) {
                // Only log if it's not a "no app" error, to keep console clean
                if (!fbError.message.includes('app does not exist')) {
                    console.warn("[AUTH-MIDDLEWARE] Firebase verification failed:", fbError.message);
                }
            }
        }

        // Method 2: Fallback to x-user-id (if Firebase Admin is missing or token fails)
        if (userIdHeader) {
            const trimmed = String(userIdHeader).trim();
            const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
            let query;
            if (trimmed.includes('@')) {
                query = { $or: [{ email: trimmed.toLowerCase() }, { uid: trimmed }] };
            } else if (OBJECT_ID_REGEX.test(trimmed)) {
                query = { $or: [{ uid: trimmed }, { _id: trimmed }] };
            } else {
                query = { uid: trimmed };
            }
            const user = await User.findOne(query);
            if (user) {
                req.user = user;
                return next();
            }
        }

        return res.status(401).json({ message: "Unauthorized: Please login" });
    } catch (error) {
        // Final fallback: If we have a userId header, try one last time to find the user
        if (userIdHeader) {
            try {
                const trimmed = String(userIdHeader).trim();
                const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
                let query;
                if (trimmed.includes('@')) {
                    query = { $or: [{ email: trimmed.toLowerCase() }, { uid: trimmed }] };
                } else if (OBJECT_ID_REGEX.test(trimmed)) {
                    query = { $or: [{ uid: trimmed }, { _id: trimmed }] };
                } else {
                    query = { uid: trimmed };
                }
                const user = await User.findOne(query);
                if (user) { req.user = user; return next(); }
            } catch (e) {}
        }

        
        return res.status(401).json({ message: "Unauthorized" });
    }
};



const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];

const roleCheck = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        const isAdminByEmail = req.user.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim());
        const isClientAdmin = req.headers['x-client-id'] === 'hire1percent_web_client' || req.headers['x-client-id'] === 'hire1admindashboard';

        if (userRole === 'admin' || isAdminByEmail || (isClientAdmin && allowedRoles.includes('admin')) || allowedRoles.includes(userRole)) {
            return next();
        }

        return res.status(403).json({ message: "Forbidden: Access denied" });
    };
};

module.exports = { authMiddleware, roleCheck };
