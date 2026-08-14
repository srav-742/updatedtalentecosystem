/**
 * @fileoverview User-Facing Message Constants
 * @module constants/messages
 *
 * Centralized message strings returned in API responses.
 * Keeps user-facing messaging consistent.
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
  AUTH_INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions to perform this action.',
  AUTH_LOGIN_SUCCESS: 'Login successful.',
  AUTH_LOGOUT_SUCCESS: 'Logout successful.',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_USER_EXISTS: 'User with this email already exists.',
  AUTH_REGISTRATION_SUCCESS: 'Registration successful.',

  // ─── Rate Limiting ──────────────────────────────────
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',

  // ─── Validation ─────────────────────────────────────
  VALIDATION_FAILED: 'Request validation failed. Please check your input.',
  INVALID_REQUEST_BODY: 'Request body is invalid or malformed.',
  MISSING_REQUIRED_FIELDS: 'One or more required fields are missing.',

  // ─── Server ─────────────────────────────────────────
  INTERNAL_ERROR: 'An internal server error occurred. Please try again later.',
  SHUTTING_DOWN: 'Server is shutting down. Please retry your request.',

  // ─── Health ─────────────────────────────────────────
  HEALTH_OK: 'Auth Service is healthy.',
  HEALTH_DEGRADED: 'Auth Service is operational but degraded.',
  READY: 'Auth Service is ready to accept traffic.',
  LIVE: 'Auth Service process is alive.',
});

export default MESSAGES;
