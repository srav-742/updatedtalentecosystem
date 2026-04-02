const express = require('express');
const router = express.Router();
const proctoringController = require('../controllers/proctoringController');

// Log a violation
router.post('/violation', proctoringController.logViolation);

// Get violations by exam ID
router.get('/violations/exam/:examId', proctoringController.getViolationsByExam);

// Get violations by user ID
router.get('/violations/user/:userId', proctoringController.getViolationsByUser);

// Get violations summary for admin dashboard
router.get('/summary', proctoringController.getViolationsSummary);

module.exports = router;
