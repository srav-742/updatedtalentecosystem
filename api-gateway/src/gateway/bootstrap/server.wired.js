/**
 * @fileoverview Wired Gateway Server Entry Point
 * @module gateway/bootstrap/server.wired
 *
 * Bootstraps the Hire1Percent API Gateway with the COMPLETE deterministic
 * boot sequence. This file does NOT modify the original `server.js` scaffold —
 * it is a standalone replacement.
 *
 * Deterministic Boot Sequence:
 *  1.  Load Environment       — dotenv validated by environment.js on import
 *  2.  Initialize Logger      — Winston logger bootstraps on import
 *  3.  Initialize Plugins     — Register AuditPlugin, MetricsPlugin, TracingPlugin, NotificationPlugin
 *  4.  Initialize Policies    — Validate all route-referenced policies are registered
 *  5.  Ping Downstream        — Health check all registered services (non-blocking)
 *  6.  Create HTTP Server     — Bind the wired Express app
 *  7.  Start Listening        — Open the port
 *  8.  Register Shutdown       — SIGINT / SIGTERM graceful shutdown
 *  9.  Mark Healthy           — Emit SERVER_READY event
 *
 * Usage:
 *   node src/gateway/bootstrap/server.wired.js
 *
 * Or add to package.json:
 *   "start:wired": "node src/gateway/bootstrap/server.wired.js"
 */

import http from 'node:http';

// ─── Step 1: Load & Validate Environment ─────────────────────
// environment.js runs validateEnvironment() on import and exits if invalid
import environment from '../../core/config/environment.js';

// ─── Step 2: Initialize Logger ───────────────────────────────
import logger from '../../core/logger/logger.js';
import { logUnhandledRejection, logUncaughtException } from '../../core/logger/error.logger.js';

// ─── Service Registry (for downstream pings) ────────────────
import { serviceRegistry } from '../../core/config/serviceRegistry.js';

// ─── Event System ────────────────────────────────────────────
import EVENTS from '../../core/constants/events.js';
import { pluginManager } from '../plugins/PluginManager.js';

// ─── Step 3: Plugin Initializer ──────────────────────────────
import { initializePlugins } from './pluginInit.js';

// ─── Step 4: Policy Initializer ──────────────────────────────
import { initializePolicies } from './policyInit.js';

// ─── Step 6: Wired Express App ───────────────────────────────
import app from './app.wired.js';

/** @type {http.Server|null} */
let server = null;

/** @type {boolean} Flag to prevent duplicate shutdown runs */
let isShuttingDown = false;

/**
 * Step 5: Pings all registered downstream services to check availability.
 * Logs the status of each service. Does NOT block startup —
 * services that are down will be caught later by the circuit breaker.
 *
 * @returns {Promise<void>}
 */
const pingDownstreamServices = async () => {
  const entries = serviceRegistry.getEntries();
  logger.info('─────────────────────────────────────────────');
  logger.info(' Downstream Service Readiness Check');
  logger.info('─────────────────────────────────────────────');

  for (const [key, url] of entries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        logger.info(`  ✔  ${key.padEnd(25)} → ${url}  [UP]`);
      } else {
        logger.warn(`  ⚠  ${key.padEnd(25)} → ${url}  [DOWN / NO HEALTH ENDPOINT]`);
      }
    } catch {
      logger.warn(`  ⚠  ${key.padEnd(25)} → ${url}  [UNREACHABLE]`);
    }
  }

  logger.info('─────────────────────────────────────────────');
};

/**
 * Gracefully shuts down the HTTP server.
 *
 * @param {string} signal - The signal that triggered shutdown (e.g. 'SIGINT').
 */
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info('');
  logger.info('═════════════════════════════════════════════');
  logger.info(` Received ${signal}. Starting graceful shutdown...`);
  logger.info('═════════════════════════════════════════════');

  // Emit shutdown event for plugins
  pluginManager.emit(EVENTS.SERVER_SHUTTING_DOWN, { signal });

  if (server) {
    server.close((err) => {
      if (err) {
        logger.error(`Error during server close: ${err.message}`);
        process.exit(1);
      }

      pluginManager.emit(EVENTS.SERVER_SHUTDOWN_COMPLETE, {});
      logger.info(' ✔  All connections drained. Server closed.');
      process.exit(0);
    });
  }

  // Force shutdown if connections don't drain
  setTimeout(() => {
    logger.error(
      ` ✗  Could not drain connections within ${environment.shutdown.timeout}ms. Forcing exit.`
    );
    process.exit(1);
  }, environment.shutdown.timeout);
};

/**
 * Starts the API Gateway server with the full deterministic boot sequence.
 *
 * @returns {Promise<void>}
 */
const startServer = async () => {
  try {
    logger.info('');
    logger.info('═════════════════════════════════════════════');
    logger.info(' Hire1Percent API Gateway (Wired Mode)');
    logger.info(`  Environment : ${environment.nodeEnv}`);
    logger.info(`  Log Level   : ${environment.logLevel}`);
    logger.info('═════════════════════════════════════════════');

    // ─── Step 1: Environment already loaded & validated on import ──

    // ─── Step 2: Logger already initialized on import ─────────────

    // ─── Step 3: Initialize Plugins ──────────────────────────────
    pluginManager.emit(EVENTS.SERVER_STARTING, {});
    initializePlugins();

    // ─── Step 4: Initialize Policy Engine ────────────────────────
    initializePolicies();

    // ─── Step 5: Ping Downstream Services (non-blocking) ─────────
    await pingDownstreamServices();

    // ─── Step 6: Create HTTP Server ──────────────────────────────
    server = http.createServer(app);

    // ─── Step 7: Start Listening ─────────────────────────────────
    server.listen(environment.port, () => {
      logger.info('');
      logger.info('═════════════════════════════════════════════');
      logger.info(` ✔  Gateway listening on port ${environment.port}`);
      logger.info(`    http://localhost:${environment.port}`);
      logger.info(`    Health:  http://localhost:${environment.port}/health`);
      logger.info(`    Ready:   http://localhost:${environment.port}/ready`);
      logger.info(`    Live:    http://localhost:${environment.port}/live`);
      logger.info('═════════════════════════════════════════════');
      logger.info('');

      // ─── Step 9: Mark Healthy ────────────────────────────────
      pluginManager.emit(EVENTS.SERVER_READY, {
        port: environment.port,
        environment: environment.nodeEnv,
      });
    });

    // ─── Step 8: Register Shutdown Hooks ──────────────────────────
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Catch unhandled rejections
    process.on('unhandledRejection', (reason) => {
      logUnhandledRejection(reason instanceof Error ? reason : new Error(String(reason)));
    });

    // Catch uncaught exceptions — log and exit
    process.on('uncaughtException', (error) => {
      logUncaughtException(error);
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    logger.error(`Failed to start the API Gateway: ${error.message}`, {
      source: 'server.wired',
      stack: error.stack,
    });
    process.exit(1);
  }
};

/** Boot the gateway */
startServer();
