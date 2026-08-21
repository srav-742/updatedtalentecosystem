const express = require('express');
const router = express.Router();
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

router.post('/jobs', recruiterController.createJob);
router.get('/dashboard/:recruiterId', cacheMiddleware(30, { httpMaxAge: 0, staleWhileRevalidate: 0, varyByUser: true }), recruiterController.getRecruiterDashboard);
router.get('/applications/recruiter/:recruiterId', recruiterController.getRecruiterApplications);

module.exports = router;
