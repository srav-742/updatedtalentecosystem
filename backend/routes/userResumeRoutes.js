const express = require('express');
const router = express.Router();
const userResumeController = require('../controllers/userResumeController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { memoryUpload } = require('../middleware/upload');

router.get('/:userId', authMiddleware, userResumeController.getUserResumes);
router.post('/upload', authMiddleware, memoryUpload.single('resume'), userResumeController.uploadResume);
router.put('/:id/default', authMiddleware, userResumeController.setDefaultResume);
router.delete('/:id', authMiddleware, userResumeController.deleteResume);

module.exports = router;
