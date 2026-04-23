const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

// ADMIN ROUTES — must be before /:jobId to avoid param conflicts
router.get("/admin/all", authMiddleware, roleCheck('admin'), jobController.getAllJobsAdmin);
router.patch("/:jobId/approve", authMiddleware, roleCheck('admin'), jobController.approveJob);
router.patch("/:jobId/reject", authMiddleware, roleCheck('admin'), jobController.rejectJob);


// CREATE JOB
router.post("/create", jobController.createJob);

// GET ALL JOBS (candidates — approved only)
router.get("/", jobController.getAllJobs);

// LEGACY/OTHER ROUTES
router.get('/:jobId', jobController.getJobById);
router.put('/:jobId', jobController.updateJob);
router.delete('/:jobId', jobController.deleteJob);

module.exports = router;
