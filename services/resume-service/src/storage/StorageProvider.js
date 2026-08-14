/**
 * @fileoverview StorageProvider Base Class
 * Defines the contract interface for file operations in the Resume Service.
 */
export class StorageProvider {
  /**
   * Saves a file buffer to the storage target.
   * @param {Buffer} fileBuffer - Content of the file.
   * @param {string} key - Unique path/identifier for the file.
   * @param {string} mimeType - The file's MIME type.
   * @returns {Promise<{ key: string, provider: string, path?: string, url?: string }>}
   */
  async saveFile(fileBuffer, key, mimeType) {
    throw new Error('StorageProvider.saveFile is not implemented');
  }

  /**
   * Retrieves a file buffer from storage.
   * @param {string} key - Unique identifier.
   * @returns {Promise<Buffer>}
   */
  async getFile(key) {
    throw new Error('StorageProvider.getFile is not implemented');
  }

  /**
   * Deletes a file from storage.
   * @param {string} key - Unique identifier.
   * @returns {Promise<boolean>}
   */
  async deleteFile(key) {
    throw new Error('StorageProvider.deleteFile is not implemented');
  }

  /**
   * Generates a URI or temporary URL for downloading/previewing.
   * @param {string} key - Unique identifier.
   * @returns {Promise<string>}
   */
  async getDownloadUrl(key) {
    throw new Error('StorageProvider.getDownloadUrl is not implemented');
  }
}

export default StorageProvider;
