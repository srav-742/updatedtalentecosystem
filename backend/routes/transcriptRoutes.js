const express = require('express');
const router = express.Router();
const { getRecommendationSummary } = require('../controllers/recommendationController');

// GET /api/transcripts/job/:jobId  — must come BEFORE /:applicationId to avoid route conflict
router.get('/job/:jobId', (req, res, next) => {
    delete require.cache[require.resolve('../controllers/transcriptController')];
    const { getJobCandidates } = require('../controllers/transcriptController');
    return getJobCandidates(req, res, next);
});

// GET /api/transcripts/:applicationId/recommendation
router.get('/:applicationId/recommendation', getRecommendationSummary);

// GET /api/transcripts/:applicationId
router.get('/:applicationId', (req, res, next) => {
    delete require.cache[require.resolve('../controllers/transcriptController')];
    const { getTranscript } = require('../controllers/transcriptController');
    return getTranscript(req, res, next);
});

module.exports = router;
