import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import LocalLLMProvider from '../src/providers/LocalLLMProvider.js';
import { createAiProvider } from '../src/providers/provider.factory.js';

test('AI provider factory creates swappable providers', () => {
  assert.equal(createAiProvider('openai').name, 'openai');
  assert.equal(createAiProvider('azure_openai').name, 'azure_openai');
  assert.equal(createAiProvider('gemini').name, 'gemini');
  assert.equal(createAiProvider('anthropic').name, 'anthropic');
  assert.equal(createAiProvider('local').name, 'local');
});

test('LocalLLMProvider creates deterministic embeddings and extracts skills', async () => {
  const provider = new LocalLLMProvider();
  const vector = await provider.embed('Node React Kubernetes');
  assert.equal(vector.length, 12);
  assert.deepEqual(provider.extractSkills('Node and React on Kubernetes'), ['node', 'react', 'kubernetes']);
});
