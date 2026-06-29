import { config } from '@hire1percent/shared';

const required = ['NODE_ENV', 'MONGO_URI'];

const defaults = {
  PORT: '5013',
  LOG_LEVEL: 'info',
  SEARCH_PROVIDER: 'mock',
  OPENSEARCH_URL: 'http://localhost:9200',
  ELASTICSEARCH_URL: 'http://localhost:9200',
};

export const environment = config.loadConfig({
  required,
  defaults,
  exitOnFailure: process.env.NODE_ENV !== 'testing',
});

export default environment;
