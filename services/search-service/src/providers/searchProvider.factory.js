import environment from '../config/environment.js';
import MockSearchProvider from './MockSearchProvider.js';
import OpenSearchProvider from './OpenSearchProvider.js';
import ElasticProvider from './ElasticProvider.js';

export const createSearchProvider = (provider = environment.SEARCH_PROVIDER) => {
  if (provider === 'opensearch') {
    return new OpenSearchProvider({ endpoint: environment.OPENSEARCH_URL });
  }
  if (provider === 'elastic') {
    return new ElasticProvider({ endpoint: environment.ELASTICSEARCH_URL });
  }
  return new MockSearchProvider();
};

export default createSearchProvider;
