/**
 * @fileoverview Permission Data Access Repository
 * @module repositories/PermissionRepository
 */

import Permission from '../models/Permission.js';

class PermissionRepository {
  /**
   * Finds a permission by its ObjectId.
   *
   * @param {string} id
   * @returns {Promise<Permission|null>}
   */
  async findById(id) {
    return Permission.findById(id);
  }

  /**
   * Finds a permission by its unique uppercase name.
   *
   * @param {string} name
   * @returns {Promise<Permission|null>}
   */
  async findByName(name) {
    return Permission.findOne({ name: name.toUpperCase() });
  }

  /**
   * Finds all permissions belonging to a specific module.
   *
   * @param {string} moduleName
   * @returns {Promise<Permission[]>}
   */
  async findByModule(moduleName) {
    return Permission.find({ module: moduleName.toLowerCase() });
  }

  /**
   * Creates a new permission.
   *
   * @param {Object} permissionData
   * @returns {Promise<Permission>}
   */
  async create(permissionData) {
    const permission = new Permission({
      ...permissionData,
      name: permissionData.name.toUpperCase(),
      module: permissionData.module.toLowerCase(),
    });
    return permission.save();
  }

  /**
   * Performs a batch insertion of multiple permissions (useful for seeding).
   *
   * @param {Object[]} permissionsList
   * @returns {Promise<Permission[]>}
   */
  async createMany(permissionsList) {
    const formatted = permissionsList.map((p) => ({
      ...p,
      name: p.name.toUpperCase(),
      module: p.module.toLowerCase(),
    }));
    return Permission.insertMany(formatted, { ordered: false }).catch((err) => {
      // In case of duplicates, return whatever was successfully inserted
      if (err.writeErrors) {
        return Permission.find({ name: { $in: formatted.map((p) => p.name) } });
      }
      throw err;
    });
  }

  /**
   * Deletes a permission.
   *
   * @param {string} id
   * @returns {Promise<Permission|null>}
   */
  async delete(id) {
    return Permission.findByIdAndDelete(id);
  }
}

export default new PermissionRepository();
export { PermissionRepository };
