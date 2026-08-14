/**
 * @fileoverview Client Data Access Repository
 * @module repositories/ClientRepository
 */

import Client from '../models/Client.js';

class ClientRepository {
  /**
   * Finds a client by its unique ID.
   *
   * @param {string} id - The MongoDB ObjectId.
   * @returns {Promise<Client|null>}
   */
  async findById(id) {
    return Client.findById(id).populate('userId');
  }

  /**
   * Finds a client by its unique client ID.
   *
   * @param {string} clientId
   * @returns {Promise<Client|null>}
   */
  async findByClientId(clientId) {
    return Client.findOne({ clientId }).populate('userId');
  }

  /**
   * Finds all clients associated with a specific user.
   *
   * @param {string} userId - User ObjectId.
   * @returns {Promise<Client[]>}
   */
  async findByUserId(userId) {
    return Client.find({ userId });
  }

  /**
   * Creates a new client credential.
   *
   * @param {Object} clientData
   * @returns {Promise<Client>}
   */
  async create(clientData) {
    const client = new Client(clientData);
    return client.save();
  }

  /**
   * Updates an existing client status or details.
   *
   * @param {string} id - Client ObjectId.
   * @param {Object} updateData
   * @returns {Promise<Client|null>}
   */
  async update(id, updateData) {
    return Client.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }

  /**
   * Deletes a client credential record.
   *
   * @param {string} id - Client ObjectId.
   * @returns {Promise<Client|null>}
   */
  async delete(id) {
    return Client.findByIdAndDelete(id);
  }

  /**
   * Deletes all clients associated with a specific user.
   *
   * @param {string} userId - User ObjectId.
   * @returns {Promise<void>}
   */
  async deleteByUserId(userId) {
    await Client.deleteMany({ userId });
  }
}

export default new ClientRepository();
export { ClientRepository };
