export class SearchProvider {
  async search() {
    throw new Error('search must be implemented by provider');
  }

  async index() {
    throw new Error('index must be implemented by provider');
  }

  async remove() {
    throw new Error('remove must be implemented by provider');
  }

  async autocomplete() {
    throw new Error('autocomplete must be implemented by provider');
  }
}

export default SearchProvider;
