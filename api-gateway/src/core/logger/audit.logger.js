/**
 * @fileoverview Audit Logger
 * @module core/logger/audit.logger
 *
 * Writes security-sensitive events to a dedicated audit log file.
 * Auth successes/failures, policy evaluations, admin actions, and
 * data access events are captured here for compliance and forensics.
 */

import winston from 'winston';
import 'winston-daily-rotate-file';
import environment from '../config/environment.js';
import contextStore from '../context/contextStore.js';

/**
 * Dedicated audit logger — writes to a separate audit.log file.
 * In development, it also writes to the console for visibility.
 *
 * @type {winston.Logger}
 */
const auditLogger = winston.createLogger({
  level: 'info',
  defaultMeta: {
    service: 'api-gateway',
    logType: 'audit',
  },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '100m',
      maxFiles: '365d',
      zippedArchive: true,
    }),
    ...(environment.isDevelopment
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [AUDIT][${level}] ${message} ${JSON.stringify(meta)}`;
              })
            ),
          }),
        ]
      : []),
  ],
  exitOnError: false,
});

/**
 * Logs an audit event with request context.
 *
 * @param {string} action - The action being audited (e.g., 'LOGIN', 'ACCESS_RESOURCE').
 * @param {Object} details - Structured audit data.
 * @param {string} [details.userId] - The user performing the action.
 * @param {string} [details.resource] - The resource being accessed.
 * @param {string} [details.outcome] - 'SUCCESS' or 'FAILURE'.
 * @param {string} [details.reason] - Reason for failure, if applicable.
 */
export const logAuditEvent = (action, details = {}) => {
  const ctx = contextStore.getContext();

  auditLogger.info(action, {
    requestId: ctx?.requestId || null,
    correlationId: ctx?.correlationId || null,
    clientIp: ctx?.clientIp || null,
    userId: details.userId || ctx?.user?.id || null,
    userRole: ctx?.user?.role || null,
    resource: details.resource || ctx?.path || null,
    method: ctx?.method || null,
    outcome: details.outcome || 'UNKNOWN',
    ...details,
  });
};

/**
 * Convenience methods for common audit events.
 */
export const auditAuth = (outcome, details = {}) =>
  logAuditEvent('AUTHENTICATION', { outcome, ...details });

export const auditAccess = (outcome, details = {}) =>
  logAuditEvent('RESOURCE_ACCESS', { outcome, ...details });

export const auditPolicy = (outcome, details = {}) =>
  logAuditEvent('POLICY_EVALUATION', { outcome, ...details });

export const auditAdmin = (action, details = {}) =>
  logAuditEvent(`ADMIN_ACTION:${action}`, { outcome: 'SUCCESS', ...details });

export default {
  logAuditEvent,
  auditAuth,
  auditAccess,
  auditPolicy,
  auditAdmin,
};
