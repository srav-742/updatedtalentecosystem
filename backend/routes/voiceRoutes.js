const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { upload } = require('../middleware/upload');
const secureUpload = require('../middleware/secureUpload');

router.post('/upload-audio', secureUpload.single('audio'), voiceController.uploadAudio);
router.post('/tts', voiceController.tts);
router.get('/get-audio', voiceController.getAudio);

module.exports = router;
