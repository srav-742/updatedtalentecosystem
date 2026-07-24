const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

router.post('/jobs', authMiddleware, roleCheck(['recruiter', 'admin']), recruiterController.createJob);
router.get('/dashboard/:recruiterId', authMiddleware, roleCheck(['recruiter', 'admin']), recruiterController.getRecruiterDashboard);
router.get('/applications', authMiddleware, roleCheck(['recruiter', 'admin']), recruiterController.getRecruiterApplications);

module.exports = router;
