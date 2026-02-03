const express = require('express');
const router = express.Router();
const sttController = require('../controllers/speechToText.controller');
const ttsController = require('../controllers/textToSpeech.controller');
const { upload } = require('../middleware/upload');

router.post('/stt', upload.single('audio'), sttController.convertSpeechToText);
router.post('/tts', ttsController.convertTextToSpeech);

module.exports = router;
