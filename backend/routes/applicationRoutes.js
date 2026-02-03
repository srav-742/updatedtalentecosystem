const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

router.post('/applications', applicationController.submitApplication);
router.get('/applications/seeker/:userId', applicationController.getSeekerApplications);
router.put('/applications/:id/status', applicationController.updateApplicationStatus);

module.exports = router;
