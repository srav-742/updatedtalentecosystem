/**
 * @fileoverview Policy Manager
 * @module gateway/policies/PolicyManager
 *
 * Orchestrates the execution of named policies against request context.
 * Maps policy names from route definitions to their implementation classes
 * and evaluates them sequentially.
 */

import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';
import logger from '../../core/logger/logger.js';

// Import policy implementations
import OwnershipPolicy from './OwnershipPolicy.js';
import RecruiterPolicy from './RecruiterPolicy.js';
import CandidatePolicy from './CandidatePolicy.js';
import AdminPolicy from './AdminPolicy.js';

/**
 * Registry mapping policy names to their implementations.
 * @type {Map<string, Object>}
 */
const policyMap = new Map([
  ['OwnershipPolicy', OwnershipPolicy],
  ['RecruiterPolicy', RecruiterPolicy],
  ['CandidatePolicy', CandidatePolicy],
  ['AdminPolicy', AdminPolicy],
]);

/**
 * PolicyManager — evaluates a list of policies against request context.
 */
export const PolicyManager = {
  /**
   * Evaluates an array of policy names against the given context.
   * Returns on the first policy that denies access.
   *
   * @param {string[]} policyNames - Policy names from the route definition.
   * @param {Object} context - Request context for policy evaluation.
   * @param {Object} context.user - The authenticated user.
   * @param {string} context.method - HTTP method.
   * @param {string} context.path - Request path.
   * @param {Object} context.params - Route params.
   * @param {Object} context.query - Query params.
   * @param {Object} context.body - Request body.
   * @returns {Promise<{allowed: boolean, policy?: string, reason?: string}>}
   */
  async evaluate(policyNames, context) {
    for (const policyName of policyNames) {
      const policy = policyMap.get(policyName);

      if (!policy) {
        logger.warn(`Policy "${policyName}" not found in registry — skipping.`, {
          source: 'PolicyManager',
        });
        continue;
      }

      try {
        const result = await policy.evaluate(context);

        if (!result.allowed) {
          // Emit deny event
          pluginManager.emit(EVENTS.POLICY_DENY, {
            policy: policyName,
            userId: context.user?.id || context.user?._id,
            resource: context.path,
            reason: result.reason,
          });

          return {
            allowed: false,
            policy: policyName,
            reason: result.reason || `Denied by ${policyName}`,
          };
        }

        // Emit pass event
        pluginManager.emit(EVENTS.POLICY_PASS, {
          policy: policyName,
          userId: context.user?.id || context.user?._id,
          resource: context.path,
        });
      } catch (error) {
        logger.error(`Policy "${policyName}" threw an error: ${error.message}`, {
          source: 'PolicyManager',
        });

        return {
          allowed: false,
          policy: policyName,
          reason: `Policy evaluation failed: ${error.message}`,
        };
      }
    }

    return { allowed: true };
  },

  /**
   * Registers a custom policy at runtime.
   *
   * @param {string} name - Policy name.
   * @param {Object} policy - Policy implementation with `evaluate(context)` method.
   */
  registerPolicy(name, policy) {
    if (typeof policy.evaluate !== 'function') {
      throw new Error(`Policy "${name}" must have an "evaluate" method.`);
    }
    policyMap.set(name, policy);
    logger.info(`Policy registered: ${name}`);
  },

  /**
   * Returns all registered policy names.
   * @returns {string[]}
   */
  getRegisteredPolicies() {
    return Array.from(policyMap.keys());
  },
};

export default PolicyManager;
