import { LocalStorageProvider } from './LocalStorageProvider.js';
import {
  S3StorageProvider,
  AzureBlobStorageProvider,
  GoogleCloudStorageProvider,
} from './CloudStorageProviders.js';
import environment from '../config/environment.js';

export class StorageFactory {
  static getProvider() {
    const providerType = (environment.STORAGE_PROVIDER || 'local').toLowerCase();

    switch (providerType) {
      case 'local':
        return new LocalStorageProvider({
          uploadDir: environment.STORAGE_UPLOAD_DIR,
        });
      case 's3':
      case 'minio':
        return new S3StorageProvider({
          bucket: environment.S3_BUCKET_NAME,
          region: environment.S3_REGION,
          endpoint: environment.S3_ENDPOINT,
          accessKeyId: environment.S3_ACCESS_KEY,
          secretAccessKey: environment.S3_SECRET_KEY,
        });
      case 'azure':
        return new AzureBlobStorageProvider();
      case 'gcs':
      case 'google':
        return new GoogleCloudStorageProvider();
      default:
        throw new Error(`Unsupported storage provider: ${providerType}`);
    }
  }
}

export const storage = StorageFactory.getProvider();
export default storage;
