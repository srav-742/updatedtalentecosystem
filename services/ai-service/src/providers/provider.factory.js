import environment from '../config/environment.js';
import LocalLLMProvider from './LocalLLMProvider.js';
import OpenAIProvider from './OpenAIProvider.js';
import AzureOpenAIProvider from './AzureOpenAIProvider.js';
import GeminiProvider from './GeminiProvider.js';
import AnthropicProvider from './AnthropicProvider.js';

export const createAiProvider = (provider = environment.AI_PROVIDER) => {
  if (provider === 'openai') return new OpenAIProvider(environment.OPENAI_MODEL);
  if (provider === 'azure_openai') return new AzureOpenAIProvider(environment.AZURE_OPENAI_DEPLOYMENT);
  if (provider === 'gemini') return new GeminiProvider(environment.GEMINI_MODEL);
  if (provider === 'anthropic') return new AnthropicProvider(environment.ANTHROPIC_MODEL);
  return new LocalLLMProvider(environment.LOCAL_LLM_MODEL);
};

export default createAiProvider;
