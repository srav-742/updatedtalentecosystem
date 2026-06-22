const express = require('express');
const router = express.Router();
const recruiterUploadController = require('../controllers/recruiterUploadController');
const { memoryUpload } = require('../middleware/upload');

router.post('/recruiter/bulk-upload-candidate', memoryUpload.single('resume'), recruiterUploadController.bulkUploadCandidate);

module.exports = router;
