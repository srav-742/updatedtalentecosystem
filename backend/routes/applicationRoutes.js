const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/applications', applicationController.submitApplication);
router.post('/applications/proctoring-reset', applicationController.resetApplicationAfterProctoring);
router.post('/applications/:id/retest', applicationController.retestApplicationRound);
router.post('/applications/:id/grant-retest', applicationController.grantRetestAccess);
router.get('/applications/candidate/:userId/stats', applicationController.getSeekerDashboardStats);
router.get('/applications/candidate/:userId', applicationController.getSeekerApplications);
router.put('/applications/:id/status', applicationController.updateApplicationStatus);
router.delete('/applications/:id', authMiddleware, applicationController.deleteApplication);

module.exports = router;
