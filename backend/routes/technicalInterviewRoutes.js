/**
 * ─── Technical Interview Routes ──────────────────────────────────────────────
 *
 * Dedicated router for the Live Technical Problem-Solving round.
 * Mounted at `/api/interview/technical` in `app.js`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const technicalController = require('../controllers/technicalInterviewController');

// ─── Session State & Problem Initialization ───────────────────
router.get('/state/:sessionId', technicalController.getTechnicalState);
router.post('/init', technicalController.initTechnicalProblem);

// ─── Phase 1: Candidate Explains Approach (Voice or Chat) ─────
router.post('/explain-approach', technicalController.explainApproach);

// ─── Phase 2: Live Code Sandbox Execution & Final Submission ──
router.post('/run-code', technicalController.runCode);
router.post('/submit-solution', technicalController.submitSolution);

// ─── Phase 3: AI Follow-Up Questioning ─────────────────────────
router.post('/answer-follow-up', technicalController.answerFollowUp);

// ─── Phase 4: Finalize Scoring & Resume Normal Interview ──────
router.post('/complete-and-resume', technicalController.completeAndResume);

module.exports = router;
