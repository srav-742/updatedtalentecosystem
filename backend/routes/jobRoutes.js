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

// GENERATE JOB DESCRIPTION AI
router.post("/generate-description", authMiddleware, roleCheck('recruiter', 'admin'), jobController.generateJobDescription);


const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// PARSE RECRUITER QUESTIONS (Text or File)
router.post("/parse-questions", (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('[PARSE-QUESTIONS-UPLOAD] Multer error:', err);
            return res.status(400).json({
                success: false,
                message: err.code === 'LIMIT_FILE_SIZE'
                    ? 'File size exceeds the 10MB limit.'
                    : `Upload error: ${err.message}`
            });
        }
        next();
    });
}, jobController.parseQuestions);

// CREATE JOB
router.post("/create", authMiddleware, roleCheck(['recruiter', 'admin']), jobController.createJob);
router.post("/", authMiddleware, roleCheck(['recruiter', 'admin']), jobController.createJob);

// GET ALL JOBS (candidates)
router.get("/", jobController.getAllJobs);

// GENERIC LOOKUP
router.get('/:jobId', jobController.getJobById);
router.patch('/:jobId/publish', authMiddleware, roleCheck(['recruiter', 'admin']), jobController.publishDraftJob);
router.put('/:jobId', authMiddleware, roleCheck(['recruiter', 'admin']), jobController.updateJob);
router.delete('/:jobId', authMiddleware, roleCheck(['recruiter', 'admin']), jobController.deleteJob);

module.exports = router;
