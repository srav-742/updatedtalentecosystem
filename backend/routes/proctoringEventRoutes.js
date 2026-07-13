const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/proctoringEventController');

/**
 * Proctoring Pipeline Routes
 * ──────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/proctoring-pipeline in app.js.
 * Handles multi-layer proctoring pipeline events, sessions, and scoring.
 * Does NOT modify or conflict with existing /api/proctoring or
 * /api/proctoring-enhanced routes.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Log a single confirmed proctoring event
router.post('/event', ctrl.logEvent);

// Log multiple events in batch (reduces HTTP overhead)
router.post('/batch-events', ctrl.logBatchEvents);

// Get all events for an exam session
router.get('/events/:examId', ctrl.getEventsByExam);

// Get session summary with proctoring score
router.get('/session/:examId', ctrl.getSession);

// Get current proctoring score only
router.get('/score/:examId', ctrl.getScore);

// Log a warning escalation
router.post('/warning', ctrl.logWarning);

// Initialize or update environment check
router.post('/environment-check', ctrl.environmentCheck);

// Get pipeline-level summary for admin dashboard
router.get('/summary', ctrl.getPipelineSummary);

module.exports = router;
