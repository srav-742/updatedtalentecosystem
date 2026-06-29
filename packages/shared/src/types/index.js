/**
 * @typedef {Object} RequestContext
 * @property {string} requestId
 * @property {string} correlationId
 * @property {string} [traceId]
 * @property {string} [spanId]
 * @property {string} method
 * @property {string} path
 * @property {string} ip
 * @property {string} userAgent
 * @property {string} [userId]
 * @property {string} [role]
 * @property {string[]} [permissions]
 * @property {Object} [session]
 */

/**
 * @typedef {Object} AuthenticatedUser
 * @property {string} userId
 * @property {string} role
 * @property {string[]} permissions
 * @property {string} [email]
 */

/**
 * @typedef {Object} SessionInfo
 * @property {string} sessionId
 * @property {string} userId
 * @property {string} [ip]
 * @property {string} [userAgent]
 * @property {number} expiresAt
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success
 * @property {number} status
 * @property {string} message
 * @property {*} [data]
 * @property {Object} [meta]
 * @property {string} [correlationId]
 * @property {string} timestamp
 */

/**
 * @typedef {Object} ApiErrorResponse
 * @property {boolean} success
 * @property {number} status
 * @property {string} message
 * @property {string} [code]
 * @property {*} [details]
 * @property {string} [correlationId]
 * @property {string} [requestId]
 * @property {string} timestamp
 */

export const schemaTypes = {
  RequestContext: 'RequestContext',
  AuthenticatedUser: 'AuthenticatedUser',
  SessionInfo: 'SessionInfo',
  ApiResponse: 'ApiResponse',
  ApiErrorResponse: 'ApiErrorResponse',
};

export default {
  schemaTypes,
};
