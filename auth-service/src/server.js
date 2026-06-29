/**
 * @fileoverview Auth Service Server Entry Point
 * @module server
 *
 * Bootstraps the Hire1Percent Auth Service.
 *
 * Startup sequence:
 *  1. Load and validate environment variables (environment.js runs on import).
 *  2. Create the HTTP server from the Express app.
 *  3. Begin listening on the configured port.
 *  4. Register SIGINT / SIGTERM handlers for graceful shutdown.
 *
 * Graceful shutdown behavior:
 *  - Stop accepting new connections.
 *  - Wait for in-flight requests to complete (up to GRACEFUL_SHUTDOWN_TIMEOUT_MS).
 *  - Close the HTTP server and exit with code 0.
 */

import http from 'node:http';
import environment from './config/environment.js';
import logger from './logger/logger.js';
import app from './app.js';

// Infrastructure imports
import { connectDatabase, closeDatabase } from './config/database.js';
import { connectRedis, closeRedis } from './config/redis.js';
import './config/security.js'; // Triggers cryptographic key loading at startup

/** @type {http.Server|null} */
let server = null;

/** @type {boolean} Flag to prevent duplicate shutdown runs */
let isShuttingDown = false;

/**
 * Gracefully shuts down the HTTP server and database/cache connections.
 *
 * @param {string} signal - The signal that triggered shutdown (e.g. 'SIGINT').
 */
const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  /** Stop accepting new connections */
  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error('Error during server close:', { error: err.message });
      } else {
        logger.info('All HTTP connections drained.');
      }

      try {
        // Close Redis client connection
        await closeRedis();

        // Close Mongoose database connection
        await closeDatabase();

        logger.info('✔ Graceful shutdown completed.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during database/cache connection close:', { error: error.message });
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }

  /**
   * Force shutdown if connections don't drain within the configured timeout.
   */
  setTimeout(() => {
    logger.error(`Could not drain connections within ${environment.shutdown.timeout}ms. Forcing exit.`);
    process.exit(1);
  }, environment.shutdown.timeout);
};

/**
 * Starts the Auth Service server.
 *
 * @returns {Promise<void>}
 */
const startServer = async () => {
  try {
    logger.info('Starting Auth Service...', {
      environment: environment.nodeEnv,
      logLevel: environment.logLevel,
      port: environment.port,
    });

    /** Initialize database and cache connections */
    await connectDatabase();
    
    // Connect to Redis in background so it doesn't block server startup if Redis is down
    connectRedis().catch((err) => {
      logger.error('Redis initial connection attempt failed. Reconnection will be handled in the background.', { error: err.message });
    });

    /** Create the HTTP server from the Express app */
    server = http.createServer(app);

    /** Start listening */
    server.listen(environment.port, () => {
      logger.info('=====================================================');
      logger.info(`✔ Auth Service listening on port ${environment.port}`);
      logger.info(`   Local:   http://localhost:${environment.port}`);
      logger.info(`   Health:  http://localhost:${environment.port}/health`);
      logger.info(`   Ready:   http://localhost:${environment.port}/ready`);
      logger.info(`   Live:    http://localhost:${environment.port}/live`);
      logger.info('=====================================================');
    });

    /** Register shutdown hooks */
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    /** Catch unhandled rejections to prevent silent crashes */
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', { reason: reason instanceof Error ? reason.message : reason, stack: reason instanceof Error ? reason.stack : undefined });
    });

    /** Catch uncaught exceptions — log and exit */
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start the Auth Service:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

/** Boot the server */
startServer();
