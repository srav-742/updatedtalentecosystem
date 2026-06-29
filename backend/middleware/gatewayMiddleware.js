const {
    validateClient,
    verifyAccessToken,
    refreshAccessToken,
    getUserRoles,
    getClientRoles,
    checkResourceAccess
} = require('../services/authService');
const User = require('../models/User');

/**
 * API Gateway Middleware
 * 
 * This middleware acts as the entry point for every protected request:
 * 1. Validates Client ID & Client Secret (application-level auth)
 * 2. Validates the Access Token (user-level auth)
 * 3. If Access Token expired, attempts silent refresh using Refresh Token
 * 4. Checks if the user's role is authorized to access the requested resource
 * 
 * Required Headers:
 *   X-Client-ID: <clientId>
 *   X-Client-Secret: <clientSecret>
 *   Authorization: Bearer <accessToken>
 *   X-Refresh-Token: <refreshToken>  (optional, used for silent refresh)
 */
const PUBLIC_ROUTES = [
    { method: 'POST', pattern: /^\/api\/signup$/i },
    { method: 'POST', pattern: /^\/api\/login$/i },
    { method: 'POST', pattern: /^\/api\/users\/sync$/i },
    { method: 'POST', pattern: /^\/api\/auth\/google$/i },
    { method: 'POST', pattern: /^\/api\/forgot-password$/i },
    { method: 'POST', pattern: /^\/api\/auth\/forgot-password$/i },
    { method: 'POST', pattern: /^\/api\/verify-otp$/i },
    { method: 'POST', pattern: /^\/api\/auth\/verify-otp$/i },
    { method: 'POST', pattern: /^\/api\/reset-password$/i },
    { method: 'POST', pattern: /^\/api\/auth\/reset-password$/i },
    { method: 'GET', pattern: /^\/api\/status$/i },
    { method: 'GET', pattern: /^\/api\/tts-debug$/i },
    { method: 'GET', pattern: /^\/api\/jobs$/i },
    { method: 'GET', pattern: /^\/api\/jobs\/[^/]+$/i },
    { method: 'GET', pattern: /^\/api\/profile\/[^/]+$/i },
    { method: 'PUT', pattern: /^\/api\/profile\/[^/]+$/i },
    { method: 'GET', pattern: /^\/api\/sample-seekers$/i },
    { method: '*', pattern: /^\/api\/gateway\/.*/i }
];

const gatewayMiddleware = async (req, res, next) => {
    try {
        // ─── Step 1: Validate Client Credentials ──────────────────────────
        const clientId = req.headers['x-client-id'];
        const clientSecret = req.headers['x-client-secret'];

        if (!clientId || !clientSecret) {
            return res.status(401).json({
                success: false,
                message: 'Client credentials required. Provide X-Client-ID and X-Client-Secret headers.'
            });
        }

        const client = await validateClient(clientId, clientSecret);
        if (!client) {
            return res.status(401).json({
                success: false,
                message: 'Invalid client credentials. You are not authorized.'
            });
        }

        // Attach client info to request
        req.client = client;

        // Check if route is public (use baseUrl + path to match patterns starting with /api)
        const fullPath = req.baseUrl + req.path;
        const isPublic = PUBLIC_ROUTES.some(route => {
            const isMethodMatch = route.method === '*' || route.method.toUpperCase() === req.method.toUpperCase();
            const isPathMatch = route.pattern.test(fullPath);
            return isMethodMatch && isPathMatch;
        });

        if (isPublic) {
            console.log(`[GATEWAY-PUBLIC] ✅ Access granted (Public Client): ${req.method} ${fullPath}`);
            return next();
        }

        // ─── Step 2: Validate Access Token ────────────────────────────────
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required. Provide Authorization: Bearer <token> header.'
            });
        }

        const accessToken = authHeader.split(' ')[1];
        let decoded;
        let tokenRefreshed = false;

        try {
            decoded = verifyAccessToken(accessToken);
        } catch (tokenError) {
            if (tokenError.code === 'TOKEN_EXPIRED') {
                // ─── Step 3: Attempt Silent Refresh ───────────────────────
                const refreshToken = req.headers['x-refresh-token'];
                if (!refreshToken) {
                    return res.status(401).json({
                        success: false,
                        message: 'Access token expired. Provide X-Refresh-Token header for renewal.',
                        code: 'TOKEN_EXPIRED'
                    });
                }

                try {
                    const result = await refreshAccessToken(refreshToken);
                    decoded = verifyAccessToken(result.accessToken);
                    tokenRefreshed = true;

                    // Send the new access token back in response header
                    res.setHeader('X-New-Access-Token', result.accessToken);
                } catch (refreshError) {
                    return res.status(401).json({
                        success: false,
                        message: refreshError.code === 'SESSION_EXPIRED'
                            ? 'Session expired. Please log in again.'
                            : 'Token refresh failed. Please log in again.',
                        code: refreshError.code || 'REFRESH_FAILED'
                    });
                }
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid access token.',
                    code: 'INVALID_TOKEN'
                });
            }
        }

        // ─── Step 4: Load User & Attach to Request ───────────────────────
        const user = await User.findOne({
            $or: [
                { _id: decoded.userId },
                { uid: decoded.userId }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User associated with this token was not found.'
            });
        }

        req.user = user;
        req.tokenRefreshed = tokenRefreshed;

        // ─── Step 5: Role-Based Resource Access Check ────────────────────
        const userRoles = getUserRoles(user);
        const clientRoles = await getClientRoles(clientId);
        const combinedRoles = [...new Set([...userRoles, ...clientRoles])];

        req.userRoles = combinedRoles;

        const hasAccess = await checkResourceAccess(combinedRoles, fullPath, req.method);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: "You don't have access to this resource.",
                requiredAction: 'Contact your administrator to request access.'
            });
        }

        // ─── Access Granted ──────────────────────────────────────────────
        console.log(`[GATEWAY] ✅ Access granted: ${req.method} ${fullPath} | User: ${user.email} | Roles: [${combinedRoles.join(', ')}]`);
        next();

    } catch (error) {
        console.error('[GATEWAY] ❌ Unexpected error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Gateway internal error.',
            error: error.message
        });
    }
};

/**
 * Lightweight version of gateway middleware — only validates client credentials
 * Use this for public endpoints that need client identification but not user auth
 */
const clientOnlyGateway = async (req, res, next) => {
    try {
        const clientId = req.headers['x-client-id'];
        const clientSecret = req.headers['x-client-secret'];

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

        req.client = client;
        next();
    } catch (error) {
        console.error('[GATEWAY-CLIENT] Error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Gateway error.',
            error: error.message
        });
    }
};

module.exports = { gatewayMiddleware, clientOnlyGateway };
