const {
    validateClientCredentials,
    verifyAccessToken,
    getUserRoles,
    getClientRoles,
    checkResourceAccess,
    refreshAccessToken
} = require('../services/authService');
const User = require('../models/User');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Public routes that do NOT require client credentials or user tokens.
 * Matches method + regex pattern.
 */
const PUBLIC_ROUTES = [
    { method: 'GET', pattern: /^\/api\/status$/i },
    { method: 'GET', pattern: /^\/api\/health$/i },
    { method: 'GET', pattern: /^\/health$/i },
    { method: 'GET', pattern: /^\/live$/i },
    { method: 'GET', pattern: /^\/ready$/i },

    { method: 'POST', pattern: /^\/api\/auth\/login$/i },
    { method: 'POST', pattern: /^\/api\/auth\/signup$/i },
    { method: 'POST', pattern: /^\/api\/auth\/google$/i },
    { method: 'POST', pattern: /^\/api\/signup$/i },
    { method: 'POST', pattern: /^\/api\/login$/i },
    { method: 'POST', pattern: /^\/api\/users\/sync$/i },
    { method: 'POST', pattern: /^\/api\/auth\/refresh$/i },
    { method: 'POST', pattern: /^\/api\/auth\/forgot-password$/i },
    { method: 'POST', pattern: /^\/api\/forgot-password$/i },
    { method: 'POST', pattern: /^\/api\/auth\/verify-otp$/i },
    { method: 'POST', pattern: /^\/api\/reset-password$/i },
    { method: 'POST', pattern: /^\/api\/auth\/reset-password$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?send-verification$/i },
    { method: 'GET', pattern: /^\/api\/(auth\/)?verify-email(\/.*)?$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?resend-verification$/i },
    { method: 'POST', pattern: /^\/api\/(auth\/)?sync-verification$/i },
    { method: 'POST', pattern: /^\/api\/gateway\/token$/i },
    { method: 'POST', pattern: /^\/api\/gateway\/refresh$/i },
    { method: 'GET', pattern: /^\/api\/gateway\/validate$/i },

    { method: 'GET', pattern: /^\/api\/jobs\/?$/i },
    { method: 'GET', pattern: /^\/api\/jobs\/recruiter\/[^/]+$/i },
    { method: 'GET', pattern: /^\/api\/jobs\/(?!admin(?:\/|$)|recruiter(?:\/|$))[^/]+$/i },
    { method: 'GET', pattern: /^\/api\/dashboard\/[^/]+$/i },
    { method: 'GET', pattern: /^\/api\/payments\/status\/[^/]+$/i },
    { method: 'GET', pattern: /^\/api\/sample-seekers$/i },
    { method: 'GET', pattern: /^\/api\/v1\/blogs(?:\/(?!admin(?:\/|$))[^/]+)?$/i },
    { method: 'POST', pattern: /^\/api\/v1\/blogs\/subscribe$/i },
    { method: 'GET', pattern: /^\/api\/content(\/.*)?$/i },
    { method: 'GET', pattern: /^\/api\/interview\/public\/interview-details\/[a-f0-9]{24}$/i },
    { method: 'GET', pattern: /^\/api\/candidate-career\/(topics|blueprints)$/i }
];

