import { config } from '@hire1percent/shared';

const required = ['NODE_ENV', 'MONGO_URI'];

const defaults = {
  PORT: '5014',
  LOG_LEVEL: 'info',
};

export const environment = config.loadConfig({
  required,
  defaults,
  exitOnFailure: process.env.NODE_ENV !== 'testing',
});

export default environment;
