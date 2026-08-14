/**
 * @fileoverview Error Code Constants
 * @module constants/errors
 *
 * Defines application-level error codes that are included in error responses.
 * These codes allow clients and operators to quickly identify the category
 * of failure without parsing message strings.
 */

/**
 * Error code constants grouped by domain.
 * Format: DOMAIN_NNN (e.g., AUTH_001, SYS_500)
 *
 * @enum {string}
 */
const ERROR_CODES = Object.freeze({
  // ─── Authentication Errors ───────────────────────────
  AUTH_001: 'AUTH_001', // Token missing
  AUTH_002: 'AUTH_002', // Token expired
  AUTH_003: 'AUTH_003', // Token invalid / malformed
  AUTH_004: 'AUTH_004', // Invalid credentials
  AUTH_005: 'AUTH_005', // Insufficient permissions
  AUTH_006: 'AUTH_006', // User already exists

  // ─── Rate Limiting ──────────────────────────────────
  RATE_001: 'RATE_001', // Rate limit exceeded

  // ─── Validation Errors ──────────────────────────────
  VALIDATION_001: 'VALIDATION_001', // Request body validation failed
  VALIDATION_002: 'VALIDATION_002', // Query parameter validation failed
  VALIDATION_003: 'VALIDATION_003', // Path parameter validation failed

  // ─── Internal Errors ────────────────────────────────
  INTERNAL_001: 'INTERNAL_001', // Unhandled exception
  INTERNAL_002: 'INTERNAL_002', // Configuration error
});

export default ERROR_CODES;
