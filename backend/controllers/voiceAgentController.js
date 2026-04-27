const voiceAgentService = require('../services/voiceAgentService');

/**
 * Endpoint to trigger a voice call for a candidate.
 */
const triggerCall = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { stage } = req.body; // Optional: Force a specific stage (e.g. for "Old Candidate" case)
        
        const result = await voiceAgentService.triggerVoiceCall(applicationId, stage);
        res.status(200).json(result);
    } catch (error) {
        console.error("[VOICE-AGENT-CONTROLLER] Error triggering call:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * TwiML Endpoint for Twilio Voice calls.
 */
const getTwiML = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { stage } = req.query;
        const twiml = await voiceAgentService.generateTwiML(applicationId, stage);
        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        console.error("[VOICE-AGENT-CONTROLLER] TwiML Error:", error);
        res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
    }
};

/**
 * Handle branching response from the user.
 */
const handleResponse = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const speechResult = req.body.SpeechResult;
        const twiml = voiceAgentService.handleCallResponse(applicationId, speechResult);
        res.type('text/xml');
        res.send(twiml);
    } catch (error) {
        console.error("[VOICE-AGENT-CONTROLLER] Response Handling Error:", error);
        res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
    }
};

/**
 * Handle Twilio Status Callbacks (Retry Logic Hook).
 */
const handleStatusCallback = async (req, res) => {
    const { CallStatus, To, CallSid } = req.body;
    const { applicationId } = req.params;

    console.log(`[VOICE-AGENT-STATUS] Call ${CallSid} to ${To} (App: ${applicationId}) ended with status: ${CallStatus}`);

    // If CallStatus is 'busy', 'no-answer', or 'failed', we could implement retry logic here.
    if (['busy', 'no-answer', 'failed'].includes(CallStatus)) {
        console.log(`[VOICE-AGENT-RETRY] Scheduling retry for ${To}...`);
        // Logic for queueing a retry after X minutes would go here.
    }

    res.status(200).send('Status received');
};

module.exports = {
    triggerCall,
    getTwiML,
    handleResponse,
    handleStatusCallback
};
