import express from 'express';
import assessmentController from '../controllers/assessment.controller.js';
import trustedContextMiddleware from '../middlewares/trustedContext.js';
import { requirePermission } from '../middlewares/auth.js';
import {
  validateCreateAssessment,
  validateCreateQuestion,
  validateCreateQuestionBank,
} from '../validators/assessment.validator.js';

const router = express.Router();

// Enforce internal service trust validation and trusted headers parsing
router.use(trustedContextMiddleware);

// Assessments CRUD
router.post(
  '/api/v1/assessments',
  requirePermission('assessments:write'),
  validateCreateAssessment,
  assessmentController.create
);

router.get(
  '/api/v1/assessments',
  requirePermission('assessments:read'),
  assessmentController.list
);

router.get(
  '/api/v1/assessments/:id',
  // Can be read by recruiters or candidates starting attempts
  assessmentController.get
);

router.put(
  '/api/v1/assessments/:id',
  requirePermission('assessments:write'),
  validateCreateAssessment,
  assessmentController.update
);

router.delete(
  '/api/v1/assessments/:id',
  requirePermission('assessments:delete'),
  assessmentController.delete
);

router.post(
  '/api/v1/assessments/:id/publish',
  requirePermission('assessments:write'),
  assessmentController.publish
);

router.post(
  '/api/v1/assessments/:id/archive',
  requirePermission('assessments:write'),
  assessmentController.archive
);

// Question Management
router.post(
  '/api/v1/assessments/questions',
  requirePermission('assessments:write'),
  validateCreateQuestion,
  assessmentController.createQuestion
);

router.get(
  '/api/v1/assessments/questions/:id',
  requirePermission('assessments:read'),
  assessmentController.getQuestion
);

router.get(
  '/api/v1/assessments/questions',
  requirePermission('assessments:read'),
  assessmentController.listQuestions
);

// Question Bank Management
router.post(
  '/api/v1/assessments/question-banks',
  requirePermission('assessments:write'),
  validateCreateQuestionBank,
  assessmentController.createQuestionBank
);

router.get(
  '/api/v1/assessments/question-banks',
  requirePermission('assessments:read'),
  assessmentController.listQuestionBanks
);

export default router;
