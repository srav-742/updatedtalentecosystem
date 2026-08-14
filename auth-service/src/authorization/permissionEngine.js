/**
 * @fileoverview Permission Evaluation Engine
 * @module authorization/permissionEngine
 */

/**
 * Normalizes permission strings to a standard uppercase format with underscores.
 * E.g., 'jobs:read' -> 'JOBS_READ', 'JOBS:READ' -> 'JOBS_READ'
 *
 * @param {string} perm - Input permission string.
 * @returns {string} Standardized permission string.
 */
export const normalizePermission = (perm) => {
  if (!perm) return '';
  return perm.toUpperCase().replace(/:/g, '_').trim();
};

/**
 * Checks if a user has a required permission, supporting wildcards and flexible formatting.
 *
 * @param {string[]} userPermissions - List of permissions user possesses (e.g. ['JOBS_READ', 'RESUMES_*']).
 * @param {string} requiredPermission - Permission string needed (e.g. 'jobs:read').
 * @returns {boolean} True if permission is matched.
 */
export const checkPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  if (!requiredPermission) return true; // Empty requirement is always allowed

  const normalizedRequired = normalizePermission(requiredPermission);

  return userPermissions.some((userPerm) => {
    const normalizedUserPerm = normalizePermission(userPerm);

    // Direct match
    if (normalizedUserPerm === normalizedRequired) return true;

    // Wildcard match (e.g., 'JOBS_*' matches 'JOBS_READ')
    if (normalizedUserPerm.includes('*')) {
      const prefix = normalizedUserPerm.split('*')[0];
      if (normalizedRequired.startsWith(prefix)) return true;
    }

    return false;
  });
};

export default {
  normalizePermission,
  checkPermission,
};
