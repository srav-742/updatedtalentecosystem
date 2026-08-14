import { StorageProvider } from './StorageProvider.js';
import { logger } from '@hire1percent/shared';

const log = logger.createLogger('cloud-storage-providers');

/**
 * Amazon S3 / MinIO Storage Provider Stub
 */
export class S3StorageProvider extends StorageProvider {
  constructor(config = {}) {
    super();
    this.bucket = config.bucket;
    this.region = config.region;
    this.endpoint = config.endpoint;
    log.info(`S3StorageProvider initialized (Bucket: ${this.bucket}, Endpoint: ${this.endpoint || 'AWS S3 Default'})`);
  }

  async saveFile(fileBuffer, key, mimeType) {
    log.warn(`[Stub] saveFile called for key: ${key} on S3 bucket ${this.bucket}. Mocking upload.`);
    return {
      key,
      provider: 's3',
      url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
    };
  }

  async getFile(key) {
    throw new Error('S3StorageProvider.getFile is not implemented (Stub)');
  }

  async deleteFile(key) {
    log.warn(`[Stub] deleteFile called for key: ${key} on S3 bucket ${this.bucket}.`);
    return true;
  }

  async getDownloadUrl(key) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}?temp_token=mock`;
  }
}

/**
 * Azure Blob Storage Provider Stub
 */
export class AzureBlobStorageProvider extends StorageProvider {
  constructor(config = {}) {
    super();
    log.info('AzureBlobStorageProvider initialized');
  }

  async saveFile(fileBuffer, key, mimeType) {
    log.warn(`[Stub] saveFile called for key: ${key} on Azure Blob. Mocking upload.`);
    return {
      key,
      provider: 'azure',
      url: `https://mockaccount.blob.core.windows.net/resumes/${key}`,
    };
  }

  async getFile(key) {
    throw new Error('AzureBlobStorageProvider.getFile is not implemented (Stub)');
  }

  async deleteFile(key) {
    log.warn(`[Stub] deleteFile called for key: ${key} on Azure Blob.`);
    return true;
  }

  async getDownloadUrl(key) {
    return `https://mockaccount.blob.core.windows.net/resumes/${key}?temp_token=mock`;
  }
}

/**
 * Google Cloud Storage Provider Stub
 */
export class GoogleCloudStorageProvider extends StorageProvider {
  constructor(config = {}) {
    super();
    log.info('GoogleCloudStorageProvider initialized');
  }

  async saveFile(fileBuffer, key, mimeType) {
    log.warn(`[Stub] saveFile called for key: ${key} on Google Cloud Storage. Mocking upload.`);
    return {
      key,
      provider: 'gcs',
      url: `https://storage.googleapis.com/mock-bucket/${key}`,
    };
  }

  async getFile(key) {
    throw new Error('GoogleCloudStorageProvider.getFile is not implemented (Stub)');
  }

  async deleteFile(key) {
    log.warn(`[Stub] deleteFile called for key: ${key} on GCS.`);
    return true;
  }

  async getDownloadUrl(key) {
    return `https://storage.googleapis.com/mock-bucket/${key}?temp_token=mock`;
  }
}
