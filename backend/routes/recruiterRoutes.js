const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');

router.post('/jobs', recruiterController.createJob);
router.get('/dashboard/:recruiterId', recruiterController.getRecruiterDashboard);
router.get('/applications/recruiter/:recruiterId', recruiterController.getRecruiterApplications);
router.get('/jobs/recruiter/:recruiterId', recruiterController.getRecruiterJobs);

module.exports = router;
