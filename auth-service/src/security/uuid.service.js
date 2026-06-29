/**
 * @fileoverview Opaque UUID Generator Service
 * @module security/uuid.service
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates an opaque access token string.
 * Uses standard cryptographically secure random UUID v4.
 *
 * @returns {string} UUID string.
 */
export const generateAccessToken = () => {
  return uuidv4();
};

/**
 * Generates an opaque refresh token string.
 * Uses standard cryptographically secure random UUID v4.
 *
 * @returns {string} UUID string.
 */
export const generateRefreshToken = () => {
  return uuidv4();
};

export default {
  generateAccessToken,
  generateRefreshToken,
};
