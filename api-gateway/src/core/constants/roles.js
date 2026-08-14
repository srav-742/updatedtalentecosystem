/**
 * @fileoverview Role Constants
 * @module core/constants/roles
 *
 * Defines the platform user roles. Every auth check, policy evaluation,
 * and route guard references these constants for consistency.
 */

/**
 * Platform roles.
 * @enum {string}
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  RECRUITER: 'recruiter',
  CANDIDATE: 'candidate',
  SUPER_ADMIN: 'super_admin',
  GUEST: 'guest',
});

/**
 * Role hierarchy — higher index means more privileged.
 * Used by policy evaluations to check minimum required role.
 * @type {string[]}
 */
export const ROLE_HIERARCHY = Object.freeze([
  ROLES.GUEST,
  ROLES.CANDIDATE,
  ROLES.RECRUITER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]);

/**
 * Checks whether a given role meets a minimum required privilege level.
 *
 * @param {string} userRole - The authenticated user's role.
 * @param {string} requiredRole - The minimum role needed.
 * @returns {boolean} True if the user's role is at or above the required level.
 */
export const hasMinimumRole = (userRole, requiredRole) => {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  if (userIndex === -1 || requiredIndex === -1) return false;
  return userIndex >= requiredIndex;
};

export default ROLES;
