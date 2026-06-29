/**
 * @fileoverview Error Code Constants
 * @module core/constants/errors
 *
 * Defines application-level error codes that are included in error responses.
 * These codes allow clients and operators to quickly identify the category
 * of failure without parsing message strings.
 */

/**
 * Error code constants grouped by domain.
 * Format: DOMAIN_NNN (e.g., AUTH_001, PROXY_002)
 *
 * @enum {string}
 */
const ERROR_CODES = Object.freeze({
  // ─── Authentication Errors ───────────────────────────
  AUTH_001: 'AUTH_001', // Token missing
  AUTH_002: 'AUTH_002', // Token expired
  AUTH_003: 'AUTH_003', // Token invalid / malformed
  AUTH_004: 'AUTH_004', // Token verification service unreachable
  AUTH_005: 'AUTH_005', // Insufficient permissions (authorization)

  // ─── Rate Limiting ──────────────────────────────────
  RATE_001: 'RATE_001', // Rate limit exceeded

  // ─── Validation Errors ──────────────────────────────
  VALIDATION_001: 'VALIDATION_001', // Request body validation failed
  VALIDATION_002: 'VALIDATION_002', // Query parameter validation failed
  VALIDATION_003: 'VALIDATION_003', // Path parameter validation failed

  // ─── Proxy / Upstream Errors ────────────────────────
  PROXY_001: 'PROXY_001', // Upstream connection refused
  PROXY_002: 'PROXY_002', // Upstream timeout
  PROXY_003: 'PROXY_003', // Upstream returned 5xx
  PROXY_004: 'PROXY_004', // Circuit breaker open
  PROXY_005: 'PROXY_005', // Upstream DNS resolution failed

  // ─── Gateway Errors ─────────────────────────────────
  GATEWAY_001: 'GATEWAY_001', // Gateway timeout (30s exceeded)
  GATEWAY_002: 'GATEWAY_002', // Malformed gateway configuration
  GATEWAY_003: 'GATEWAY_003', // Unknown route
  GATEWAY_004: 'GATEWAY_004', // Method not allowed

  // ─── Policy Errors ──────────────────────────────────
  POLICY_001: 'POLICY_001', // Ownership policy violation
  POLICY_002: 'POLICY_002', // Role-based policy violation
  POLICY_003: 'POLICY_003', // Resource access denied

  // ─── Internal Errors ────────────────────────────────
  INTERNAL_001: 'INTERNAL_001', // Unhandled exception
  INTERNAL_002: 'INTERNAL_002', // Configuration error
});

export default ERROR_CODES;
