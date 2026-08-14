export const HEADERS = Object.freeze({
  USER_ID: 'X-H1P-User-ID',
  ROLE: 'X-H1P-Role',
  PERMISSIONS: 'X-H1P-Permissions',
  ORGANIZATION_ID: 'X-H1P-Organization-ID',
  TENANT_ID: 'X-H1P-Tenant-ID',
  SESSION_ID: 'X-H1P-Session-ID',
  AUTH_VERSION: 'X-H1P-Auth-Version',
});

/**
 * Parses trusted X-H1P headers from an incoming request headers object.
 * 
 * @param {Object} headers
 * @returns {Object} Parsed identity object
 */
export function parseHeaders(headers = {}) {
  const normalized = {};
  for (const [key, val] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = val;
  }

  const userId = normalized[HEADERS.USER_ID.toLowerCase()] || null;
  const role = normalized[HEADERS.ROLE.toLowerCase()] || null;
  const permissionsStr = normalized[HEADERS.PERMISSIONS.toLowerCase()] || '';
  const organizationId = normalized[HEADERS.ORGANIZATION_ID.toLowerCase()] || null;
  const tenantId = normalized[HEADERS.TENANT_ID.toLowerCase()] || null;
  const sessionId = normalized[HEADERS.SESSION_ID.toLowerCase()] || null;
  const authVersion = normalized[HEADERS.AUTH_VERSION.toLowerCase()] || null;

  const permissions = permissionsStr
    ? permissionsStr.split(',').map((p) => p.trim()).filter(Boolean)
    : [];

  return {
    userId,
    role,
    permissions,
    organizationId,
    tenantId,
    sessionId,
    authVersion,
  };
}

/**
 * Builds trusted X-H1P headers from identity properties.
 * 
 * @param {Object} identity
 * @returns {Object} Headers object
 */
export function buildHeaders(identity = {}) {
  const {
    userId,
    role,
    permissions,
    organizationId,
    tenantId,
    sessionId,
    authVersion = '1',
  } = identity;

  const headers = {};
  if (userId !== undefined && userId !== null) headers[HEADERS.USER_ID] = String(userId);
  if (role !== undefined && role !== null) headers[HEADERS.ROLE] = String(role);
  if (permissions !== undefined && permissions !== null) {
    headers[HEADERS.PERMISSIONS] = Array.isArray(permissions)
      ? permissions.join(',')
      : String(permissions);
  }
  if (organizationId !== undefined && organizationId !== null) headers[HEADERS.ORGANIZATION_ID] = String(organizationId);
  if (tenantId !== undefined && tenantId !== null) headers[HEADERS.TENANT_ID] = String(tenantId);
  if (sessionId !== undefined && sessionId !== null) headers[HEADERS.SESSION_ID] = String(sessionId);
  headers[HEADERS.AUTH_VERSION] = String(authVersion);

  return headers;
}

/**
 * Validates the structure and presence of essential trusted headers.
 * 
 * @param {Object} headers
 * @returns {Object} Result object containing { valid, error }
 */
export function validateHeaders(headers = {}) {
  const parsed = parseHeaders(headers);
  if (parsed.role && !parsed.userId) {
    return { valid: false, error: 'User ID is missing but Role is present.' };
  }
  if (parsed.authVersion && parsed.authVersion !== '1') {
    return { valid: false, error: `Unsupported auth version: ${parsed.authVersion}.` };
  }
  return { valid: true, error: null };
}

export default {
  HEADERS,
  parseHeaders,
  buildHeaders,
  validateHeaders,
};
