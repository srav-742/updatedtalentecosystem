const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

router.post('/jobs', recruiterController.createJob);
router.get('/jobs/recruiter/:recruiterId', recruiterController.getRecruiterJobs);
router.get('/recruiter/:recruiterId/jobs', recruiterController.getRecruiterJobs);
router.get('/dashboard/:recruiterId', cacheMiddleware(30, { httpMaxAge: 0, staleWhileRevalidate: 0, varyByUser: true }), recruiterController.getRecruiterDashboard);
router.get('/applications', recruiterController.getRecruiterApplications);
router.get('/applications/recruiter/:recruiterId', recruiterController.getRecruiterApplications);

module.exports = router;
