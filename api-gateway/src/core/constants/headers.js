/**
 * @fileoverview Standard Header Constants
 * @module core/constants/headers
 *
 * Centralized registry of custom HTTP header names used throughout the gateway.
 * All middleware and proxy logic should reference these constants instead of
 * using inline header strings to prevent typos and enable easy refactoring.
 */

/**
 * Custom and standard header names used by the gateway.
 * @enum {string}
 */
const HEADERS = Object.freeze({
  /** Unique identifier for the incoming client request */
  REQUEST_ID: 'X-Request-ID',

  /** Distributed tracing correlation ID propagated across services */
  CORRELATION_ID: 'X-Correlation-ID',

  /** Forwarded-For header for original client IP */
  FORWARDED_FOR: 'X-Forwarded-For',

  /** Forwarded host header */
  FORWARDED_HOST: 'X-Forwarded-Host',

  /** Forwarded protocol (http/https) */
  FORWARDED_PROTO: 'X-Forwarded-Proto',

  /** Gateway identifier attached to proxied requests */
  GATEWAY_ID: 'X-Gateway-ID',

  /** Gateway version header */
  GATEWAY_VERSION: 'X-Gateway-Version',

  /** Standard Authorization header */
  AUTHORIZATION: 'Authorization',

  /** Content-Type header */
  CONTENT_TYPE: 'Content-Type',

  /** Accept header */
  ACCEPT: 'Accept',

  /** User-Agent header */
  USER_AGENT: 'User-Agent',

  /** Response time header added by the gateway */
  RESPONSE_TIME: 'X-Response-Time',

  /** Rate limit remaining header */
  RATE_LIMIT_REMAINING: 'X-RateLimit-Remaining',

  /** Rate limit total header */
  RATE_LIMIT_LIMIT: 'X-RateLimit-Limit',

  /** Rate limit reset header */
  RATE_LIMIT_RESET: 'X-RateLimit-Reset',

  /** Authenticated user ID propagated to downstream services */
  USER_ID: 'X-User-ID',

  /** Authenticated user role propagated to downstream services */
  USER_ROLE: 'X-User-Role',

  /** Authenticated user email propagated to downstream services */
  USER_EMAIL: 'X-User-Email',
});

export default HEADERS;
