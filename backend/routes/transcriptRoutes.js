const express = require('express');
const router = express.Router();
const { getTranscript, getJobCandidates } = require('../controllers/transcriptController');

// GET /api/transcripts/job/:jobId  — must come BEFORE /:applicationId to avoid route conflict
router.get('/job/:jobId', getJobCandidates);

// GET /api/transcripts/:applicationId
router.get('/:applicationId', getTranscript);

module.exports = router;
