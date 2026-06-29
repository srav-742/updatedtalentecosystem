/**
 * @fileoverview Cryptographic Helpers Service
 * @module security/crypto.service
 */

import crypto from 'node:crypto';

/**
 * Generates a secure random hex token.
 *
 * @param {number} [bytesLength=32] - Number of bytes to generate.
 * @returns {string} Hexadecimal token string.
 */
export const generateRandomToken = (bytesLength = 32) => {
  return crypto.randomBytes(bytesLength).toString('hex');
};

/**
 * Computes a hash of a string using a selected algorithm.
 *
 * @param {string} data - Input data.
 * @param {string} [algorithm='sha256'] - Hashing algorithm.
 * @returns {string} Hexadecimal digest.
 */
export const hashString = (data, algorithm = 'sha256') => {
  return crypto.createHash(algorithm).update(data).digest('hex');
};

export default {
  generateRandomToken,
  hashString,
};
