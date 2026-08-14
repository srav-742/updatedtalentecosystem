import AiProvider from './AiProvider.js';

const skillBank = [
  'javascript',
  'node',
  'react',
  'mongodb',
  'postgres',
  'aws',
  'kubernetes',
  'elasticsearch',
  'opensearch',
  'python',
  'machine learning',
  'leadership',
];

export class LocalLLMProvider extends AiProvider {
  constructor(model = 'hire1percent-local') {
    super('local');
    this.model = model;
  }

  async complete({ task, text = '', payload = {} }) {
    return {
      provider: this.name,
      model: this.model,
      task,
      text,
      payload,
    };
  }

  async embed(text = '') {
    const buckets = Array.from({ length: 12 }, () => 0);
    [...text.toLowerCase()].forEach((char, index) => {
      buckets[index % buckets.length] += char.charCodeAt(0) / 1000;
    });
    const magnitude = Math.sqrt(buckets.reduce((sum, value) => sum + value ** 2, 0)) || 1;
    return buckets.map((value) => Number((value / magnitude).toFixed(6)));
  }

  extractSkills(text = '') {
    const lower = text.toLowerCase();
    return skillBank.filter((skill) => lower.includes(skill));
  }
}

export default LocalLLMProvider;
