/**
 * @fileoverview Password Hashing Service
 * @module security/password.service
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param {string} password - The plaintext password.
 * @returns {Promise<string>} The hashed password.
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compares a plaintext password with a bcrypt hash.
 *
 * @param {string} password - The plaintext password.
 * @param {string} hash - The bcrypt hash.
 * @returns {Promise<boolean>} True if match.
 */
export const comparePassword = async (password, hash) => {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
};

export default { hashPassword, comparePassword };
