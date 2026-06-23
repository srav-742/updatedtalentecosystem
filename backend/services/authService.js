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
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
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

    const isValid = await bcrypt.compare(clientSecret, client.clientSecret);
    if (!isValid) return null;

    return client;
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
    // The existing User model stores role as a single string ('seeker', 'recruiter', 'admin')
    return user.role ? [user.role] : ['user'];
};

/**
 * Check if a user's roles allow access to a specific resource
 * @param {string[]} userRoles - Array of role names the user has
 * @param {string} path - The API path being accessed
 * @param {string} method - The HTTP method (GET, POST, etc.)
 * @returns {boolean} - Whether access should be granted
 */
const checkResourceAccess = async (userRoles, path, method) => {
    // Find matching resources for this path and method
    const resources = await Resource.find({}).populate('allowedRoles');

    for (const resource of resources) {
        const pattern = resource.pathPattern;
        const resourceMethod = resource.method;

        // Check if the path matches the pattern
        const isPathMatch = matchPath(path, pattern);
        const isMethodMatch = resourceMethod === 'ALL' || resourceMethod === method.toUpperCase();

        if (isPathMatch && isMethodMatch) {
            // Check if any of the user's roles match the allowed roles
            const allowedRoleNames = resource.allowedRoles.map(r => r.name);
            const hasAccess = userRoles.some(role => allowedRoleNames.includes(role));

            if (!hasAccess) {
                return false; // Explicitly denied — user's roles don't match
            }
            return true; // Access granted
        }
    }

    // If no resource rule matches, default to allowing access
    // (only explicitly protected routes are restricted)
    return true;
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
    refreshAccessToken,
    JWT_SECRET,
    JWT_REFRESH_SECRET
};
