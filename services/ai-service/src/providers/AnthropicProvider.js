import LocalLLMProvider from './LocalLLMProvider.js';

export class AnthropicProvider extends LocalLLMProvider {
  constructor(model) {
    super(model);
    this.name = 'anthropic';
  }
}

export default AnthropicProvider;
