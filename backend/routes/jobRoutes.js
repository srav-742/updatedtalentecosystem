const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

router.get('/jobs', jobController.getAllJobs);
router.get('/jobs/:jobId', jobController.getJobById);
router.put('/jobs/:jobId', jobController.updateJob);
router.delete('/jobs/:jobId', jobController.deleteJob);

module.exports = router;
