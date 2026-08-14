/**
 * @fileoverview Resource Access Checker
 * @module authorization/resourceAccessChecker
 */

import roleEngine from './roleEngine.js';
import policyEngine from './policyEngine.js';
import UserRepository from '../repositories/UserRepository.js';

/**
 * Resolves user role and permissions from DB if not supplied by the request,
 * then checks if user has access to perform the action on the resource.
 *
 * @param {Object} params
 * @param {string} params.userId - User ID (ObjectId).
 * @param {string} [params.role] - Optional user role (will fetch from DB if missing).
 * @param {string[]} [params.permissions] - Optional user permissions list (will fetch from DB if missing).
 * @param {string} params.resource - Resource (e.g. 'job:12345').
 * @param {string} params.action - Action (read, write, delete, admin).
 * @returns {Promise<Object>} Access check result { allowed: boolean, reason?: string }.
 */
export const checkAccess = async ({ userId, role, permissions, resource, action }) => {
  let resolvedRole = role;
  let resolvedPermissions = permissions;

  // Resolve user info from database if missing
  if (!resolvedRole || !resolvedPermissions || !Array.isArray(resolvedPermissions)) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      return { allowed: false, reason: `User with ID '${userId}' not found.` };
    }

    resolvedRole = user.role;
    
    // Fetch user permissions recursively
    const userWithPerms = await UserRepository.findByEmailWithPermissions(user.email);
    resolvedPermissions = userWithPerms?.roleRef?.permissions?.map((p) => p.name) || [];
  }

  // Normalize role (e.g. 'seeker' -> 'candidate')
  const normalizedRole = roleEngine.normalizeRole(resolvedRole);

  // Evaluate policy
  return policyEngine.evaluate({
    role: normalizedRole,
    permissions: resolvedPermissions,
    resource,
    action
  });
};

export default {
  checkAccess,
};
