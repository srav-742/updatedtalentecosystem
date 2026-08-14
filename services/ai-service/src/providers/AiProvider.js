export class AiProvider {
  constructor(name) {
    this.name = name;
  }

  async complete() {
    throw new Error('complete must be implemented by provider');
  }

  async embed() {
    throw new Error('embed must be implemented by provider');
  }
}

export default AiProvider;
