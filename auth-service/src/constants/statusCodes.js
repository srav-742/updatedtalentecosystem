/**
 * @fileoverview HTTP Status Code Constants
 * @module constants/statusCodes
 *
 * Maps semantic names to HTTP status codes. Eliminates magic numbers
 * and ensures consistent usage across error handlers and responses.
 */

/**
 * HTTP status code constants.
 * @enum {number}
 */
const STATUS_CODES = Object.freeze({
  // ─── 2xx Success ─────────────────────────────────────
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // ─── 3xx Redirection ────────────────────────────────
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // ─── 4xx Client Errors ──────────────────────────────
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // ─── 5xx Server Errors ──────────────────────────────
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
});

export default STATUS_CODES;
