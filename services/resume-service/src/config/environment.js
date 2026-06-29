import { config } from '@hire1percent/shared';

const required = ['NODE_ENV', 'MONGO_URI'];

const defaults = {
  PORT: '5008',
  LOG_LEVEL: 'info',
  STORAGE_PROVIDER: 'local',
  STORAGE_UPLOAD_DIR: 'storage/uploads',
  S3_BUCKET_NAME: 'hire1percent-resumes',
  S3_REGION: 'us-east-1',
  S3_ENDPOINT: '',
  S3_ACCESS_KEY: '',
  S3_SECRET_KEY: '',
};

export const environment = config.loadConfig({
  required,
  defaults,
  exitOnFailure: process.env.NODE_ENV !== 'testing',
});

export default environment;
