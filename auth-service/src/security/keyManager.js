/**
 * @fileoverview Cryptographic Keys & JWKS Manager
 * @module security/keyManager
 */

import crypto from 'node:crypto';
import securityConfig from '../config/security.js';

/** Unique identifier for the current RSA key pair version */
const CURRENT_KEY_ID = 'h1p-auth-key-v1';

/** @type {Object|null} Cached JWK public key representation */
let cachedJwk = null;

/**
 * Returns the loaded RSA private key string.
 * @returns {string}
 */
export const getPrivateKey = () => {
  return securityConfig.privateKey;
};

/**
 * Returns the loaded RSA public key string.
 * @returns {string}
 */
export const getPublicKey = () => {
  return securityConfig.publicKey;
};

/**
 * Generates the JWK representation of the RSA public key.
 *
 * @returns {Object} JWK object.
 */
export const getPublicKeyJwk = () => {
  if (cachedJwk) return cachedJwk;

  const publicKeyPem = getPublicKey();
  if (!publicKeyPem) {
    throw new Error('RSA Public Key is not loaded.');
  }

  // Use Node.js crypto to parse PEM public key and export to JWK format
  const parsedKey = crypto.createPublicKey(publicKeyPem);
  const jwkRaw = parsedKey.export({ format: 'jwk' });

  cachedJwk = Object.freeze({
    kty: jwkRaw.kty,
    n: jwkRaw.n,
    e: jwkRaw.e,
    kid: CURRENT_KEY_ID,
    use: 'sig',
    alg: 'RS256',
  });

  return cachedJwk;
};

/**
 * Generates the JSON Web Key Set (JWKS) publishing schema.
 *
 * @returns {Object} JWKS containing active keys.
 */
export const getJwks = () => {
  return {
    keys: [getPublicKeyJwk()],
  };
};

export default {
  getPrivateKey,
  getPublicKey,
  getPublicKeyJwk,
  getJwks,
  CURRENT_KEY_ID,
};
