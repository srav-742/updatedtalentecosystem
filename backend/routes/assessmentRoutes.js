const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');

router.post('/generate-full-assessment', assessmentController.generateFullAssessment);

module.exports = router;
