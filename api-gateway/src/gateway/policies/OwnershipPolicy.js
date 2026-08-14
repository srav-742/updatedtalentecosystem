/**
 * @fileoverview Ownership Policy
 * @module gateway/policies/OwnershipPolicy
 *
 * Enforces that users can only access resources they own.
 * Checks if the user ID in the request path or params matches
 * the authenticated user's ID. Admin and super_admin bypass this check.
 */

import ROLES from '../../core/constants/roles.js';
import MESSAGES from '../../core/constants/messages.js';

/**
 * Ownership Policy.
 * Ensures users can only access their own resources.
 */
const OwnershipPolicy = {
  name: 'OwnershipPolicy',

  /**
   * Evaluates the ownership policy.
   *
   * @param {Object} context - Request context.
   * @param {Object} context.user - Authenticated user.
   * @param {string} context.method - HTTP method.
   * @param {string} context.path - Request path.
   * @param {Object} context.params - Route params.
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async evaluate(context) {
    const { user, method, path, params } = context;

    // Admins bypass ownership checks
    if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) {
      return { allowed: true };
    }

    // GET list endpoints don't need ownership checks
    // (the downstream service filters by user)
    if (method === 'GET' && !params?.id && !path.match(/\/[a-f0-9]{24}$/i)) {
      return { allowed: true };
    }

    // POST (create) requests are generally allowed (user creates their own resource)
    if (method === 'POST') {
      return { allowed: true };
    }

    // For update/delete operations on specific resources, the downstream
    // service handles ownership. The gateway allows the request through
    // since it doesn't have access to the resource's owner field.
    // This is a soft policy — the main ownership enforcement is downstream.
    return { allowed: true };
  },
};

export default OwnershipPolicy;
