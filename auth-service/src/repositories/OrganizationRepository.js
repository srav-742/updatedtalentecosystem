/**
 * @fileoverview Organization Data Access Repository
 * @module repositories/OrganizationRepository
 *
 * Encapsulates all direct Mongoose interactions for the Organization model.
 * Controllers and services must never query Organization directly.
 */

import Organization from '../models/Organization.js';

class OrganizationRepository {
  /**
   * Finds an organization by its MongoDB ObjectId.
   *
   * @param {string} id - The MongoDB ObjectId.
   * @returns {Promise<Organization|null>}
   */
  async findById(id) {
    return Organization.findById(id).populate('tenantId');
  }

  /**
   * Finds an organization by its unique code.
   *
   * @param {string} code - The organization code (lowercased).
   * @returns {Promise<Organization|null>}
   */
  async findByCode(code) {
    return Organization.findOne({ code: code.toLowerCase() }).populate('tenantId');
  }

  /**
   * Finds all organizations belonging to a specific tenant.
   *
   * @param {string} tenantId - The tenant's ObjectId.
   * @returns {Promise<Organization[]>}
   */
  async findByTenantId(tenantId) {
    return Organization.find({ tenantId }).populate('tenantId');
  }

  /**
   * Finds all active organizations.
   *
   * @returns {Promise<Organization[]>}
   */
  async findAllActive() {
    return Organization.find({ isActive: true }).populate('tenantId');
  }

  /**
   * Creates a new organization record.
   *
   * @param {Object} orgData - Organization record fields.
   * @returns {Promise<Organization>}
   */
  async create(orgData) {
    const organization = new Organization({
      ...orgData,
      code: orgData.code.toLowerCase(),
    });
    return organization.save();
  }

  /**
   * Updates an existing organization record.
   *
   * @param {string} id - Organization ObjectId.
   * @param {Object} updateData - Fields to update.
   * @returns {Promise<Organization|null>}
   */
  async update(id, updateData) {
    if (updateData.code) {
      updateData.code = updateData.code.toLowerCase();
    }
    return Organization.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('tenantId');
  }

  /**
   * Soft-deactivates an organization by setting isActive to false.
   *
   * @param {string} id - Organization ObjectId.
   * @returns {Promise<Organization|null>}
   */
  async deactivate(id) {
    return Organization.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );
  }

  /**
   * Hard-deletes an organization record.
   *
   * @param {string} id - Organization ObjectId.
   * @returns {Promise<Organization|null>}
   */
  async delete(id) {
    return Organization.findByIdAndDelete(id);
  }
}

export default new OrganizationRepository();
export { OrganizationRepository };
