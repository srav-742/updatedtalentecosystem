/**
 * @fileoverview Gateway Request Schema
 * @module gateway/types/GatewayRequest
 *
 * Defines the enriched request object shape used internally by the gateway.
 * Middleware layers attach gateway-specific properties to the Express request,
 * and this module documents and validates that shape.
 */

/**
 * Creates a GatewayRequest metadata object and attaches it to req.gateway.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {Object} [overrides={}] - Override values.
 * @returns {Object} The gateway metadata object.
 */
export const createGatewayRequest = (req, overrides = {}) => {
  const gatewayMeta = {
    /** @type {string} Unique request identifier */
    requestId: overrides.requestId || null,

    /** @type {string} Correlation ID for distributed tracing */
    correlationId: overrides.correlationId || null,

    /** @type {number} High-resolution start time */
    startTime: overrides.startTime || Date.now(),

    /** @type {string|null} Target service key (e.g., 'AUTH_SERVICE') */
    targetService: overrides.targetService || null,

    /** @type {string|null} Matched route pattern */
    routePattern: overrides.routePattern || null,

    /** @type {Object|null} Authenticated user context */
    user: overrides.user || null,

    /** @type {string[]} Permissions required for this route */
    requiredPermissions: overrides.requiredPermissions || [],

    /** @type {string[]} Policies to evaluate for this route */
    policies: overrides.policies || [],

    /** @type {boolean} Whether authentication is required */
    requiresAuth: overrides.requiresAuth !== undefined ? overrides.requiresAuth : true,

    /** @type {Object} Plugin metadata bag */
    pluginData: overrides.pluginData || {},
  };

  // Attach to the Express request object
  req.gateway = gatewayMeta;

  return gatewayMeta;
};

/**
 * Retrieves the gateway metadata from a request.
 *
 * @param {import('express').Request} req
 * @returns {Object|null} The gateway metadata or null.
 */
export const getGatewayRequest = (req) => req.gateway || null;

export default { createGatewayRequest, getGatewayRequest };
