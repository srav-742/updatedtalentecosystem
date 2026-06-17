const express = require('express');
const router = express.Router();
const proctoringControllerEnhanced = require('../controllers/proctoringControllerEnhanced');

/**
 * Enhanced Proctoring Routes
 * ──────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/proctoring-enhanced in app.js.
 * Does NOT modify or conflict with the original /api/proctoring routes.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Log an enhanced violation (AI + browser)
router.post('/violation', proctoringControllerEnhanced.logViolation);

// Get violations by exam ID
router.get('/violations/exam/:examId', proctoringControllerEnhanced.getViolationsByExam);

// Get violations by user ID
router.get('/violations/user/:userId', proctoringControllerEnhanced.getViolationsByUser);

// Get violations summary for admin dashboard
router.get('/summary', proctoringControllerEnhanced.getViolationsSummary);

// Get overall report by exam ID
router.get('/report/:examId', proctoringControllerEnhanced.getReportByExam);

module.exports = router;
