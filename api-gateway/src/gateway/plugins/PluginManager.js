/**
 * @fileoverview Plugin Manager
 * @module gateway/plugins/PluginManager
 *
 * EventEmitter-based plugin system for attaching cross-cutting concerns
 * (audit, metrics, tracing, notifications) to gateway lifecycle events
 * without cluttering core proxy logic.
 */

import { EventEmitter } from 'node:events';
import logger from '../../core/logger/logger.js';

/**
 * PluginManager — manages gateway plugins and routes events to them.
 *
 * Plugins register hooks (event listeners) during initialization.
 * The proxy factory and middleware emit events that plugins react to.
 *
 * @extends EventEmitter
 */
class PluginManager extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, Object>} Registered plugins */
    this._plugins = new Map();
    this.setMaxListeners(50); // Allow many plugin hooks
  }

  /**
   * Registers a plugin with the manager.
   *
   * @param {Object} plugin - The plugin to register.
   * @param {string} plugin.name - Unique plugin name.
   * @param {string} plugin.version - Plugin version.
   * @param {Function} plugin.register - Registration function receiving the PluginManager.
   */
  register(plugin) {
    if (!plugin.name) {
      throw new Error('Plugin must have a "name" property.');
    }

    if (this._plugins.has(plugin.name)) {
      logger.warn(`Plugin "${plugin.name}" is already registered. Skipping.`);
      return;
    }

    try {
      plugin.register(this);
      this._plugins.set(plugin.name, plugin);
      logger.info(`Plugin registered: ${plugin.name} v${plugin.version || '1.0.0'}`);
    } catch (err) {
      logger.error(`Failed to register plugin "${plugin.name}": ${err.message}`);
    }
  }

  /**
   * Registers multiple plugins at once.
   *
   * @param {Object[]} plugins - Array of plugin objects.
   */
  registerAll(plugins) {
    for (const plugin of plugins) {
      this.register(plugin);
    }
  }

  /**
   * Returns the names of all registered plugins.
   *
   * @returns {string[]}
   */
  getRegisteredPlugins() {
    return Array.from(this._plugins.keys());
  }

  /**
   * Checks if a specific plugin is registered.
   *
   * @param {string} name - Plugin name.
   * @returns {boolean}
   */
  hasPlugin(name) {
    return this._plugins.has(name);
  }

  /**
   * Removes a plugin and all its event listeners.
   *
   * @param {string} name - Plugin name.
   */
  unregister(name) {
    if (this._plugins.has(name)) {
      this._plugins.delete(name);
      logger.info(`Plugin unregistered: ${name}`);
    }
  }
}

/**
 * Singleton PluginManager instance.
 * @type {PluginManager}
 */
export const pluginManager = new PluginManager();

export default pluginManager;
