const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

router.post('/applications', authMiddleware, roleCheck(['seeker', 'admin']), applicationController.submitApplication);
router.post('/applications/proctoring-reset', authMiddleware, applicationController.resetApplicationAfterProctoring);
router.get('/applications/seeker/:userId', authMiddleware, applicationController.getSeekerApplications);
router.put('/applications/:id/status', authMiddleware, roleCheck(['recruiter', 'admin']), applicationController.updateApplicationStatus);
router.delete('/applications/:id', authMiddleware, applicationController.deleteApplication);

module.exports = router;
