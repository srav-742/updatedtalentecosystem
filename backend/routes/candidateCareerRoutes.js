const express = require('express');
const router = express.Router();
const candidateCareerController = require('../controllers/candidateCareerController');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// Get curated career topics, role guides, FAQs, and rubrics (cached 10 min)
router.get('/topics', cacheMiddleware(600, { httpMaxAge: 300, staleWhileRevalidate: 1200 }), candidateCareerController.getCareerTopics);

// Get project blueprints (cached 10 min)
router.get('/blueprints', cacheMiddleware(600, { httpMaxAge: 300, staleWhileRevalidate: 1200 }), candidateCareerController.getProjectBlueprints);

// Candidate Career AI Copilot / Advisor Q&A endpoint
router.post('/ask', candidateCareerController.askCareerAdvisor);

module.exports = router;
