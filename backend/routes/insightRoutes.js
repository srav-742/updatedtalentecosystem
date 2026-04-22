const express = require('express');
const router = express.Router();
const insightController = require('../controllers/insightController');

// Fetch performance insights for a recruiter's hires
router.get('/recruiter/:userId', insightController.getRecruiterInsights);

module.exports = router;
