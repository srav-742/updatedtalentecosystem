/**
 * @fileoverview Role Data Access Repository
 * @module repositories/RoleRepository
 */

import Role from '../models/Role.js';

class RoleRepository {
  /**
   * Finds a role by its ObjectId.
   *
   * @param {string} id
   * @returns {Promise<Role|null>}
   */
  async findById(id) {
    return Role.findById(id).populate('permissions');
  }

  /**
   * Finds a role by its unique semantic name.
   *
   * @param {string} name
   * @returns {Promise<Role|null>}
   */
  async findByName(name) {
    return Role.findOne({ name: name.toLowerCase() }).populate('permissions');
  }

  /**
   * Creates a new role.
   *
   * @param {Object} roleData
   * @returns {Promise<Role>}
   */
  async create(roleData) {
    const role = new Role({
      ...roleData,
      name: roleData.name.toLowerCase(),
    });
    return role.save();
  }

  /**
   * Updates an existing role's details.
   *
   * @param {string} id
   * @param {Object} updateData
   * @returns {Promise<Role|null>}
   */
  async update(id, updateData) {
    if (updateData.name) {
      updateData.name = updateData.name.toLowerCase();
    }
    return Role.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  /**
   * Deletes a role.
   *
   * @param {string} id
   * @returns {Promise<Role|null>}
   */
  async delete(id) {
    return Role.findByIdAndDelete(id);
  }

  /**
   * Links a permission to a role.
   *
   * @param {string} roleId
   * @param {string} permissionId
   * @returns {Promise<Role|null>}
   */
  async addPermission(roleId, permissionId) {
    return Role.findByIdAndUpdate(
      roleId,
      { $addToSet: { permissions: permissionId } },
      { new: true }
    ).populate('permissions');
  }

  /**
   * Unlinks a permission from a role.
   *
   * @param {string} roleId
   * @param {string} permissionId
   * @returns {Promise<Role|null>}
   */
  async removePermission(roleId, permissionId) {
    return Role.findByIdAndUpdate(
      roleId,
      { $pull: { permissions: permissionId } },
      { new: true }
    ).populate('permissions');
  }
}

export default new RoleRepository();
export { RoleRepository };
