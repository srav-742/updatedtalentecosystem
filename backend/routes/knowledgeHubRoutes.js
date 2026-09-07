const express = require('express');
const router = express.Router();
const knowledgeHubController = require('../controllers/knowledgeHubController');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// Get curated knowledge topics, guides, FAQs, and prompt templates (cached for 10 minutes)
router.get('/topics', cacheMiddleware(600, { httpMaxAge: 300, staleWhileRevalidate: 1200 }), knowledgeHubController.getTopicsAndGuides);

// Recruiter Copilot Q&A endpoint
router.post('/ask', knowledgeHubController.askQuestion);

module.exports = router;
