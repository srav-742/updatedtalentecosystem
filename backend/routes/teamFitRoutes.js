const express = require('express');
const router = express.Router();
const teamFitController = require('../controllers/teamFitController');

// Route to manually trigger fit calculation for a candidate
router.post('/calculate/:applicationId', teamFitController.calculateTeamFit);

module.exports = router;
