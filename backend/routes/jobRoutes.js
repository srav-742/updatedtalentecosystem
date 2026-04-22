const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

// ADMIN ROUTES — must be before /:jobId to avoid param conflicts
router.get("/admin/all", jobController.getAllJobsAdmin);
router.patch("/:jobId/approve", jobController.approveJob);
router.patch("/:jobId/reject", jobController.rejectJob);

// CREATE JOB
router.post("/create", jobController.createJob);

// GET ALL JOBS (candidates — approved only)
router.get("/", jobController.getAllJobs);

// LEGACY/OTHER ROUTES
router.get('/:jobId', jobController.getJobById);
router.put('/:jobId', jobController.updateJob);
router.delete('/:jobId', jobController.deleteJob);

module.exports = router;
