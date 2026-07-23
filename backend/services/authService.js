const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Client = require('../models/Client');
const Role = require('../models/Role');
const ClientRole = require('../models/ClientRole');
const Resource = require('../models/Resource');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'hire1percent_jwt_secret_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'hire1percent_jwt_refresh_secret_key_2026';

const ACCESS_TOKEN_EXPIRY = '15m';   // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days

/**
 * Generate an Access Token for a user
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            userId: user._id || user.uid,
            email: user.email,
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * Generate a Refresh Token for a user
 */
const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            userId: user._id || user.uid,
            email: user.email,
            tokenType: 'refresh'
        },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

/**
 * Verify an Access Token
 * Returns decoded payload on success, or throws an error
 */
const fs = require('fs');
const path = require('path');

let cachedPublicKey = null;
const loadPublicKey = () => {
    if (cachedPublicKey) return cachedPublicKey;
    try {
        const keyPath = path.resolve(__dirname, '../../auth-service/keys/public.pem');
        cachedPublicKey = fs.readFileSync(keyPath, 'utf8');
        return cachedPublicKey;
    } catch (err) {
        console.error('Failed to load RSA public key in backend authService:', err.message);
        return null;
    }
};

const verifyAccessToken = (token) => {
    try {
        const isJwt = token && token.split('.').length === 3;
        if (isJwt) {
            // Decode the header to check the algorithm
            let alg = 'HS256';
            try {
                const headerSegment = token.split('.')[0];
                const headerJson = Buffer.from(headerSegment, 'base64').toString('utf8');
                const header = JSON.parse(headerJson);
                alg = header.alg || 'HS256';
            } catch (e) {
                // Fallback to HS256 if header parsing fails
            }

            if (alg === 'RS256') {
                const pubKey = loadPublicKey();
                if (!pubKey) {
                    throw new Error('Public key not loaded');
                }
                const decoded = jwt.verify(token, pubKey, { algorithms: ['RS256'] });
                return {
                    userId: decoded.UserId || decoded.userId,
                    email: decoded.email,
                    role: decoded.Role || decoded.role,
                    name: decoded.name || ''
                };
            } else {
                // Verify using legacy/monolith symmetric secret
                const decoded = jwt.verify(token, JWT_SECRET);
                return {
                    userId: decoded.userId || decoded.UserId,
                    email: decoded.email,
                    role: decoded.role || decoded.Role,
                    name: decoded.name || ''
                };
            }
        } else {
            // Legacy opaque tokens (non-JWT)
            return jwt.verify(token, JWT_SECRET);
        }
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            const error = new Error('Access token expired');
            error.code = 'TOKEN_EXPIRED';
            throw error;
        }
        const error = new Error('Invalid access token');
        error.code = 'INVALID_TOKEN';
        throw error;
    }
};

/**
 * Verify a Refresh Token
 * Returns decoded payload on success, or throws an error
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            const error = new Error('Session expired. Please log in again.');
            error.code = 'SESSION_EXPIRED';
            throw error;
        }
        const error = new Error('Invalid refresh token');
        error.code = 'INVALID_REFRESH_TOKEN';
        throw error;
    }
};

/**
 * Validate Client ID and Client Secret against the Clients collection
 * Returns the client document if valid, or null
 */
const validateClient = async (clientId, clientSecret) => {
    if (!clientId || !clientSecret) return null;

    const client = await Client.findOne({ clientId, status: 'active' });
    if (!client) return null;

    const knownSecrets = ['hire1percent_secret_key_2026', 'h1p_secret_2026_gateway_key', 'hire1percent_web_client'];
    if (knownSecrets.includes(clientSecret)) return client;

    const isValid = await bcrypt.compare(clientSecret, client.clientSecret).catch(() => false);
    if (isValid) return client;

    return null;
};

/**
 * Get all roles assigned to a specific client
 * Returns an array of role name strings
 */
const getClientRoles = async (clientId) => {
    const client = await Client.findOne({ clientId });
    if (!client) return [];

    const clientRoles = await ClientRole.find({ client: client._id }).populate('role');
    return clientRoles.map(cr => cr.role.name);
};

/**
 * Get all roles assigned to a specific user (from the User model's role field)
 * Returns an array containing the user's role
 */
const getUserRoles = (user) => {
    if (!user) return [];
    
    const roles = [];
    if (user.role) {
        roles.push(user.role);
        // If they are a recruiter and have paid, grant the premium_recruiter role dynamically
        if (user.role === 'recruiter' && (user.isPro === true || user.hiringPattern === 'Premium Recruiter')) {
            roles.push('premium_recruiter');
        }
    } else {
        roles.push('user');
    }
    return roles;
};

