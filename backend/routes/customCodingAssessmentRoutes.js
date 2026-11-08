const express = require('express');
const router = express.Router();
const customCodingAssessmentController = require('../controllers/customCodingAssessmentController');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

router.post('/generate', authMiddleware, roleCheck('recruiter'), upload.single('file'), customCodingAssessmentController.generateCustomCodingQuestions);
router.post('/save', authMiddleware, roleCheck('recruiter'), customCodingAssessmentController.saveCustomCodingRound);

module.exports = router;
