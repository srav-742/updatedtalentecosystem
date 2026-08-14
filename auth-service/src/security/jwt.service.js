/**
 * @fileoverview JWT Signing & Verification Service
 * @module security/jwt.service
 */

import jwt from 'jsonwebtoken';
import keyManager from './keyManager.js';

/**
 * Signs a payload to generate an RSA-signed JWT.
 *
 * @param {Object} payload - Token payload content.
 * @param {jwt.SignOptions} [options={}] - Custom signing options.
 * @returns {string} The signed JWT.
 */
export const signToken = (payload, options = {}) => {
  const privateKey = keyManager.getPrivateKey();
  if (!privateKey) {
    throw new Error('RSA Private Key not loaded. Cannot sign token.');
  }

  const defaultOptions = {
    algorithm: 'RS256',
    keyid: keyManager.CURRENT_KEY_ID,
  };

  return jwt.sign(payload, privateKey, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Verifies and decodes an RSA-signed JWT.
 *
 * @param {string} token - The signed JWT.
 * @param {jwt.VerifyOptions} [options={}] - Custom verification options.
 * @returns {Object} The decoded payload.
 * @throws {Error} If token is expired, invalid, or signature verification fails.
 */
export const verifyToken = (token, options = {}) => {
  const publicKey = keyManager.getPublicKey();
  if (!publicKey) {
    throw new Error('RSA Public Key not loaded. Cannot verify token.');
  }

  const defaultOptions = {
    algorithms: ['RS256'],
  };

  return jwt.verify(token, publicKey, {
    ...defaultOptions,
    ...options,
  });
};

export default { signToken, verifyToken };
