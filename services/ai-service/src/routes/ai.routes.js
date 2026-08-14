import { Router } from 'express';
import {
  extractSkills,
  interviewAnalysis,
  matchCandidate,
  matchJob,
  parseResume,
  recommendations,
  scoreResume,
  semanticSearch,
} from '../controllers/ai.controller.js';

const router = Router();

router.post('/parse-resume', parseResume);
router.post('/match-job', matchJob);
router.post('/match-candidate', matchCandidate);
router.post('/recommendations', recommendations);
router.post('/score-resume', scoreResume);
router.post('/extract-skills', extractSkills);
router.post('/interview-analysis', interviewAnalysis);
router.post('/semantic-search', semanticSearch);

export default router;
