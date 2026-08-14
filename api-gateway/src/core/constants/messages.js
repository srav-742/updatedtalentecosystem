/**
 * @fileoverview User-Facing Message Constants
 * @module core/constants/messages
 *
 * Centralized message strings returned in API responses.
 * Keeps user-facing messaging consistent and makes
 * internationalization (i18n) straightforward in the future.
 */

/**
 * Standard response messages.
 * @enum {string}
 */
const MESSAGES = Object.freeze({
  // ─── Success ─────────────────────────────────────────
  SUCCESS: 'Request completed successfully.',
  CREATED: 'Resource created successfully.',
  UPDATED: 'Resource updated successfully.',
  DELETED: 'Resource deleted successfully.',

  // ─── Auth ────────────────────────────────────────────
  AUTH_TOKEN_MISSING: 'Authentication token is required. Please provide a valid Bearer token.',
  AUTH_TOKEN_EXPIRED: 'Authentication token has expired. Please refresh your token.',
  AUTH_TOKEN_INVALID: 'Authentication token is invalid or malformed.',
  AUTH_SERVICE_UNAVAILABLE: 'Authentication service is temporarily unavailable. Please try again.',
  AUTH_INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions to perform this action.',
  AUTH_LOGIN_SUCCESS: 'Login successful.',
  AUTH_LOGOUT_SUCCESS: 'Logout successful.',

  // ─── Rate Limiting ──────────────────────────────────
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',

  // ─── Validation ─────────────────────────────────────
  VALIDATION_FAILED: 'Request validation failed. Please check your input.',
  INVALID_REQUEST_BODY: 'Request body is invalid or malformed.',
  MISSING_REQUIRED_FIELDS: 'One or more required fields are missing.',

  // ─── Proxy / Upstream ───────────────────────────────
  SERVICE_UNAVAILABLE: 'The requested service is temporarily unavailable. Please try again later.',
  UPSTREAM_TIMEOUT: 'The upstream service did not respond in time.',
  CIRCUIT_BREAKER_OPEN: 'Service is temporarily unavailable due to high error rate. Requests are being short-circuited.',
  BAD_GATEWAY: 'Received an invalid response from the upstream service.',

  // ─── Gateway ────────────────────────────────────────
  GATEWAY_TIMEOUT: 'The gateway timed out while processing your request.',
  ROUTE_NOT_FOUND: 'The requested endpoint does not exist.',
  METHOD_NOT_ALLOWED: 'The HTTP method is not supported for this endpoint.',

  // ─── Policy ─────────────────────────────────────────
  OWNERSHIP_VIOLATION: 'You can only access resources that belong to you.',
  ROLE_VIOLATION: 'Your role does not permit this action.',
  ACCESS_DENIED: 'Access to the requested resource has been denied.',

  // ─── Server ─────────────────────────────────────────
  INTERNAL_ERROR: 'An internal server error occurred. Please try again later.',
  SHUTTING_DOWN: 'Server is shutting down. Please retry your request.',

  // ─── Health ─────────────────────────────────────────
  HEALTH_OK: 'Gateway is healthy and all services are reachable.',
  HEALTH_DEGRADED: 'Gateway is operational but some downstream services are unreachable.',
  READY: 'Gateway is ready to accept traffic.',
  LIVE: 'Gateway process is alive.',
});

export default MESSAGES;
