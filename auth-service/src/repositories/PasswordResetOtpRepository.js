/**
 * @fileoverview Password Reset OTP Data Access Repository
 * @module repositories/PasswordResetOtpRepository
 */

import PasswordResetOtp from '../models/PasswordResetOtp.js';

class PasswordResetOtpRepository {
  /**
   * Finds all OTP records for an email address.
   *
   * @param {string} email
   * @returns {Promise<PasswordResetOtp[]>}
   */
  async findByEmail(email) {
    return PasswordResetOtp.find({ email: email.toLowerCase() });
  }

  /**
   * Finds active, unexpired, and unverified OTP records for an email address.
   *
   * @param {string} email
   * @returns {Promise<PasswordResetOtp[]>}
   */
  async findActiveUnverified(email) {
    return PasswordResetOtp.find({
      email: email.toLowerCase(),
      expiresAt: { $gt: new Date() },
      verified: false,
    }).sort({ createdAt: -1 });
  }

  /**
   * Finds a verified OTP record that was recently updated (within active window).
   *
   * @param {string} email
   * @param {number} windowMs - Time window in milliseconds.
   * @returns {Promise<PasswordResetOtp|null>}
   */
  async findRecentlyVerified(email, windowMs = 15 * 60 * 1000) {
    const since = new Date(Date.now() - windowMs);
    return PasswordResetOtp.findOne({
      email: email.toLowerCase(),
      verified: true,
      updatedAt: { $gt: since },
    });
  }

  /**
   * Creates a new OTP record.
   *
   * @param {Object} otpData
   * @returns {Promise<PasswordResetOtp>}
   */
  async create(otpData) {
    const record = new PasswordResetOtp({
      ...otpData,
      email: otpData.email.toLowerCase(),
    });
    return record.save();
  }

  /**
   * Deletes all OTP records for an email address.
   *
   * @param {string} email
   * @returns {Promise<void>}
   */
  async deleteManyByEmail(email) {
    await PasswordResetOtp.deleteMany({ email: email.toLowerCase() });
  }
}

export default new PasswordResetOtpRepository();
export { PasswordResetOtpRepository };
