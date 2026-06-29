import MockSearchProvider from './MockSearchProvider.js';

export class OpenSearchProvider extends MockSearchProvider {
  constructor(options = {}) {
    super(options.seed);
    this.endpoint = options.endpoint;
  }
}

export default OpenSearchProvider;
