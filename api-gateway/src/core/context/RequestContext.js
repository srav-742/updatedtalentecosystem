/**
 * @fileoverview Request Context Schema
 * @module core/context/RequestContext
 *
 * Defines the structured context object that travels with every request
 * through the gateway pipeline. Middleware layers progressively enrich
 * this context (request ID, correlation ID, auth info, timing data).
 */

/**
 * Creates a new RequestContext with sensible defaults.
 *
 * @param {Object} [overrides={}] - Optional property overrides.
 * @returns {Object} A frozen RequestContext object.
 */
export const createRequestContext = (overrides = {}) => {
  return {
    /** @type {string} Unique request identifier (UUID v4) */
    requestId: overrides.requestId || null,

    /** @type {string} Distributed tracing correlation ID */
    correlationId: overrides.correlationId || null,

    /** @type {string} W3C Trace ID */
    traceId: overrides.traceId || null,

    /** @type {string} W3C Span ID */
    spanId: overrides.spanId || null,

    /** @type {string} Client IP address */
    ip: overrides.ip || overrides.clientIp || null,
    clientIp: overrides.clientIp || overrides.ip || null,

    /** @type {string} User-Agent string */
    userAgent: overrides.userAgent || null,

    /** @type {string} Accept-Language locale */
    locale: overrides.locale || 'en',

    /** @type {string|null} Authenticated user ID */
    userId: overrides.userId || null,

    /** @type {string|null} Authenticated user email */
    email: overrides.email || null,

    /** @type {string|null} Authenticated user role */
    role: overrides.role || null,

    /** @type {string[]} Authenticated user permissions */
    permissions: overrides.permissions || [],

    /** @type {Object|null} Session metadata */
    session: overrides.session || null,

    /** @type {number} Request start timestamp */
    startTime: overrides.startTime || Date.now(),
    requestStartTime: overrides.startTime || Date.now(),

    /** @type {string} HTTP method */
    method: overrides.method || null,

    /** @type {string} Original request path */
    path: overrides.path || null,

    /** @type {string|null} Target service key */
    targetService: overrides.targetService || null,

    /** @type {string|null} Matched route pattern */
    routePattern: overrides.routePattern || null,

    /** @type {Object} Metadata bag for plugins */
    metadata: overrides.metadata || {},
  };
};

/**
 * Computes the elapsed time in milliseconds from the context start time.
 *
 * @param {Object} context - A RequestContext object.
 * @returns {number} Elapsed milliseconds.
 */
export const getElapsedMs = (context) => {
  return Date.now() - (context.requestStartTime || context.startTime || Date.now());
};

export default createRequestContext;
