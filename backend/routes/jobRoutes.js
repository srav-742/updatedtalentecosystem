const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const recruiterController = require('../controllers/recruiterController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

// ADMIN ROUTES
router.get("/admin/all", authMiddleware, roleCheck('admin'), jobController.getAllJobsAdmin);
router.patch("/:jobId/approve", authMiddleware, roleCheck('admin'), jobController.approveJob);
router.patch("/:jobId/reject", authMiddleware, roleCheck('admin'), jobController.rejectJob);

// RECRUITER SPECIFIC (Must be above /:jobId to avoid collision)
router.get('/recruiter/:recruiterId', authMiddleware, roleCheck(['recruiter', 'admin']), recruiterController.getRecruiterJobs);

// CREATE JOB
router.post("/create", authMiddleware, roleCheck(['recruiter', 'admin']), jobController.createJob);

// GET ALL JOBS (candidates)
router.get("/", jobController.getAllJobs);

// GENERIC LOOKUP
router.get('/:jobId', jobController.getJobById);
router.put('/:jobId', authMiddleware, roleCheck(['recruiter', 'admin']), jobController.updateJob);
router.delete('/:jobId', authMiddleware, roleCheck(['recruiter', 'admin']), jobController.deleteJob);

module.exports = router;
