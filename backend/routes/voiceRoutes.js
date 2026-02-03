const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { upload } = require('../middleware/upload');

router.post('/upload-audio', upload.single('audio'), voiceController.uploadAudio);
router.post('/tts', voiceController.tts);
router.get('/get-audio', voiceController.getAudio);

module.exports = router;
