const express = require('express');
const router = express.Router();
const codingAssessmentController = require('../controllers/codingAssessmentController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

// ─── Coding Round ────────────────────────────────────────
router.post('/round', authMiddleware, roleCheck('recruiter'), codingAssessmentController.createOrUpdateCodingRound);
router.get('/round/:jobId', authMiddleware, codingAssessmentController.getCodingRoundByJobId);
router.delete('/round/:jobId', authMiddleware, roleCheck('recruiter'), codingAssessmentController.deleteCodingRound);

// ─── Coding Questions ────────────────────────────────────
router.post('/questions', authMiddleware, roleCheck('recruiter'), codingAssessmentController.addCodingQuestion);
router.put('/questions/:questionId', authMiddleware, roleCheck('recruiter'), codingAssessmentController.updateCodingQuestion);
router.delete('/questions/:questionId', authMiddleware, roleCheck('recruiter'), codingAssessmentController.deleteCodingQuestion);

// ─── Submissions & Details ───────────────────────────────
router.post('/submit', authMiddleware, codingAssessmentController.submitCodingAssessment);
router.get('/details/:applicationId', authMiddleware, codingAssessmentController.getCodingAssessmentDetails);

module.exports = router;
