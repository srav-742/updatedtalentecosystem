const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Role = require('../models/Role');
const Resource = require('../models/Resource');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '24h';   // 24 hours (supports multi-stage assessments)
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days

const requireSecret = (secret, name) => {
    if (!secret) {
        throw new Error(`${name} must be configured.`);
    }
    return secret;
};

/**
 * Validate client credentials (Client ID and Client Secret)
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<object|null>} Client document or null if invalid
 */
const validateClientCredentials = async (clientId, clientSecret) => {
    if (!clientId || !clientSecret) return null;

    const client = await Client.findOne({ clientId, status: 'active' });
    if (!client) return null;

    const isValid = await client.compareSecret(clientSecret);
    if (!isValid) return null;

    return client;
};

/**
 * Generate a JWT access token for an authenticated user
 * @param {object} user - User document
 * @param {string} clientId - Client ID making the request
 * @param {string[]} roles - Array of role names
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (user, clientId, roles = []) => {
    const payload = {
        userId: user._id || user.uid,
        email: user.email,
        roles: roles,
        clientId: clientId,
        tokenType: 'access'
    };

    return jwt.sign(payload, requireSecret(JWT_SECRET, 'JWT_SECRET'), { expiresIn: ACCESS_TOKEN_EXPIRY });
};

/**
 * Generate a JWT refresh token
 * @param {object} user - User document
 * @param {string} clientId - Client ID
 * @returns {string} Signed JWT refresh token
 */
const generateRefreshToken = (user, clientId) => {
    const payload = {
        userId: user._id || user.uid,
        clientId: clientId,
        tokenType: 'refresh'
    };

    return jwt.sign(payload, requireSecret(JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TOKEN_EXPIRY });
};

/**
 * Verify a JWT access token
 * @param {string} token
 * @returns {object} Decoded token payload
 * @throws {JsonWebTokenError} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
    return jwt.verify(token, requireSecret(JWT_SECRET, 'JWT_SECRET'));
};

/**
 * Verify a JWT refresh token
 * @param {string} token
 * @returns {object} Decoded token payload
 * @throws {JsonWebTokenError} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
    return jwt.verify(token, requireSecret(JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'));
};

/**
 * Get all role names assigned to a client
 * @param {string} clientId
 * @returns {Promise<string[]>} Array of role names
 */
const getClientRoles = async (clientId) => {
    const client = await Client.findOne({ clientId }).populate('roles');
    if (!client || !client.roles) return [];
    return client.roles.map(r => r.name);
};

/**
 * Get role names for a user based on their User record
 * Normalizes 'seeker' and 'candidate' so both roles are granted interchangeably.
 * @param {object} user - User document
 * @returns {string[]} Array of role names
 */
const getUserRoles = (user) => {
    if (!user) return [];
    const roles = [];

    if (user.role) {
        roles.push(user.role);
        // Normalize candidate and seeker aliases
        if (user.role === 'seeker' && !roles.includes('candidate')) {
            roles.push('candidate');
        } else if (user.role === 'candidate' && !roles.includes('seeker')) {
            roles.push('seeker');
        }
    }

    // Pro / premium recruiter distinction
    if (user.role === 'recruiter' && user.isPro) {
        roles.push('premium_recruiter');
    }

    // Default authenticated role
    if (!roles.includes('user')) {
        roles.push('user');
    }

    return roles;
};

// ─── In-memory resource cache ─────────────────────────────────────────────
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
 */
const _patternSpecificity = (pattern) => {
    if (pattern.endsWith('/**')) return (pattern.length - 3);
    if (pattern.endsWith('/*'))  return (pattern.length - 2) + 1000;
    return pattern.length + 2000;
};

/**
 * Check if a user's roles allow access to a specific resource
 * @param {string[]} userRoles - Array of role names the user has
 * @param {string} path - The API path being accessed
 * @param {string} method - The HTTP method (GET, POST, etc.)
 * @returns {Promise<boolean>} - Whether access should be granted
 */
const checkResourceAccess = async (userRoles, path, method) => {
    const resources = await _getResources();

    // Collect every rule that matches this request
    const matches = resources.filter(resource => {
        const isPathMatch = matchPath(path, resource.pathPattern);
        const isMethodMatch = resource.method === 'ALL' || resource.method === method.toUpperCase();
        return isPathMatch && isMethodMatch;
    });

    // If no explicit resource rule exists, default to allowing access
    if (matches.length === 0) {
        return true;
    }

    // Sort descending by specificity so matches[0] is the most specific
    matches.sort((a, b) =>
        _patternSpecificity(b.pathPattern) - _patternSpecificity(a.pathPattern)
    );

    const bestMatch = matches[0];
    const allowedRoleNames = bestMatch.allowedRoles.map(r => r.name);
    return userRoles.some(role => allowedRoleNames.includes(role));
};

/**
 * Match a request path against a resource pattern
 * Supports:
 *   /api/resource/**  - matches /api/resource and all subpaths
 *   /api/resource/*   - matches /api/resource/something (one level only)
 *   /api/resource     - exact match only
 * @param {string} requestPath - e.g. /api/jobs/123
 * @param {string} pattern - e.g. /api/jobs/**
 * @returns {boolean}
 */
const matchPath = (requestPath, pattern) => {
    if (pattern === requestPath) return true;

    if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3);
        return requestPath === prefix || requestPath.startsWith(prefix + '/');
    }

    if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        const remainder = requestPath.slice(prefix.length + 1);
        return requestPath.startsWith(prefix + '/') && !remainder.includes('/');
    }

    return false;
};

/**
 * Refresh an access token using a valid refresh token
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string }>}
 */
const refreshAccessToken = async (refreshToken) => {
    const decoded = verifyRefreshToken(refreshToken);
    // Validate ObjectId format before querying _id to prevent CastError for Firebase UIDs
    const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
    const userQuery = (decoded.userId && OBJECT_ID_REGEX.test(decoded.userId.toString()))
        ? { $or: [{ _id: decoded.userId }, { uid: decoded.userId }] }
        : { uid: decoded.userId };
    const user = await User.findOne(userQuery);

    if (!user) {
        const error = new Error('User not found');
        error.name = 'UserNotFoundError';
        throw error;
    }

    const roles = getUserRoles(user);
    const newAccessToken = generateAccessToken(user, decoded.clientId, roles);

    return { accessToken: newAccessToken };
};

module.exports = {
    validateClientCredentials,
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    getClientRoles,
    getUserRoles,
    checkResourceAccess,
    clearResourceCache,
    refreshAccessToken,
    JWT_SECRET,
    JWT_REFRESH_SECRET
};
