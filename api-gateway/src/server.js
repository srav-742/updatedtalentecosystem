/**
 * @fileoverview Gateway Server Entry Point
 * @module server
 *
 * Bootstraps the Hire1Percent API Gateway.
 *
 * Startup sequence:
 *  1. Load and validate environment variables (environment.js runs on import).
 *  2. Ping downstream services to verify readiness.
 *  3. Create the HTTP server from the Express app.
 *  4. Begin listening on the configured port.
 *  5. Register SIGINT / SIGTERM handlers for graceful shutdown.
 *
 * Graceful shutdown behavior:
 *  - Stop accepting new connections.
 *  - Wait for in-flight requests to complete (up to GRACEFUL_SHUTDOWN_TIMEOUT_MS).
 *  - Close the HTTP server and exit with code 0.
 */

import http from 'node:http';
import environment from './core/config/environment.js';
import { serviceRegistry } from './core/config/serviceRegistry.js';
import app from './app.js';

/** @type {http.Server|null} */
let server = null;

/** @type {boolean} Flag to prevent duplicate shutdown runs */
let isShuttingDown = false;

/**
 * Pings all registered downstream services to check availability.
 * Logs the status of each service. Does NOT block startup —
 * services that are down will be caught later by the circuit breaker.
 *
 * @returns {Promise<void>}
 */
const pingDownstreamServices = async () => {
  const entries = serviceRegistry.getEntries();
  console.log('─────────────────────────────────────────────');
  console.log(' Downstream Service Readiness Check');
  console.log('─────────────────────────────────────────────');

  for (const [key, url] of entries) {
    try {
      /**
       * Use a dynamic import of the native fetch (Node 18+) or fallback.
       * We do a lightweight HEAD request with a short timeout.
       */
      const healthUrl = `${url}/health`;
      let response = null;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        response = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (response && response.ok) break;
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
      }

      if (response && response.ok) {
        console.log(`  ✔  ${key.padEnd(25)} → ${healthUrl}  [UP]`);
      } else {
        console.warn(`  ⚠  ${key.padEnd(25)} → ${healthUrl}  [DOWN / NO HEALTH ENDPOINT]`);
      }
    } catch {
      console.warn(`  ⚠  ${key.padEnd(25)} → ${url}  [UNREACHABLE]`);
    }
  }

  console.log('─────────────────────────────────────────────');
};

/**
 * Gracefully shuts down the HTTP server.
 *
 * Steps:
 *  1. Mark the shutdown flag to avoid re-entry.
 *  2. Stop accepting new TCP connections.
 *  3. Wait for active connections to drain within the configured timeout.
 *  4. Force-close any remaining connections after timeout.
 *  5. Exit the process.
 *
 * @param {string} signal - The signal that triggered shutdown (e.g. 'SIGINT').
 */
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('');
  console.log('═════════════════════════════════════════════');
  console.log(` Received ${signal}. Starting graceful shutdown...`);
  console.log('═════════════════════════════════════════════');

  /** Stop accepting new connections */
  if (server) {
    server.close((err) => {
      if (err) {
        console.error(' Error during server close:', err.message);
        process.exit(1);
      }
      console.log(' ✔  All connections drained. Server closed.');
      process.exit(0);
    });
  }

  /**
   * Force shutdown if connections don't drain within the configured timeout.
   * This prevents the gateway from hanging indefinitely during deployments.
   */
  setTimeout(() => {
    console.error(
      ` ✗  Could not drain connections within ${environment.shutdown.timeout}ms. Forcing exit.`
    );
    process.exit(1);
  }, environment.shutdown.timeout);
};

/**
 * Starts the API Gateway server.
 *
 * @returns {Promise<void>}
 */
const startServer = async () => {
  try {
    console.log('');
    console.log('═════════════════════════════════════════════');
    console.log(' Hire1Percent API Gateway');
    console.log(`  Environment : ${environment.nodeEnv}`);
    console.log(`  Log Level   : ${environment.logLevel}`);
    console.log('═════════════════════════════════════════════');

    /** Ping downstream services (non-blocking) */
    await pingDownstreamServices();

    /** Create the HTTP server from the Express app */
    server = http.createServer(app);

    /** Start listening */
    server.listen(environment.port, () => {
      console.log('');
      console.log('═════════════════════════════════════════════');
      console.log(` ✔  Gateway listening on port ${environment.port}`);
      console.log(`    http://localhost:${environment.port}`);
      console.log(`    Health:  http://localhost:${environment.port}/health`);
      console.log(`    Ready:   http://localhost:${environment.port}/ready`);
      console.log(`    Live:    http://localhost:${environment.port}/live`);
      console.log('═════════════════════════════════════════════');
      console.log('');
    });

    /** Register shutdown hooks */
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    /** Catch unhandled rejections to prevent silent crashes */
    process.on('unhandledRejection', (reason) => {
      console.error(' Unhandled Rejection:', reason);
    });

    /** Catch uncaught exceptions — log and exit */
    process.on('uncaughtException', (error) => {
      console.error(' Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    console.error(' Failed to start the API Gateway:', error);
    process.exit(1);
  }
};

/** Boot the gateway */
startServer();
