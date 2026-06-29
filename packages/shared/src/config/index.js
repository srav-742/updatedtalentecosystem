import dotenv from 'dotenv';

// Load environment variables immediately
dotenv.config();

/**
 * Validates and returns environment configuration.
 * 
 * @param {Object} options
 * @param {string[]} [options.required=[]] - Required environment variables
 * @param {Object} [options.defaults={}] - Default values
 * @param {Object} [options.formatters={}] - Formatting functions
 * @param {boolean} [options.exitOnFailure=true] - Whether to exit the process on failure
 * @returns {Object} Frozen configuration object
 */
export function loadConfig({
  required = [],
  defaults = {},
  formatters = {},
  exitOnFailure = true,
} = {}) {
  const missing = required.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  if (missing.length > 0) {
    if (exitOnFailure) {
      console.error('=====================================================');
      console.error(' FATAL: Missing required environment variables');
      console.error('=====================================================');
      missing.forEach((key) => console.error(`  ✗  ${key}`));
      console.error('=====================================================');
      process.exit(1);
    } else {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  const baseConfig = {
    port: parseInt(process.env.PORT || defaults.PORT || defaults.port, 10) || 5000,
    nodeEnv: process.env.NODE_ENV || defaults.NODE_ENV || defaults.nodeEnv || 'development',
    logLevel: process.env.LOG_LEVEL || defaults.LOG_LEVEL || defaults.logLevel || 'debug',
    isProduction: (process.env.NODE_ENV || defaults.NODE_ENV || defaults.nodeEnv) === 'production',
    isDevelopment: (process.env.NODE_ENV || defaults.NODE_ENV || defaults.nodeEnv) === 'development',
    isTesting: (process.env.NODE_ENV || defaults.NODE_ENV || defaults.nodeEnv) === 'testing',
  };

  const dynamicConfig = {};
  const allKeys = new Set([
    ...Object.keys(process.env),
    ...Object.keys(defaults),
    ...Object.keys(formatters),
  ]);

  for (const key of allKeys) {
    if (['PORT', 'NODE_ENV', 'LOG_LEVEL'].includes(key)) continue;

    let val = process.env[key] !== undefined ? process.env[key] : defaults[key];
    if (formatters[key] && val !== undefined) {
      val = formatters[key](val);
    }
    dynamicConfig[key] = val;
  }

  const config = {
    ...baseConfig,
    ...dynamicConfig,
  };

  // Typed config access helpers
  Object.defineProperties(config, {
    get: {
      value: (key, defaultValue) => (config[key] !== undefined ? config[key] : defaultValue),
      writable: false,
      configurable: false,
    },
    getInteger: {
      value: (key, defaultValue) => {
        const val = config[key];
        if (val === undefined) return defaultValue;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      },
      writable: false,
      configurable: false,
    },
    getBoolean: {
      value: (key, defaultValue) => {
        const val = config[key];
        if (val === undefined) return defaultValue;
        if (typeof val === 'boolean') return val;
        return val === 'true' || val === '1';
      },
      writable: false,
      configurable: false,
    },
  });

  return Object.freeze(config);
}

export default { loadConfig };
