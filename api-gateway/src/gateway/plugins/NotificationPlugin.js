/**
 * @fileoverview Notification Plugin
 * @module gateway/plugins/NotificationPlugin
 *
 * Listens for critical events (circuit breaker opens, repeated auth failures,
 * service outages) and logs alerts. In production, this would integrate
 * with Slack, PagerDuty, email, or another alerting system.
 */

import EVENTS from '../../core/constants/events.js';
import logger from '../../core/logger/logger.js';

/** @type {Map<string, number>} Tracks consecutive errors per service */
const errorCounters = new Map();

/** @type {number} Threshold for triggering an alert */
const ALERT_THRESHOLD = 10;

/**
 * Notification Plugin definition.
 * @type {Object}
 */
const NotificationPlugin = {
  name: 'NotificationPlugin',
  version: '1.0.0',

  /**
   * Registers event hooks with the PluginManager.
   *
   * @param {import('./PluginManager.js').PluginManager} manager
   */
  register(manager) {
    // Circuit breaker opened — immediate alert
    manager.on(EVENTS.CIRCUIT_OPEN, (data) => {
      logger.error(`🚨 ALERT: Circuit breaker OPEN for service "${data.serviceKey}"`, {
        alertType: 'CIRCUIT_BREAKER_OPEN',
        serviceKey: data.serviceKey,
        severity: 'CRITICAL',
      });
      // TODO: Integrate with Slack/PagerDuty webhook
    });

    // Proxy errors — track and alert on threshold
    manager.on(EVENTS.PROXY_REQUEST_ERROR, (data) => {
      const key = data.serviceKey || 'unknown';
      const count = (errorCounters.get(key) || 0) + 1;
      errorCounters.set(key, count);

      if (count === ALERT_THRESHOLD) {
        logger.error(
          `🚨 ALERT: Service "${key}" has ${ALERT_THRESHOLD} consecutive errors`,
          {
            alertType: 'SERVICE_ERROR_THRESHOLD',
            serviceKey: key,
            errorCount: count,
            severity: 'HIGH',
          }
        );
        // TODO: Send notification to ops team
      }
    });

    // Proxy success — reset error counter for the service
    manager.on(EVENTS.PROXY_REQUEST_END, (data) => {
      if (data.serviceKey && data.statusCode < 500) {
        errorCounters.set(data.serviceKey, 0);
      }
    });

    // Service unhealthy during health check
    manager.on(EVENTS.SERVICE_UNHEALTHY, (data) => {
      logger.warn(`⚠️ Service "${data.serviceKey}" is unhealthy`, {
        alertType: 'SERVICE_UNHEALTHY',
        serviceKey: data.serviceKey,
        severity: 'MEDIUM',
      });
    });

    // Server shutting down
    manager.on(EVENTS.SERVER_SHUTTING_DOWN, () => {
      logger.info('📢 Server is shutting down — notifying dependent services', {
        alertType: 'SERVER_SHUTDOWN',
        severity: 'INFO',
      });
    });
  },
};

export default NotificationPlugin;
