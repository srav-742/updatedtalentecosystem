/**
 * @fileoverview Infrastructure Health Checker
 * @module config/health
 *
 * Verifies live connection states for MongoDB and Redis.
 */

import mongoose from 'mongoose';
import { redisClient } from './redis.js';
import logger from '../logger/logger.js';

/**
 * Checks connection states for MongoDB and Redis.
 *
 * @returns {Promise<Object>} Object detailing health of MongoDB and Redis.
 */
export const checkInfrastructureHealth = async () => {
  // 1. Check MongoDB state
  // mongoose.connection.readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbState = mongoose.connection.readyState;
  let databaseStatus = 'DOWN';

  switch (dbState) {
    case 1:
      databaseStatus = 'UP';
      break;
    case 2:
      databaseStatus = 'CONNECTING';
      break;
    case 3:
      databaseStatus = 'DISCONNECTING';
      break;
    default:
      databaseStatus = 'DOWN';
  }

  // 2. Check Redis state
  let redisStatus = 'DOWN';
  let redisLatencyMs = null;

  if (redisClient.isReady) {
    const start = Date.now();
    try {
      // Execute an active ping command to verify Redis socket response
      const response = await redisClient.ping();
      if (response === 'PONG') {
        redisStatus = 'UP';
        redisLatencyMs = Date.now() - start;
      }
    } catch (error) {
      logger.error('Redis health check ping failed:', { error: error.message });
      redisStatus = 'ERROR';
    }
  }

  const healthy = databaseStatus === 'UP' && redisStatus === 'UP';

  return {
    database: databaseStatus,
    redis: {
      status: redisStatus,
      ...(redisLatencyMs !== null ? { latencyMs: redisLatencyMs } : {}),
    },
    healthy,
  };
};

export default checkInfrastructureHealth;
