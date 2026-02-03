const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { memoryUpload } = require('../middleware/upload');

router.post('/analyze-resume', resumeController.analyzeResume);
router.post('/parse-resume-structured', resumeController.parseResumeStructured);
router.post('/extract-pdf', memoryUpload.single('resume'), resumeController.extractPdf);

module.exports = router;
