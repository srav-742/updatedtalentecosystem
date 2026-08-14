import MockSearchProvider from './MockSearchProvider.js';

export class ElasticProvider extends MockSearchProvider {
  constructor(options = {}) {
    super(options.seed);
    this.endpoint = options.endpoint;
  }
}

export default ElasticProvider;
