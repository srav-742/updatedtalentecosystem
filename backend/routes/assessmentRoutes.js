const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');

router.post('/generate-full-assessment', assessmentController.generateFullAssessment);
router.post('/submit-assessment', assessmentController.submitAssessment);
router.get('/assessment-details/:applicationId', assessmentController.getAssessmentDetails);

module.exports = router;