const gatewayMiddleware = async (req, res, next) => {
    try {
        const fullPath = req.baseUrl + req.path;

        // ─── Step 0: Trust API Gateway Propagated Context ────────────────
        const gatewaySecret = req.headers['x-gateway-secret'];
        const trustedSecret = process.env.GATEWAY_SHARED_SECRET || 'hire1percent_gateway_secret_key_2026';

        if (trustedSecret && gatewaySecret === trustedSecret) {
            const contextUserId = req.headers['x-context-user-id']
                || req.headers['x-user-id']
                || req.headers['x-h1p-user-id'];
            const contextRoles = req.headers['x-context-roles'];
            const gatewayClientId = req.headers['x-client-id'] || req.headers['x-h1p-client-id'];
            let authenticatedUserId = contextUserId;
            if (!authenticatedUserId && gatewayClientId && gatewayClientId.startsWith('client_')) {
                authenticatedUserId = gatewayClientId.slice('client_'.length);
            }

            if (authenticatedUserId) {
                const userId = String(authenticatedUserId).trim();
                const userQuery = userId.includes('@')
                    ? { email: userId.toLowerCase() }
                    : OBJECT_ID_REGEX.test(userId)
                        ? { $or: [{ uid: userId }, { _id: userId }] }
                        : { uid: userId };
                req.user = await User.findOne(userQuery) || undefined;
            }

            if (gatewayClientId) {
                const Client = require('../models/Client');
                req.client = await Client.findOne({ clientId: gatewayClientId, status: 'active' }) || undefined;
            }

            req.gatewayContext = {
                correlationId: req.headers['x-correlation-id'] || 'gw-' + Date.now(),
                roles: contextRoles ? contextRoles.split(',').map(r => r.trim()) : [],
                authenticated: Boolean(req.user)
            };

            if (req.user) {
                req.userRoles = getUserRoles(req.user);
                return next();
            }
        }

        // ─── Step 0.5: Bypass for Public Routes ─────────────────────────
        const isPublic = PUBLIC_ROUTES.some(route => {
            const methodMatches = route.method === '*' || route.method === req.method;
            return methodMatches && route.pattern.test(fullPath);
        });

        // ─── Step 0.6: Special Bypass for Admin Users / Admin Origin ────
        const adminEmails = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];
        let isAdminRequest = false;
        let adminUser = null;

        // 1. Check if token belongs to an admin
        const authHeaderCheck = req.headers.authorization;
        if (authHeaderCheck && authHeaderCheck.startsWith('Bearer ')) {
            try {
                const token = authHeaderCheck.split(' ')[1];
                const decoded = verifyAccessToken(token);
                if (decoded && decoded.userId) {
                    let query;
                    const trimmed = String(decoded.userId).trim();
                    if (trimmed.includes('@')) {
                        query = { $or: [{ email: trimmed.toLowerCase() }, { uid: trimmed }] };
                    } else if (OBJECT_ID_REGEX.test(trimmed)) {
                        query = { $or: [{ uid: trimmed }, { _id: trimmed }] };
                    } else {
                        query = { uid: trimmed };
                    }
                    const user = await User.findOne(query);
                    if (user && (user.role === 'admin' || (user.email && adminEmails.includes(user.email.toLowerCase().trim())))) {
                        adminUser = user;
                        isAdminRequest = true;
                    }
                }
            } catch (err) {}
        }

        // 2. Fallback: Check if a verified Firebase token belongs to an admin
        if (!isAdminRequest && authHeaderCheck && authHeaderCheck.startsWith('Bearer ')) {
            try {
                const admin = require('../config/firebase');
                if (admin.apps.length > 0) {
                    const token = authHeaderCheck.split(' ')[1];
                    const decoded = await admin.auth().verifyIdToken(token);
                    if (decoded && decoded.email && adminEmails.includes(decoded.email.toLowerCase().trim())) {
                        isAdminRequest = true;
                        let query;
                        const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
                        if (OBJECT_ID_REGEX.test(decoded.userId || decoded.uid)) {
                            query = { $or: [{ uid: decoded.userId || decoded.uid }, { _id: decoded.userId || decoded.uid }] };
                        } else {
                            query = { uid: decoded.userId || decoded.uid };
                        }
                        adminUser = await User.findOne(query);
                        isAdminRequest = !!adminUser;
                    }
                }
            } catch (error) {
                console.warn('[GATEWAY-MIDDLEWARE] Firebase admin token verification failed:', error.message);
            }
        }

        // If detected as admin request, bypass client credentials and token checks
        if (isAdminRequest) {
            const Client = require('../models/Client');
            const defaultClient = await Client.findOne({ clientId: 'hire1percent_web_client' });
            req.client = defaultClient || {
                clientId: 'hire1percent_web_client',
                name: 'Default Admin Web Client',
                status: 'active'
            };

            if (adminUser) {
                req.user = adminUser;
                req.tokenRefreshed = false;
                req.userRoles = ['admin'];
            }
            return next();
        }

        if (isPublic) {
            // Still populate user if token is provided
            if (authHeaderCheck && authHeaderCheck.startsWith('Bearer ')) {
                try {
                    const token = authHeaderCheck.split(' ')[1];
                    const decoded = verifyAccessToken(token);
                    if (decoded && decoded.userId) {
                        const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
                        const query = OBJECT_ID_REGEX.test(decoded.userId)
                            ? { $or: [{ _id: decoded.userId }, { uid: decoded.userId }] }
                            : { uid: decoded.userId };
                        req.user = await User.findOne(query);
                    }
                } catch (e) {}
            }
            return next();
        }

        // ─── Step 1: Client Credentials Verification ────────────────────
        let clientId = req.headers['x-client-id'] || req.headers['client_id'];
        let clientSecret = req.headers['x-client-secret'] || req.headers['client_secret'];

        let client;
        if (clientSecret) {
            client = await validateClientCredentials(clientId, clientSecret);
        } else {
            const publicClientId = process.env.GATEWAY_PUBLIC_CLIENT_ID || 'hire1percent_web_client';
            if (!clientId) {
                clientId = publicClientId;
            }
            if (clientId !== publicClientId) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid gateway client.'
                });
            }
            const Client = require('../models/Client');
            client = await Client.findOne({ clientId: publicClientId, status: 'active' });
            if (!client) {
                client = {
                    clientId: publicClientId,
                    name: 'Default Web Client',
                    status: 'active'
                };
            }
        }
        if (!client) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or inactive gateway client.'
            });
        }
        req.client = client;

        // ─── Step 2: User Access Token Verification ─────────────────────
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const fallbackUid = req.headers['x-user-id'] || req.headers['x-context-user-id'];
            if (fallbackUid) {
                const trimmedId = String(fallbackUid).trim();
                const query = trimmedId.includes('@')
                    ? { email: trimmedId.toLowerCase() }
                    : OBJECT_ID_REGEX.test(trimmedId)
                        ? { $or: [{ uid: trimmedId }, { _id: trimmedId }] }
                        : { uid: trimmedId };
                const user = await User.findOne(query);
                if (user) {
                    req.user = user;
                    req.tokenRefreshed = false;
                    req.userRoles = getUserRoles(user);
                    return next();
                }
            }
            return res.status(401).json({
                success: false,
                message: 'Missing or malformed Authorization header. Expected: Bearer <token>'
            });
        }

        const accessToken = authHeader.split(' ')[1];
        let decoded;
        let tokenRefreshed = false;

        try {
            decoded = verifyAccessToken(accessToken);
        } catch (tokenError) {
            if (tokenError.name === 'TokenExpiredError') {
                const refreshToken = req.headers['x-refresh-token'];
                if (!refreshToken) {
                    return res.status(401).json({
                        success: false,
                        message: 'Access token expired. Provide X-Refresh-Token header to refresh.',
                        tokenExpired: true
                    });
                }
                try {
                    const newTokens = await refreshAccessToken(refreshToken);
                    res.setHeader('X-New-Access-Token', newTokens.accessToken);
                    decoded = verifyAccessToken(newTokens.accessToken);
                    tokenRefreshed = true;
                } catch (refreshError) {
                    return res.status(401).json({
                        success: false,
                        message: 'Refresh token invalid or expired. Please re-authenticate.',
                        tokenExpired: true
                    });
                }
            } else {
                // Try Firebase token verification as fallback
                try {
                    const admin = require('../config/firebase');
                    if (admin.apps.length > 0) {
                        const fbDecoded = await admin.auth().verifyIdToken(accessToken);
                        decoded = { userId: fbDecoded.uid };
                    } else {
                        const jwt = require('jsonwebtoken');
                        const fbDecoded = jwt.decode(accessToken);
                        const fallbackUid = fbDecoded?.user_id || fbDecoded?.sub || fbDecoded?.uid || req.headers['x-user-id'] || req.headers['x-context-user-id'];
                        if (fallbackUid) {
                            decoded = { userId: fallbackUid };
                        } else {
                            throw tokenError;
                        }
                    }
                } catch (fbErr) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid access token: ' + tokenError.message
                    });
                }
            }
        }

        // ─── Step 3: Load User ──────────────────────────────────────────
        let userQuery;
        const trimmedId = String(decoded.userId).trim();
        if (trimmedId.includes('@')) {
            userQuery = { $or: [{ email: trimmedId.toLowerCase() }, { uid: trimmedId }] };
        } else if (OBJECT_ID_REGEX.test(trimmedId)) {
            userQuery = { $or: [{ uid: trimmedId }, { _id: trimmedId }] };
        } else {
            userQuery = { uid: trimmedId };
        }
        const user = await User.findOne(userQuery);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired.',
                code: 'SESSION_EXPIRED',
                accountDeleted: true,
                sessionExpired: true
            });
        }

        // Enforce server-side expiration check for pilot recruiters
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

        // ─── Step 5: Role-Based Resource Access Check ────────────────────
        const userRoles = getUserRoles(user);
        const clientRoles = await getClientRoles(clientId);

        const hasResourceAccess = await checkResourceAccess(userRoles, fullPath, req.method);
        if (!hasResourceAccess) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Your role(s) [${userRoles.join(', ')}] do not have access to ${req.method} ${fullPath}`
            });
        }

        req.userRoles = userRoles;
        req.clientRoles = clientRoles;

        next();
    } catch (error) {
        console.error('Gateway Middleware Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Gateway authentication error: ' + error.message
        });
    }
};

module.exports = { gatewayMiddleware, PUBLIC_ROUTES };
