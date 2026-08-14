import { errors } from '@hire1percent/shared';
import createAiProvider from '../providers/provider.factory.js';
import { cosineSimilarity, overlapScore } from './scoring.js';

const experiencePattern = /(\d+)\+?\s*(?:years|yrs)/i;

export class AiService {
  constructor(provider = createAiProvider()) {
    this.provider = provider;
    this.logs = [];
  }

  async parseResume({ text = '', resumeText = '' } = {}) {
    const source = text || resumeText;
    this.requireText(source, 'resume text');
    const skills = this.extractSkills({ text: source }).skills;
    const experience = this.extractExperience({ text: source });
    return this.log('parse_resume', {
      summary: source.slice(0, 240),
      skills,
      experience,
      provider: this.provider.name,
    });
  }

  async scoreResume({ resumeText = '', jobDescription = '' } = {}) {
    this.requireText(resumeText, 'resumeText');
    this.requireText(jobDescription, 'jobDescription');
    const score = overlapScore(resumeText, jobDescription);
    return this.log('score_resume', {
      score,
      verdict: score >= 70 ? 'strong_match' : score >= 40 ? 'partial_match' : 'low_match',
      provider: this.provider.name,
    });
  }

  async matchJob({ candidate = {}, job = {} } = {}) {
    const candidateText = this.profileText(candidate);
    const jobText = this.profileText(job);
    this.requireText(candidateText, 'candidate');
    this.requireText(jobText, 'job');
    return this.log('match_job', {
      jobId: job.id,
      candidateId: candidate.id,
      score: overlapScore(candidateText, jobText),
      provider: this.provider.name,
    });
  }

  async matchCandidate(payload = {}) {
    return this.matchJob(payload);
  }

  extractSkills({ text = '' } = {}) {
    this.requireText(text, 'text');
    const skills = this.provider.extractSkills ? this.provider.extractSkills(text) : [];
    return { skills, provider: this.provider.name };
  }

  extractExperience({ text = '' } = {}) {
    this.requireText(text, 'text');
    const match = text.match(experiencePattern);
    return {
      years: match ? Number(match[1]) : 0,
      seniority: match && Number(match[1]) >= 7 ? 'senior' : match && Number(match[1]) >= 3 ? 'mid' : 'junior',
    };
  }

  async recommendations({ candidate = {}, jobs = [] } = {}) {
    const ranked = await Promise.all(jobs.map(async (job) => this.matchJob({ candidate, job })));
    return ranked.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  async semanticSearch({ query = '', documents = [] } = {}) {
    this.requireText(query, 'query');
    const queryVector = await this.provider.embed(query);
    const ranked = await Promise.all(documents.map(async (document) => {
      const vector = await this.provider.embed(this.profileText(document));
      return {
        id: document.id,
        score: cosineSimilarity(queryVector, vector),
        document,
      };
    }));
    return ranked.sort((a, b) => b.score - a.score);
  }

  async interviewAnalysis({ transcript = '' } = {}) {
    this.requireText(transcript, 'transcript');
    const lower = transcript.toLowerCase();
    return this.log('interview_analysis', {
      communicationScore: lower.includes('because') || lower.includes('therefore') ? 82 : 68,
      technicalSignals: this.extractSkills({ text: transcript }).skills,
      riskFlags: lower.includes('no experience') ? ['experience_gap'] : [],
      provider: this.provider.name,
    });
  }

  profileText(record = {}) {
    return [
      record.title,
      record.name,
      record.summary,
      record.description,
      record.resumeText,
      record.jobDescription,
      ...(Array.isArray(record.skills) ? record.skills : []),
    ].filter(Boolean).join(' ');
  }

  requireText(text, label) {
    if (!text || !String(text).trim()) {
      throw errors.ApiError.badRequest(`${label} is required.`);
    }
  }

  log(operation, result) {
    this.logs.push({
      operation,
      provider: this.provider.name,
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    });
    return result;
  }
}

export const aiService = new AiService();
export default aiService;
