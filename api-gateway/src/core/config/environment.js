/**
 * @fileoverview Environment Configuration & Startup Validator
 * @module core/config/environment
 *
 * Loads environment variables from .env and validates that all required
 * configuration values are present. If any critical variable is missing,
 * the process exits immediately with code 1 to prevent a partially
 * configured gateway from accepting traffic.
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localEnvPath = path.resolve(__dirname, '../../../.env');
const exampleEnvPath = path.resolve(__dirname, '../../../.env.example');

/** Load .env file into process.env */
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else if (fs.existsSync(exampleEnvPath)) {
  dotenv.config({ path: exampleEnvPath });
} else {
  dotenv.config();
}

/**
 * List of environment variables that MUST be set for the gateway to start.
 * The gateway will refuse to boot if any of these are missing.
 * @type {string[]}
 */
const REQUIRED_VARIABLES = [
  'PORT',
  'NODE_ENV',
  'AUTH_SERVICE_URL',
  'JOB_SERVICE_URL',
  'CANDIDATE_SERVICE_URL',
  'RECRUITER_SERVICE_URL',
  'ADMIN_SERVICE_URL',
  'ASSESSMENT_SERVICE_URL',
  'INTERVIEW_SERVICE_URL',
  'RESUME_SERVICE_URL',
  'NOTIFICATION_SERVICE_URL',
];

/**
 * Validates that every required environment variable is defined and non-empty.
 * Logs all missing variables before exiting so operators can fix them in one pass.
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
    console.error(' The gateway cannot start without these variables.');
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
  port: parseInt(process.env.PORT, 10) || 5000,

  /** @type {string} Current deployment environment */
  nodeEnv: process.env.NODE_ENV || 'development',

  /** @type {string} Winston log level */
  logLevel: process.env.LOG_LEVEL || 'debug',

  /** @type {boolean} Whether the gateway is running in production */
  isProduction: process.env.NODE_ENV === 'production',

  /** @type {boolean} Whether the gateway is running in development */
  isDevelopment: process.env.NODE_ENV === 'development',

  /** @type {boolean} Whether the gateway is running in testing */
  isTesting: process.env.NODE_ENV === 'testing',

  /** Downstream microservice URLs */
  services: Object.freeze({
    /** @type {string} Authentication service base URL */
    authService: process.env.AUTH_SERVICE_URL,

    /** @type {string} Job service base URL */
    jobService: process.env.JOB_SERVICE_URL,

    /** @type {string} Candidate service base URL */
    candidateService: process.env.CANDIDATE_SERVICE_URL,

    /** @type {string} Recruiter service base URL */
    recruiterService: process.env.RECRUITER_SERVICE_URL,

    /** @type {string} Admin service base URL */
    adminService: process.env.ADMIN_SERVICE_URL,

    /** @type {string} Assessment service base URL */
    assessmentService: process.env.ASSESSMENT_SERVICE_URL,

    /** @type {string} Interview service base URL */
    interviewService: process.env.INTERVIEW_SERVICE_URL,

    /** @type {string} Resume service base URL */
    resumeService: process.env.RESUME_SERVICE_URL,

    /** @type {string} Notification service base URL */
    notificationService: process.env.NOTIFICATION_SERVICE_URL,

    /** @type {string} Monolithic backend base URL */
    backend: process.env.BACKEND_SERVICE_URL || 'http://localhost:5010',
  }),

  /** Rate limiting configuration */
  rateLimit: Object.freeze({
    /** @type {number} Time window in milliseconds */
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,

    /** @type {number} Max requests per window */
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  }),

  /** Gateway timeout configuration */
  timeouts: Object.freeze({
    /** @type {number} Maximum gateway-level request duration in ms */
    gateway: parseInt(process.env.GATEWAY_TIMEOUT_MS, 10) || 30000,

    /** @type {number} Axios/proxy request timeout in ms */
    proxy: parseInt(process.env.PROXY_TIMEOUT_MS, 10) || 5000,
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

  /** Circuit breaker configuration defaults */
  circuitBreakers: Object.freeze({
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS, 10) || 30000,
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD, 10) || 50,
    volumeThreshold: parseInt(process.env.CIRCUIT_BREAKER_VOLUME_THRESHOLD, 10) || 5,
  }),

  /** Auth Client Cache */
  authCache: Object.freeze({
    enabled: process.env.AUTH_CACHE_ENABLED === 'true',
    ttlMs: parseInt(process.env.AUTH_CACHE_TTL_MS, 10) || 2000,
  }),

  /** Auth Service Client retries */
  authClient: Object.freeze({
    retries: parseInt(process.env.AUTH_SERVICE_CLIENT_RETRIES, 10) || 2,
  }),

  /** Boot settings */
  boot: Object.freeze({
    failFast: process.env.BOOT_FAIL_FAST !== 'false',
  }),
});


export default environment;
