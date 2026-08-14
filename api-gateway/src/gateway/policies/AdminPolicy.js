/**
 * @fileoverview Admin Policy
 * @module gateway/policies/AdminPolicy
 *
 * Enforces that only admin-level users (admin, super_admin) can
 * access administrative endpoints. All other roles are denied.
 */

import ROLES, { hasMinimumRole } from '../../core/constants/roles.js';
import MESSAGES from '../../core/constants/messages.js';

/**
 * Admin Policy.
 * Strictly requires admin or super_admin role.
 */
const AdminPolicy = {
  name: 'AdminPolicy',

  /**
   * Evaluates the admin policy.
   *
   * @param {Object} context - Request context.
   * @param {Object} context.user - Authenticated user.
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async evaluate(context) {
    const { user } = context;

    if (!hasMinimumRole(user.role, ROLES.ADMIN)) {
      return {
        allowed: false,
        reason: MESSAGES.ACCESS_DENIED,
      };
    }

    return { allowed: true };
  },
};

export default AdminPolicy;
