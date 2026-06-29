import { config } from '@hire1percent/shared';

const required = ['NODE_ENV', 'MONGO_URI'];

const defaults = {
  PORT: '5016',
  LOG_LEVEL: 'info',
  AI_PROVIDER: 'local',
  OPENAI_MODEL: 'gpt-4.1-mini',
  AZURE_OPENAI_DEPLOYMENT: 'hire1percent-ai',
  GEMINI_MODEL: 'gemini-1.5-pro',
  ANTHROPIC_MODEL: 'claude-3-5-sonnet-latest',
  LOCAL_LLM_MODEL: 'hire1percent-local',
};

export const environment = config.loadConfig({
  required,
  defaults,
  exitOnFailure: process.env.NODE_ENV !== 'testing',
});

export default environment;
