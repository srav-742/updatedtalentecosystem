const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

// CREATE JOB
router.post("/create", jobController.createJob);

// GET ALL JOBS
router.get("/", jobController.getAllJobs);

// LEGACY/OTHER ROUTES
router.get('/:jobId', jobController.getJobById);
router.put('/:jobId', jobController.updateJob);
router.delete('/:jobId', jobController.deleteJob);

module.exports = router;
