/**
 * @fileoverview User Data Access Repository
 * @module repositories/UserRepository
 */

import User from '../models/User.js';

class UserRepository {
  /**
   * Finds a user by their MongoDB ObjectId.
   *
   * @param {string} id - The MongoDB ObjectId.
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    return User.findById(id)
      .populate('tenantId')
      .populate('organizationId')
      .populate({
        path: 'roleRef',
        populate: {
          path: 'permissions',
        },
      });
  }

  /**
   * Finds a user by their email address.
   *
   * @param {string} email - The email address.
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() })
      .populate('tenantId')
      .populate('organizationId')
      .populate('roleRef');
  }

  /**
   * Finds a user by their external Firebase/auth UID.
   *
   * @param {string} uid - The external authentication UID.
   * @returns {Promise<User|null>}
   */
  async findByUid(uid) {
    return User.findOne({ uid })
      .populate('tenantId')
      .populate('organizationId')
      .populate('roleRef');
  }

  /**
   * Resolves user details alongside roles and granular permissions.
   *
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmailWithPermissions(email) {
    return User.findOne({ email: email.toLowerCase() })
      .populate('tenantId')
      .populate('organizationId')
      .populate({
        path: 'roleRef',
        populate: {
          path: 'permissions',
        },
      });
  }

  /**
   * Creates a new user record in the database.
   *
   * @param {Object} userData - User record fields.
   * @returns {Promise<User>}
   */
  async create(userData) {
    const user = new User({
      ...userData,
      email: userData.email.toLowerCase(),
    });
    return user.save();
  }

  /**
   * Updates an existing user record.
   *
   * @param {string} id - User ObjectId.
   * @param {Object} updateData - Fields to update.
   * @returns {Promise<User|null>}
   */
  async update(id, updateData) {
    return User.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
  }

  /**
   * Deletes a user record.
   *
   * @param {string} id - User ObjectId.
   * @returns {Promise<User|null>}
   */
  async delete(id) {
    return User.findByIdAndDelete(id);
  }
}

export default new UserRepository();
export { UserRepository };
