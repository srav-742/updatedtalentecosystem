import fs from 'node:fs/promises';
import path from 'node:path';
import { StorageProvider } from './StorageProvider.js';

export class LocalStorageProvider extends StorageProvider {
  /**
   * @param {Object} config
   * @param {string} config.uploadDir - Base upload directory path
   */
  constructor(config = {}) {
    super();
    this.uploadDir = path.resolve(config.uploadDir || 'storage/uploads');
  }

  /**
   * Ensures the upload directory exists before saving files.
   * @private
   */
  async ensureDir() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async saveFile(fileBuffer, key, mimeType) {
    await this.ensureDir();
    const filePath = path.join(this.uploadDir, key);
    
    // Ensure parent folders for nested keys exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, fileBuffer);

    return {
      key,
      provider: 'local',
      path: filePath,
    };
  }

  async getFile(key) {
    const filePath = path.join(this.uploadDir, key);
    return fs.readFile(filePath);
  }

  async deleteFile(key) {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  async getDownloadUrl(key) {
    // Return relative download link handled by Resume Service download route
    return `/api/v1/resumes/download-local/${key}`;
  }
}

export default LocalStorageProvider;
