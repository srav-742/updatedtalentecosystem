/**
 * @fileoverview RSA Key Pair Loader & Security Config
 * @module config/security
 *
 * Loads RSA public/private key pairs synchronously at startup.
 * Throws an error to fail-fast if keys are missing or unreadable.
 */

import fs from 'node:fs';
import path from 'node:path';
import environment from './environment.js';
import logger from '../logger/logger.js';

/** @type {string} RSA Private Key for signing JWTs */
let privateKey = '';

/** @type {string} RSA Public Key for verifying JWTs */
let publicKey = '';

/**
 * Loads the RSA keys from filesystem.
 *
 * @throws {Error} If key files are missing or unreadable.
 */
export const loadKeys = () => {
  try {
    const privateKeyPath = path.resolve(process.cwd(), environment.security.rsaPrivateKeyPath);
    const publicKeyPath = path.resolve(process.cwd(), environment.security.rsaPublicKeyPath);

    logger.info('Loading RSA cryptographic key pair...');
    logger.debug(`Private key path: ${privateKeyPath}`);
    logger.debug(`Public key path: ${publicKeyPath}`);

    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`RSA Private key file not found at ${privateKeyPath}`);
    }
    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`RSA Public key file not found at ${publicKeyPath}`);
    }

    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    logger.info('✔ RSA key pair loaded successfully.');
  } catch (error) {
    logger.error('Failed to load RSA cryptographic keys:', { error: error.message });
    throw error;
  }
};

// Load keys immediately on import
loadKeys();

/**
 * Frozen security configurations registry.
 */
export const securityConfig = Object.freeze({
  /**
   * Retrieves the loaded private key.
   * @returns {string}
   */
  get privateKey() {
    return privateKey;
  },

  /**
   * Retrieves the loaded public key.
   * @returns {string}
   */
  get publicKey() {
    return publicKey;
  },

  /** JWT configuration settings */
  jwt: Object.freeze({
    accessExpiresIn: environment.security.jwtAccessExpiresIn,
    refreshExpiresIn: environment.security.jwtRefreshExpiresIn,
  }),
});

export default securityConfig;
