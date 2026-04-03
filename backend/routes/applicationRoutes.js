const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');

router.post('/applications', applicationController.submitApplication);
router.post('/applications/proctoring-reset', applicationController.resetApplicationAfterProctoring);
router.get('/applications/seeker/:userId', applicationController.getSeekerApplications);
router.put('/applications/:id/status', applicationController.updateApplicationStatus);

module.exports = router;
