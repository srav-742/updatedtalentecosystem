import LocalLLMProvider from './LocalLLMProvider.js';

export class AzureOpenAIProvider extends LocalLLMProvider {
  constructor(model) {
    super(model);
    this.name = 'azure_openai';
  }
}

export default AzureOpenAIProvider;
