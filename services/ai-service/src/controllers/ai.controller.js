import { response } from '@hire1percent/shared';
import aiService from '../services/ai.service.js';

const wrap = (handler) => async (req, res, next) => {
  try {
    response.sendSuccess(res, { data: await handler(req.body) });
  } catch (error) {
    next(error);
  }
};

export const parseResume = wrap((body) => aiService.parseResume(body));
export const matchJob = wrap((body) => aiService.matchJob(body));
export const matchCandidate = wrap((body) => aiService.matchCandidate(body));
export const recommendations = wrap((body) => aiService.recommendations(body));
export const scoreResume = wrap((body) => aiService.scoreResume(body));
export const extractSkills = wrap((body) => aiService.extractSkills(body));
export const interviewAnalysis = wrap((body) => aiService.interviewAnalysis(body));
export const semanticSearch = wrap((body) => aiService.semanticSearch(body));
