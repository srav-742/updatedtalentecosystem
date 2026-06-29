/**
 * @fileoverview Role Evaluation Engine
 * @module authorization/roleEngine
 */

/**
 * Standard platform roles hierarchy.
 * Higher index = higher privileges.
 */
export const ROLE_HIERARCHY = Object.freeze([
  'guest',
  'candidate',
  'recruiter',
  'admin',
  'super_admin'
]);

/**
 * Normalizes role names to align with API Gateway contracts.
 * Especially handles database role 'seeker' mapping to Gateway's expected 'candidate'.
 *
 * @param {string} role - Input role name.
 * @returns {string} Normalized role name.
 */
export const normalizeRole = (role) => {
  if (!role) return 'guest';
  const r = role.toLowerCase().trim();
  if (r === 'seeker') return 'candidate';
  return r;
};

/**
 * Validates role exists in hierarchy.
 *
 * @param {string} role
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return ROLE_HIERARCHY.includes(normalizeRole(role));
};

/**
 * Checks if user's role meets the minimum required role.
 *
 * @param {string} userRole - Current role of user.
 * @param {string} requiredRole - Minimum role required.
 * @returns {boolean} True if user role is equal to or more privileged.
 */
export const hasMinimumRole = (userRole, requiredRole) => {
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedRequiredRole = normalizeRole(requiredRole);

  const userIndex = ROLE_HIERARCHY.indexOf(normalizedUserRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(normalizedRequiredRole);

  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex >= requiredIndex;
};

export default {
  ROLE_HIERARCHY,
  normalizeRole,
  isValidRole,
  hasMinimumRole,
};
