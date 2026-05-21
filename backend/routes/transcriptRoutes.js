const express = require('express');
const router = express.Router();
const { getTranscript, getJobCandidates } = require('../controllers/transcriptController');
const { getRecommendationSummary } = require('../controllers/recommendationController');

// GET /api/transcripts/job/:jobId  — must come BEFORE /:applicationId to avoid route conflict
router.get('/job/:jobId', getJobCandidates);

// GET /api/transcripts/:applicationId/recommendation
router.get('/:applicationId/recommendation', getRecommendationSummary);

// GET /api/transcripts/:applicationId
router.get('/:applicationId', getTranscript);

module.exports = router;
