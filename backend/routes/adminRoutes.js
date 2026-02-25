const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyAdmin = require('../middleware/adminAuth');

router.get('/admin/interviews', verifyAdmin, adminController.listInterviews);
router.get('/admin/interviews/:id', verifyAdmin, adminController.listInterviewFiles);
router.get('/admin/audio/:interviewId/:fileName', verifyAdmin, adminController.streamAudio);

module.exports = router;
