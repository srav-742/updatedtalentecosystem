/**
 * @fileoverview MongoDB Mongoose Connection Manager
 * @module config/database
 *
 * Establishes and manages the MongoDB connection lifecycle.
 */

import mongoose from 'mongoose';
import environment from './environment.js';
import logger from '../logger/logger.js';

/**
 * Connects to the MongoDB database using the URI in the environment configuration.
 *
 * @returns {Promise<mongoose.Connection>}
 */
export const connectDatabase = async () => {
  const uri = environment.database.mongoUri;

  if (!uri) {
    logger.error('Database connection failed: MONGO_URI environment variable is missing.');
    process.exit(1);
  }

  // Set Mongoose connection event listeners
  mongoose.connection.on('connected', () => {
    logger.info('✔ MongoDB connection established successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('✗ MongoDB connection error:', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected.');
  });

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    });
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB at startup:', { error: error.message });
    throw error;
  }
};

/**
 * Closes the MongoDB connection gracefully.
 *
 * @returns {Promise<void>}
 */
export const closeDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  logger.info('Closing MongoDB connection...');
  try {
    await mongoose.connection.close();
    logger.info('✔ MongoDB connection closed successfully.');
  } catch (error) {
    logger.error('Error while closing MongoDB connection:', { error: error.message });
    throw error;
  }
};

export default { connectDatabase, closeDatabase };
