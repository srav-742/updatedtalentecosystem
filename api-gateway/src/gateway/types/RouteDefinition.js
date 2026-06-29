/**
 * @fileoverview Route Definition Schema
 * @module gateway/types/RouteDefinition
 *
 * Defines and validates the structure of route definitions used in
 * the Route Registry. Enforces all parameters required for routing,
 * rate limiting, body parsing, timeouts, and policy evaluations.
 */

/**
 * Creates a validated RouteDefinition object.
 *
 * @param {Object} def - Raw route definition.
 * @returns {Object} A validated, frozen RouteDefinition.
 */
export const createRouteDefinition = (def) => {
  if (!def.path) {
    throw new Error('RouteDefinition: "path" is required.');
  }
  if (!def.serviceKey) {
    throw new Error('RouteDefinition: "serviceKey" is required.');
  }

  // Support both requiresAuth (old) and authRequired (new)
  const authRequired = def.authRequired !== undefined ? def.authRequired : (def.requiresAuth !== undefined ? def.requiresAuth : true);

  // Normalize method (support single string or default to '*')
  const method = def.method ? def.method.toUpperCase() : '*';

  // Normalize timeout (must support { gateway, downstream })
  let timeout = { gateway: 30000, downstream: 29000 };
  if (def.timeout) {
    if (typeof def.timeout === 'number') {
      timeout = {
        gateway: def.timeout,
        downstream: Math.max(1000, def.timeout - 1000), // 1s safety buffer
      };
    } else if (typeof def.timeout === 'object' && def.timeout.gateway && def.timeout.downstream) {
      timeout = {
        gateway: def.timeout.gateway,
        downstream: def.timeout.downstream,
      };
    }
  }

  return Object.freeze({
    version: def.version || 'v1',
    method,
    path: def.path,
    serviceKey: def.serviceKey,
    authRequired,
    permissions: Object.freeze(def.permissions || []),
    policies: Object.freeze(def.policies || []),
    timeout: Object.freeze(timeout),
    rateLimit: def.rateLimit || 'default',
    circuitBreaker: def.circuitBreaker || 'default',
    bodyLimit: def.bodyLimit || '2MB',
    tags: Object.freeze(def.tags || []),
    description: def.description || '',
  });
};

export default { createRouteDefinition };