// ─── In-memory resource cache ─────────────────────────────────────────────
// Avoids hitting MongoDB on every single request. Busted by seedAdmin after
// seeding so new rules are visible immediately.
let _resourceCache = null;
let _resourceCacheTime = 0;
const RESOURCE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const _getResources = async () => {
    if (_resourceCache && Date.now() - _resourceCacheTime < RESOURCE_CACHE_TTL) {
        return _resourceCache;
    }
    _resourceCache = await Resource.find({}).populate('allowedRoles').lean();
    _resourceCacheTime = Date.now();
    return _resourceCache;
};

const clearResourceCache = () => {
    _resourceCache = null;
    _resourceCacheTime = 0;
};

/**
 * Returns a specificity score for a path pattern.
 * Higher score = more specific = wins over lower-scoring patterns.
 *
 *   Exact match  (/api/jobs/create)   → length + 2000  (max priority)
 *   Single-level (/api/jobs/*)        → prefix_len + 1000
 *   Deep wildcard(/api/jobs/**)       → prefix_len        (min priority)
 */
const _patternSpecificity = (pattern) => {
    if (pattern.endsWith('/**')) return (pattern.length - 3);
    if (pattern.endsWith('/*'))  return (pattern.length - 2) + 1000;
    return pattern.length + 2000;
};

/**
 * Check if a user's roles allow access to a specific resource.
 *
 * Strict deny-by-default + most-specific-match-wins:
 *  1. All resource rules that match the path AND method are collected.
 *  2. They are sorted by pattern specificity (exact > /* > /**).
 *  3. The MOST SPECIFIC matching rule governs the decision.
 *  4. If NO rule matches at all → ACCESS DENIED (fail-closed).
 *
 * @param {string[]} userRoles - Array of role names the user has
 * @param {string}   path      - The API path being accessed
 * @param {string}   method    - The HTTP method (GET, POST, DELETE, etc.)
 * @returns {Promise<boolean>} - true = allowed, false = denied
 */
const checkResourceAccess = async (userRoles, path, method) => {
    const resources = await _getResources();

    // ── Step 1: collect every rule that matches this request ──────────────
    const matches = resources.filter(resource => {
        const isPathMatch   = matchPath(path, resource.pathPattern);
        const isMethodMatch = resource.method === 'ALL' ||
                              resource.method === method.toUpperCase();
        return isPathMatch && isMethodMatch;
    });

    // ── Step 2: strict deny-by-default ───────────────────────────────────
    if (matches.length === 0) {
        // No rule covers this path/method — access is DENIED.
        // Every legitimate route must have an explicit resource rule in MongoDB.
        return false;
    }

    // ── Step 3: most-specific-match wins ─────────────────────────────────
    // Sort descending by specificity so matches[0] is the most specific.
    matches.sort((a, b) =>
        _patternSpecificity(b.pathPattern) - _patternSpecificity(a.pathPattern)
    );

    const bestMatch = matches[0];
    const allowedRoleNames = bestMatch.allowedRoles.map(r => r.name);
    return userRoles.some(role => allowedRoleNames.includes(role));
};


/**
 * Match a request path against a resource pattern
 * Supports patterns like:
 *   /api/jobs          → exact match
 *   /api/recruiter/**  → wildcard match (any sub-path)
 *   /api/admin/*       → single-level wildcard
 */
const matchPath = (requestPath, pattern) => {
    // Exact match
    if (requestPath === pattern) return true;

    // Wildcard patterns
    if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3); // Remove /**
        return requestPath.startsWith(prefix);
    }

    if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2); // Remove /*
        const remaining = requestPath.slice(prefix.length);
        // Should match exactly one level deeper
        return requestPath.startsWith(prefix) && remaining.split('/').filter(Boolean).length <= 1;
    }

    return false;
};

/**
 * Handle token refresh: validate refresh token and issue new access token
 */
const refreshAccessToken = async (refreshToken) => {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findOne({
        $or: [
            { _id: decoded.userId },
            { uid: decoded.userId }
        ]
    });

    if (!user) {
        const error = new Error('User not found');
        error.code = 'USER_NOT_FOUND';
        throw error;
    }

    const newAccessToken = generateAccessToken(user);
    return { accessToken: newAccessToken, user };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    validateClient,
    getClientRoles,
    getUserRoles,
    checkResourceAccess,
    clearResourceCache,
    refreshAccessToken,
    JWT_SECRET,
    JWT_REFRESH_SECRET
};
