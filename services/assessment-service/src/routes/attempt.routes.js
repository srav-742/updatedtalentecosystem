import express from 'express';
import attemptController from '../controllers/attempt.controller.js';
import trustedContextMiddleware from '../middlewares/trustedContext.js';
import { requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Enforce internal service trust validation and trusted headers parsing
router.use(trustedContextMiddleware);

// Candidate Attempts lifecycle
router.post(
  '/api/v1/assessments/:id/start',
  requirePermission('assessments:submit'),
  attemptController.start
);

router.post(
  '/api/v1/assessments/:id/submit',
  requirePermission('assessments:submit'),
  attemptController.submit
);

router.post(
  '/api/v1/attempts/:id/cheating-event',
  requirePermission('assessments:submit'),
  attemptController.cheatingEvent
);

// Review attempts (can be read by recruiters or the candidate owner)
router.get(
  '/api/v1/attempts/:id',
  attemptController.getAttempt
);

router.get(
  '/api/v1/attempts',
  requirePermission('assessments:read'),
  attemptController.listAttempts
);

// Recruiter Evaluation Override
router.post(
  '/api/v1/attempts/:id/evaluate',
  requirePermission('assessments:evaluate'),
  attemptController.evaluate
);

export default router;
