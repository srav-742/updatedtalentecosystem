import LocalLLMProvider from './LocalLLMProvider.js';

export class OpenAIProvider extends LocalLLMProvider {
  constructor(model) {
    super(model);
    this.name = 'openai';
  }
}

export default OpenAIProvider;
