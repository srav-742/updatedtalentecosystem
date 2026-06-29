/**
 * @fileoverview Refresh Token Data Access Repository
 * @module repositories/RefreshTokenRepository
 */

import RefreshToken from '../models/RefreshToken.js';

class RefreshTokenRepository {
  /**
   * Creates a new refresh token record.
   *
   * @param {Object} tokenData
   * @returns {Promise<RefreshToken>}
   */
  async create(tokenData) {
    const token = new RefreshToken(tokenData);
    return token.save();
  }

  /**
   * Finds a refresh token record by token string.
   *
   * @param {string} token
   * @returns {Promise<RefreshToken|null>}
   */
  async findByToken(token) {
    return RefreshToken.findOne({ token }).populate('userId');
  }

  /**
   * Revokes a refresh token, optionally marking it as rotated (replaced).
   *
   * @param {string} token - Token to revoke.
   * @param {string} [replacedByToken=null] - Token that replaced it.
   * @returns {Promise<RefreshToken|null>}
   */
  async revoke(token, replacedByToken = null) {
    return RefreshToken.findOneAndUpdate(
      { token },
      {
        $set: {
          isRevoked: true,
          replacedByToken,
        },
      },
      { new: true }
    );
  }

  /**
   * Revokes all refresh tokens for a user.
   *
   * @param {string} userId
   * @returns {Promise<Object>} Update query result.
   */
  async revokeAllByUserId(userId) {
    return RefreshToken.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    );
  }

  /**
   * Cleans up expired or revoked refresh tokens.
   *
   * @returns {Promise<Object>} Delete query result.
   */
  async cleanupExpired() {
    return RefreshToken.deleteMany({
      $or: [
        { expiresAt: { $lte: new Date() } },
        { isRevoked: true },
      ],
    });
  }
}

export default new RefreshTokenRepository();
export { RefreshTokenRepository };
