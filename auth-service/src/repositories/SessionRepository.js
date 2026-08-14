/**
 * @fileoverview Session Data Access Repository
 * @module repositories/SessionRepository
 */

import Session from '../models/Session.js';

class SessionRepository {
  /**
   * Creates a new session.
   *
   * @param {Object} sessionData
   * @returns {Promise<Session>}
   */
  async create(sessionData) {
    const session = new Session(sessionData);
    return session.save();
  }

  /**
   * Finds a session by its unique opaque token.
   * Only returns if session is active and not expired.
   *
   * @param {string} token
   * @returns {Promise<Session|null>}
   */
  async findByToken(token) {
    return Session.findOne({
      token,
      isActive: true,
      expiresAt: { $gt: new Date() },
    }).populate({
      path: 'userId',
      populate: [
        { path: 'tenantId' },
        { path: 'organizationId' },
        { path: 'roleRef', populate: { path: 'permissions' } },
      ],
    });
  }

  /**
   * Finds all active sessions associated with a specific user.
   *
   * @param {string} userId
   * @returns {Promise<Session[]>}
   */
  async findByUserId(userId) {
    return Session.find({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });
  }

  /**
   * Deactivates/revokes a session by its token.
   *
   * @param {string} token
   * @returns {Promise<Session|null>}
   */
  async revokeByToken(token) {
    return Session.findOneAndUpdate(
      { token },
      { $set: { isActive: false } },
      { new: true }
    );
  }

  /**
   * Revokes all active sessions for a user (e.g. forced logout/password reset).
   *
   * @param {string} userId
   * @returns {Promise<Object>} Update query result.
   */
  async revokeAllByUserId(userId) {
    return Session.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false } }
    );
  }

  /**
   * Finds a session by ID.
   *
   * @param {string} id
   * @returns {Promise<Session|null>}
   */
  async findById(id) {
    return Session.findById(id).populate({
      path: 'userId',
      populate: [
        { path: 'tenantId' },
        { path: 'organizationId' },
        { path: 'roleRef', populate: { path: 'permissions' } },
      ],
    });
  }

  /**
   * Finds a session using a query.
   *
   * @param {Object} query
   * @returns {Promise<Session|null>}
   */
  async findOne(query) {
    return Session.findOne(query);
  }

  /**
   * Updates last activity timestamp of a session.
   *
   * @param {string} id
   * @returns {Promise<Session|null>}
   */
  async updateLastActivity(id) {
    return Session.findByIdAndUpdate(
      id,
      { $set: { lastActivity: new Date() } },
      { new: true }
    );
  }

  /**
   * Cleans up (deletes or deactivates) expired sessions from database.
   *
   * @returns {Promise<Object>} Delete query result.
   */
  async cleanupExpired() {
    return Session.deleteMany({
      $or: [
        { expiresAt: { $lte: new Date() } },
        { isActive: false },
        { revoked: true },
      ],
    });
  }
}

export default new SessionRepository();
export { SessionRepository };
