const express = require('express');
const router = express.Router();
const voiceAgentController = require('../controllers/voiceAgentController');

// Route to trigger a voice call
router.post('/call/:applicationId', voiceAgentController.triggerCall);

// Twilio Webhooks
router.post('/twiml/:applicationId', voiceAgentController.getTwiML);
router.post('/handle-response/:applicationId', voiceAgentController.handleResponse);

// Status Callback (for retry logic and logging)
router.post('/status-callback/:applicationId', voiceAgentController.handleStatusCallback);

module.exports = router;
