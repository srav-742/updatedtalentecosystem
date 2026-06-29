/**
 * @fileoverview Audit Plugin
 * @module gateway/plugins/AuditPlugin
 *
 * Listens to authentication and policy events and logs them
 * to the dedicated audit log for compliance and forensics.
 */

import EVENTS from '../../core/constants/events.js';
import { auditAuth, auditAccess, auditPolicy } from '../../core/logger/audit.logger.js';

/**
 * Audit Plugin definition.
 * @type {Object}
 */
const AuditPlugin = {
  name: 'AuditPlugin',
  version: '1.0.0',

  /**
   * Registers event hooks with the PluginManager.
   *
   * @param {import('./PluginManager.js').PluginManager} manager
   */
  register(manager) {
    // Auth events
    manager.on(EVENTS.AUTH_SUCCESS, (data) => {
      auditAuth('SUCCESS', {
        userId: data.userId,
        method: data.method,
        resource: data.path,
      });
    });

    manager.on(EVENTS.AUTH_FAILURE, (data) => {
      auditAuth('FAILURE', {
        reason: data.reason,
        method: data.method,
        resource: data.path,
      });
    });

    // Policy events
    manager.on(EVENTS.POLICY_PASS, (data) => {
      auditPolicy('PASS', {
        policy: data.policy,
        userId: data.userId,
        resource: data.resource,
      });
    });

    manager.on(EVENTS.POLICY_DENY, (data) => {
      auditPolicy('DENY', {
        policy: data.policy,
        userId: data.userId,
        resource: data.resource,
        reason: data.reason,
      });
    });

    // Request completion (access log)
    manager.on(EVENTS.REQUEST_COMPLETED, (data) => {
      auditAccess('SUCCESS', {
        userId: data.userId,
        method: data.method,
        resource: data.path,
        statusCode: data.statusCode,
        responseTimeMs: data.responseTimeMs,
      });
    });

    manager.on(EVENTS.REQUEST_FAILED, (data) => {
      auditAccess('FAILURE', {
        userId: data.userId,
        method: data.method,
        resource: data.path,
        statusCode: data.statusCode,
        error: data.error,
      });
    });
  },
};

export default AuditPlugin;
