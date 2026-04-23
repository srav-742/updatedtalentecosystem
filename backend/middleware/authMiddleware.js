const admin = require('../config/firebase');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
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
            const user = await User.findOne({ uid: userIdHeader });
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
                const user = await User.findOne({ uid: userIdHeader });
                if (user) { req.user = user; return next(); }
            } catch (e) {}
        }
        
        return res.status(401).json({ message: "Unauthorized" });
    }
};



const roleCheck = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Forbidden: Access denied" });
        }

        next();
    };
};

module.exports = { authMiddleware, roleCheck };
