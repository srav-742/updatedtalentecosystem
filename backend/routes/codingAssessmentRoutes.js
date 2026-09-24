const express = require('express');
const router = express.Router();
const codingAssessmentController = require('../controllers/codingAssessmentController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

// ─── Optional Auth Helper for Candidate Flow ─────────────────
const optionalAuth = (req, res, next) => {
    if (!req.headers.authorization && !req.headers['x-user-id']) {
        return next();
    }
    try {
        const dummyRes = {
            status: () => dummyRes,
            json: () => next()
        };
        authMiddleware(req, dummyRes, next).catch?.(() => next());
    } catch (e) {
        next();
    }
};

// ─── Coding Round ────────────────────────────────────────
router.post('/round', authMiddleware, roleCheck('recruiter'), codingAssessmentController.createOrUpdateCodingRound);
router.get('/round/:jobId', optionalAuth, codingAssessmentController.getCodingRoundByJobId);
router.delete('/round/:jobId', authMiddleware, roleCheck('recruiter'), codingAssessmentController.deleteCodingRound);

// ─── Coding Questions ────────────────────────────────────
router.post('/questions', authMiddleware, roleCheck('recruiter'), codingAssessmentController.addCodingQuestion);
router.put('/questions/:questionId', authMiddleware, roleCheck('recruiter'), codingAssessmentController.updateCodingQuestion);
router.delete('/questions/:questionId', authMiddleware, roleCheck('recruiter'), codingAssessmentController.deleteCodingQuestion);

// ─── Submissions & Details ───────────────────────────────
router.post('/submit', authMiddleware, codingAssessmentController.submitCodingAssessment);
router.get('/details/:applicationId', authMiddleware, codingAssessmentController.getCodingAssessmentDetails);

// ─── AI Re-evaluation ────────────────────────────────────
router.post('/re-evaluate/:applicationId/:questionIndex', authMiddleware, roleCheck(['recruiter', 'admin']), codingAssessmentController.reEvaluateCodingAnswer);

module.exports = router;
