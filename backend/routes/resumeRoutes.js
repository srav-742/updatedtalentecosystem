const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const resumeSyncController = require('../controllers/resumeSyncController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { memoryUpload } = require('../middleware/upload');

router.post('/analyze-resume', resumeController.analyzeResume);
router.post('/parse-resume-structured', resumeController.parseResumeStructured);
router.get('/resume-profile/:userId', resumeController.getResumeStructuredProfile);
router.post('/extract-pdf', memoryUpload.single('resume'), resumeController.extractPdf);
router.post('/resume/sync-from-builder', authMiddleware, resumeSyncController.syncFromBuilder);

module.exports = router;
