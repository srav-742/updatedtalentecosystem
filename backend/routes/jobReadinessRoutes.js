const express = require('express');
const router = express.Router();
const jobReadinessController = require('../controllers/jobReadinessController');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// Calculate and retrieve candidate job readiness score (cached 30 seconds per candidate)
router.get('/:userId', cacheMiddleware(30, { httpMaxAge: 0, staleWhileRevalidate: 60, varyByUser: true }), jobReadinessController.getJobReadiness);

module.exports = router;
