const {
    verifyAccessToken,
    refreshAccessToken,
    getUserRoles
} = require('../services/authService');
const User = require('../models/User');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Public Routes — No authentication required
 */
const PUBLIC_ROUTES = [
    { method: 'POST', pattern: /^\/api\/(auth\/)?signup$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?login$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?users\/sync$/i },
    { method: 'POST', pattern: /^\/api\/auth\/google$/i },
    { method: 'POST', pattern: /^\/api\/forgot-password$/i },
    { method: 'POST', pattern: /^\/api\/auth\/forgot-password$/i },
    { method: 'POST', pattern: /^\/api\/verify-otp$/i },
    { method: 'POST', pattern: /^\/api\/auth\/verify-otp$/i },
    { method: 'POST', pattern: /^\/api\/reset-password$/i },
    { method: 'POST', pattern: /^\/api\/auth\/reset-password$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?send-verification$/i },
    { method: 'GET', pattern: /^\/api\/(auth\/)?verify-email(\/.*)?$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?resend-verification$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?sync-verification$/i },
    { method: 'GET', pattern: /^\/api\/status$/i },
    { method: 'GET', pattern: /^\/api\/tts-debug$/i },
    { method: '*', pattern: /^\/api\/jobs(\/.*)?$/i },
    { method: 'POST', pattern: /^\/api\/jobs\/parse-questions$/i },
    { method: 'POST', pattern: /^\/api\/jobs\/generate-description$/i },
    { method: 'GET', pattern: /^\/api\/dashboard(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/applications(\/.*)?$/i },
    { method: 'GET', pattern: /^\/api\/profile\/[^/]+$/i },
    { method: 'PUT', pattern: /^\/api\/profile\/[^/]+$/i },
    { method: 'POST', pattern: /^\/api\/profile\/[^/]+$/i },
    { method: 'GET', pattern: /^\/api\/sample-seekers$/i },
    { method: '*', pattern: /^\/api\/gateway\/.*/i },
    { method: 'GET', pattern: /^\/api\/v1\/auth\/diagnostics\/state$/i },
    { method: 'GET', pattern: /^\/api\/v1\/blogs(\/.*)?$/i },
    { method: 'POST', pattern: /^\/api\/v1\/blogs\/subscribe$/i },
    { method: '*', pattern: /^\/api\/v1\/admin\/blogs(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/v1\/blogs\/admin(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/proctoring(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/proctoring-enhanced(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/proctoring-pipeline(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/wallet(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/payments(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/tickets(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/user-resumes(\/.*)?$/i },
    { method: 'GET', pattern: /^\/api\/interview\/public\/interview-details\/[a-f0-9]{24}$/i },
    { method: '*', pattern: /^\/api\/recruiter-knowledge(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/candidate\/job-readiness(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/candidate-career(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/coding-assessments(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/custom-coding-assessments(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/question-bank(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/upload-video-intro$/i },
    { method: '*', pattern: /^\/api\/generate-full-assessment$/i },
    { method: '*', pattern: /^\/api\/submit-assessment$/i },
    { method: '*', pattern: /^\/api\/assessment-details(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/interview(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/upload-recording-chunk$/i },
    { method: '*', pattern: /^\/api\/finalize-recording$/i },
    { method: '*', pattern: /^\/api\/upload-audio$/i },
    { method: '*', pattern: /^\/api\/agent(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/analyze-resume$/i },
    { method: '*', pattern: /^\/api\/parse-resume-structured$/i },
    { method: '*', pattern: /^\/api\/resume-profile(\/.*)?$/i },
    { method: '*', pattern: /^\/api\/transcripts(\/.*)?$/i }
];

const gatewayMiddleware = async (req, res, next) => {
    try {
        // ─── 1. CORS Preflight Bypass ────────────────────────────────────
        if (req.method === 'OPTIONS') {
            return next();
        }

        const fullPath = req.baseUrl + req.path;

        // Check if route is public
        const isPublic = PUBLIC_ROUTES.some(route => {
            const isMethodMatch = route.method === '*' || route.method.toUpperCase() === req.method.toUpperCase();
            const isPathMatch = route.pattern.test(fullPath);
            return isMethodMatch && isPathMatch;
        });

        const authHeader = req.headers.authorization;
        const xUserId = req.headers['x-user-id'] || req.headers['x-h1p-user-id'] || req.query?.userId;
        const clientId = req.headers['x-client-id'];

        if (clientId) {
            req.clientId = clientId;
        }

        // ─── 2. If already authenticated or public route ──────────────────
        if (isPublic) {
            // If credentials are present on a public route, attach user gracefully
            if (authHeader && authHeader.startsWith('Bearer ')) {
                try {
                    const token = authHeader.split(' ')[1];
                    let userId = null;
                    try {
                        const decoded = verifyAccessToken(token);
                        if (decoded && decoded.userId) userId = decoded.userId;
                    } catch (jwtErr) {
                        try {
                            const admin = require('../config/firebase');
                            if (admin && admin.apps && admin.apps.length > 0) {
                                const fbDecoded = await admin.auth().verifyIdToken(token);
                                if (fbDecoded && fbDecoded.uid) userId = fbDecoded.uid;
                            }
                        } catch (fbErr) {}
                    }
                    if (userId) {
                        const query = OBJECT_ID_REGEX.test(userId)
                            ? { $or: [{ _id: userId }, { uid: userId }] }
                            : { uid: userId };
                        req.user = await User.findOne(query);
                        if (req.user) req.userRoles = getUserRoles(req.user);
                    }
                } catch (e) {}
            } else if (xUserId) {
                try {
                    const trimmed = String(xUserId).trim();
                    const query = trimmed.includes('@')
                        ? { $or: [{ email: trimmed.toLowerCase() }, { uid: trimmed }] }
                        : (OBJECT_ID_REGEX.test(trimmed) ? { $or: [{ uid: trimmed }, { _id: trimmed }] } : { uid: trimmed });
                    req.user = await User.findOne(query);
                    if (req.user) req.userRoles = getUserRoles(req.user);
                } catch (e) {}
            }
            return next();
        }

        // ─── 3. Authenticate User for Protected Routes ───────────────────
        let user = null;
        let tokenRefreshed = false;

        // A. Verify Access Token if present
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            let decoded = null;

            try {
                decoded = verifyAccessToken(token);
            } catch (tokenError) {
                if (tokenError.code === 'TOKEN_EXPIRED') {
                    const refreshToken = req.headers['x-refresh-token'];
                    if (refreshToken) {
                        try {
                            const result = await refreshAccessToken(refreshToken);
                            decoded = verifyAccessToken(result.accessToken);
                            tokenRefreshed = true;
                            res.setHeader('X-New-Access-Token', result.accessToken);
                        } catch (refErr) {
                            return res.status(401).json({
                                success: false,
                                message: 'Session expired. Please log in again.',
                                code: 'TOKEN_EXPIRED'
                            });
                        }
                    } else {
                        return res.status(401).json({
                            success: false,
                            message: 'Access token expired.',
                            code: 'TOKEN_EXPIRED'
                        });
                    }
                }
            }

            if (decoded && decoded.userId) {
                const query = OBJECT_ID_REGEX.test(decoded.userId)
                    ? { $or: [{ _id: decoded.userId }, { uid: decoded.userId }] }
                    : { uid: decoded.userId };
                user = await User.findOne(query);
            }
        }

        // B. Fallback to x-user-id header
        if (!user && xUserId) {
            const trimmed = String(xUserId).trim();
            const query = trimmed.includes('@')
                ? { $or: [{ email: trimmed.toLowerCase() }, { uid: trimmed }] }
                : (OBJECT_ID_REGEX.test(trimmed) ? { $or: [{ uid: trimmed }, { _id: trimmed }] } : { uid: trimmed });
            user = await User.findOne(query);
        }

        // If user cannot be identified on a protected route
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Authentication required. Please log in.',
                code: 'UNAUTHORIZED'
            });
        }

        // Enforce pilot expiration if applicable
        if (user.role === 'recruiter' && user.accountType === 'pilot') {
            if (user.pilotExpiresAt && new Date() > new Date(user.pilotExpiresAt)) {
                return res.status(403).json({
                    success: false,
                    message: "Your session has expired.",
                    code: 'PILOT_EXPIRED',
                    pilotExpired: true,
                    sessionExpired: true
                });
            }
        }

        req.user = user;
        req.tokenRefreshed = tokenRefreshed;
        req.userRoles = getUserRoles(user);

        return next();

    } catch (error) {
        console.error('[GATEWAY] Unexpected error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Gateway internal error.',
            error: error.message
        });
    }
};

/**
 * Lightweight client gateway helper
 */
const clientOnlyGateway = async (req, res, next) => {
    return next();
};

module.exports = { gatewayMiddleware, clientOnlyGateway };
