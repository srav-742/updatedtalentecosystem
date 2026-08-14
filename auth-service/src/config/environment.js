/**
 * @fileoverview Environment Configuration & Startup Validator
 * @module config/environment
 *
 * Loads environment variables from .env and validates that all required
 * configuration values are present. If any critical variable is missing,
 * the process exits immediately with code 1.
 */

import dotenv from 'dotenv';

/** Load .env file into process.env */
dotenv.config();

/**
 * List of environment variables that MUST be set for the auth-service to start.
 * The service will refuse to boot if any of these are missing.
 * @type {string[]}
 */
const REQUIRED_VARIABLES = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

/**
 * Validates that every required environment variable is defined and non-empty.
 * Logs all missing variables before exiting.
 *
 * @throws {Error} Prints missing variables and exits with code 1.
 */
const validateEnvironment = () => {
  const missing = REQUIRED_VARIABLES.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    console.error('=====================================================');
    console.error(' FATAL: Missing required environment variables');
    console.error('=====================================================');
    missing.forEach((key) => console.error(`  ✗  ${key}`));
    console.error('=====================================================');
    console.error(' The Auth Service cannot start without these variables.');
    console.error(' Please check your .env file or deployment config.');
    console.error('=====================================================');
    process.exit(1);
  }
};

/** Run validation immediately on import */
validateEnvironment();

/**
 * Frozen environment configuration object.
 * All downstream modules should import this instead of reading process.env directly.
 *
 * @type {Object}
 */
const environment = Object.freeze({
  /** @type {number} Server listening port */
  port: parseInt(process.env.PORT, 10) || 5001,

  /** @type {string} Current deployment environment */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** @type {string} Winston log level */
  logLevel: process.env.LOG_LEVEL || 'debug',

  /** @type {boolean} Whether the service is running in production */
  isProduction: process.env.NODE_ENV === 'production',

  /** @type {boolean} Whether the service is running in development */
  isDevelopment: process.env.NODE_ENV === 'development',

  /** @type {boolean} Whether the service is running in testing */
  isTesting: process.env.NODE_ENV === 'testing',

  /** Database configurations */
  database: Object.freeze({
    /** @type {string} MongoDB connection URI */
    mongoUri: process.env.MONGO_URI,

    /** @type {string} Redis connection URL */
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    /** @type {boolean} Whether Redis is enabled */
    redisEnabled: process.env.REDIS_ENABLED === 'true',
  }),

  /** Security and tokens */
  security: Object.freeze({
    /** @type {string} RSA private key path */
    rsaPrivateKeyPath: process.env.RSA_PRIVATE_KEY_PATH || 'keys/private.pem',

    /** @type {string} RSA public key path */
    rsaPublicKeyPath: process.env.RSA_PUBLIC_KEY_PATH || 'keys/public.pem',

    /** @type {string} JWT Access Token secret */
    jwtSecret: process.env.JWT_SECRET,

    /** @type {string} JWT Refresh Token secret */
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,

    /** @type {string} JWT Access Token duration (e.g. 15m, 1h) */
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',

    /** @type {string} JWT Refresh Token duration (e.g. 7d, 30d) */
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  }),

  /** CORS configuration */
  cors: Object.freeze({
    /** @type {string} Allowed origin */
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  }),

  /** Shutdown configuration */
  shutdown: Object.freeze({
    /** @type {number} Graceful shutdown drain timeout in ms */
    timeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS, 10) || 10000,
  }),
});

export default environment;
