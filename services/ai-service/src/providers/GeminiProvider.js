import LocalLLMProvider from './LocalLLMProvider.js';

export class GeminiProvider extends LocalLLMProvider {
  constructor(model) {
    super(model);
    this.name = 'gemini';
  }
}

export default GeminiProvider;
