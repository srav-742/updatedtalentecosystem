/**
 * @fileoverview Plugin Initializer
 * @module gateway/bootstrap/pluginInit
 *
 * Registers all gateway plugins with the singleton PluginManager.
 * Called during the deterministic boot sequence before the HTTP server starts.
 *
 * Registered plugins:
 *  - AuditPlugin         — Compliance and forensics logging
 *  - MetricsPlugin       — In-memory request metrics
 *  - TracingPlugin       — Distributed tracing lifecycle logging
 *  - NotificationPlugin  — Critical event alerting
 */

import { pluginManager } from '../plugins/PluginManager.js';
import AuditPlugin from '../plugins/AuditPlugin.js';
import MetricsPlugin from '../plugins/MetricsPlugin.js';
import TracingPlugin from '../plugins/TracingPlugin.js';
import NotificationPlugin from '../plugins/NotificationPlugin.js';
import logger from '../../core/logger/logger.js';

/**
 * Initializes and registers all gateway plugins.
 *
 * @returns {void}
 */
export const initializePlugins = () => {
  logger.info('Initializing gateway plugins...');

  pluginManager.registerAll([
    AuditPlugin,
    MetricsPlugin,
    TracingPlugin,
    NotificationPlugin,
  ]);

  const registered = pluginManager.getRegisteredPlugins();
  logger.info(`Plugins registered: [${registered.join(', ')}]`);
};

export default initializePlugins;
