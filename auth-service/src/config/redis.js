/**
 * @fileoverview Redis Connection Manager
 * @module config/redis
 *
 * Establishes and manages the Redis cache connection lifecycle.
 */

import { createClient } from 'redis';
import environment from './environment.js';
import logger from '../logger/logger.js';

/**
 * Instantiate the Redis client instance.
 */
export const redisClient = createClient({
  url: environment.database.redisUrl,
  socket: {
    connectTimeout: 5000, // Timeout after 5s
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        logger.warn('Redis reconnection attempts exceeded. Stopping reconnect retries.');
        return new Error('Redis connection failed');
      }
      // Reconnect strategy: try every 2s, up to 3 times
      const delay = Math.min(retries * 500, 2000);
      logger.warn(`Redis client reconnecting in ${delay}ms (attempt ${retries})...`);
      return delay;
    },
  },
});

// Configure event listeners on the client instance
redisClient.on('connect', () => {
  logger.info('Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('✔ Redis client connected and ready.');
});

redisClient.on('error', (err) => {
  logger.error('✗ Redis client error:', { error: err.message });
});

redisClient.on('end', () => {
  logger.warn('Redis client connection closed.');
});

/**
 * Connects the Redis client to the Redis server.
 *
 * @returns {Promise<void>}
 */
export const connectRedis = async () => {
  if (!environment.database.redisEnabled) {
    logger.info('Redis caching is disabled by configuration. Session caching will fallback to database.');
    return;
  }
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to establish Redis connection at startup:', { error: error.message });
    throw error;
  }
};

/**
 * Closes the Redis connection gracefully.
 *
 * @returns {Promise<void>}
 */
export const closeRedis = async () => {
  if (!redisClient.isOpen) {
    return;
  }

  logger.info('Closing Redis connection...');
  try {
    await redisClient.quit();
    logger.info('✔ Redis connection closed successfully.');
  } catch (error) {
    logger.error('Error while closing Redis connection:', { error: error.message });
    throw error;
  }
};

export default { redisClient, connectRedis, closeRedis };
