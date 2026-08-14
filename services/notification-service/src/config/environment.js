import { config } from '@hire1percent/shared';

const required = ['NODE_ENV', 'MONGO_URI'];

const defaults = {
  PORT: '5009',
  LOG_LEVEL: 'info',
  SERVICE_TOKEN: 'trusted-gateway-token',

  // Email Configs
  SMTP_HOST: 'localhost',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: 'no-reply@hire1percent.com',

  SENDGRID_API_KEY: '',
  SENDGRID_FROM: 'no-reply@hire1percent.com',

  SES_REGION: 'us-east-1',
  SES_ACCESS_KEY: '',
  SES_SECRET_KEY: '',
  SES_FROM: 'no-reply@hire1percent.com',

  MAILGUN_API_KEY: '',
  MAILGUN_DOMAIN: '',
  MAILGUN_FROM: 'no-reply@hire1percent.com',

  // SMS Configs
  TWILIO_ACCOUNT_SID: '',
  TWILIO_AUTH_TOKEN: '',
  TWILIO_FROM_NUMBER: '',

  MESSAGEBIRD_API_KEY: '',
  MESSAGEBIRD_FROM: 'Hire1Percent',

  VONAGE_API_KEY: '',
  VONAGE_API_SECRET: '',
  VONAGE_FROM: 'Hire1Percent',

  // Push Configs
  FIREBASE_PROJECT_ID: '',
  FIREBASE_CLIENT_EMAIL: '',
  FIREBASE_PRIVATE_KEY: '',

  ONESIGNAL_APP_ID: '',
  ONESIGNAL_API_KEY: '',

  // Worker & Queue Settings
  QUEUE_POLL_INTERVAL_MS: '5000',
  QUEUE_MAX_ATTEMPTS: '3',
};

export const environment = config.loadConfig({
  required,
  defaults,
  exitOnFailure: process.env.NODE_ENV !== 'testing',
});

export default environment;
