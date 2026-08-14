/**
 * @fileoverview Audit Log Data Access Repository
 * @module repositories/AuditRepository
 */

import AuditLog from '../models/AuditLog.js';

class AuditRepository {
  /**
   * Records a new audit log entry.
   *
   * @param {Object} auditLogData
   * @returns {Promise<AuditLog>}
   */
  async create(auditLogData) {
    const log = new AuditLog(auditLogData);
    return log.save();
  }

  /**
   * Retrieves filtered audit logs.
   *
   * @param {Object} [filters={}] - Filter conditions (e.g. userId, action, status).
   * @param {Object} [options={}] - Query options (e.g. limit, skip).
   * @returns {Promise<AuditLog[]>}
   */
  async findFiltered(filters = {}, options = {}) {
    const { limit = 50, skip = 0 } = options;
    return AuditLog.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'email name role');
  }
}

export default new AuditRepository();
export { AuditRepository };
