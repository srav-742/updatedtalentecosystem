const voiceAgentService = require('../services/voiceAgentService');
const User = require('../models/User');
const Application = require('../models/Application');

/**
 * Endpoint to trigger a voice call for a candidate.
 */
const triggerCall = async (req, res) => {
    try {
        let { applicationId } = req.params;
        applicationId = applicationId.trim();
        // Check both body (POST) and query (GET) for the optional stage parameter
        const stage = req.body?.stage || req.query?.stage;
        
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
        let { applicationId } = req.params;
        applicationId = applicationId.trim();
        const { stage, format } = req.query;
        console.log(`[VOICE-AGENT-DEBUG] Generating TwiML for App: ${applicationId}, Stage: ${stage || 'auto'}`);

        const twiml = await voiceAgentService.generateTwiML(applicationId, stage);
        
        if (format === 'text') {
            // Extract text content from <Say> tags for easy reading
            const textContent = twiml.match(/<Say[^>]*>([\s\S]*?)<\/Say>/g)
                .map(val => val.replace(/<Say[^>]*>|<\/Say>/g, '').trim())
                .join('\n\n');
            res.type('text/plain').send(textContent);
        } else {
            res.type('text/xml').send(twiml);
        }
    } catch (error) {
        console.error("[VOICE-AGENT-CONTROLLER-FATAL]:", error);
        res.status(500).type('text/xml').send(`<Response><Say>Error generating script: ${error.message}</Say></Response>`);
    }
};

/**
 * Handle branching response from the user.
 */
const handleResponse = async (req, res) => {
    try {
        let { applicationId } = req.params;
        applicationId = applicationId.trim();
        const { format } = req.query;
        const speechResult = req.body?.SpeechResult || req.query?.SpeechResult;
        console.log(`[VOICE-AGENT-DEBUG] Handling response for App: ${applicationId}, Input: ${speechResult}`);

        const twiml = await voiceAgentService.handleCallResponse(applicationId, speechResult);
        
        if (format === 'text') {
            const textContent = twiml.match(/<Say[^>]*>([\s\S]*?)<\/Say>/g)
                .map(val => val.replace(/<Say[^>]*>|<\/Say>/g, '').trim())
                .join('\n\n');
            res.type('text/plain').send(textContent);
        } else {
            res.type('text/xml').send(twiml);
        }
    } catch (error) {
        console.error("[VOICE-AGENT-CONTROLLER-RESPONSE-ERROR]:", error);
        res.status(500).type('text/xml').send(`<Response><Say>Error processing response: ${error.message}</Say></Response>`);
    }
};

/**
 * Handle Twilio Status Callbacks (Retry Logic Hook).
 */
const handleStatusCallback = async (req, res) => {
    const { CallStatus, To, CallSid } = req.body;
    let { applicationId } = req.params;
    applicationId = applicationId.trim();

    console.log(`[VOICE-AGENT-STATUS] Call ${CallSid} to ${To} (App: ${applicationId}) ended with status: ${CallStatus}`);

    // If CallStatus is 'busy', 'no-answer', or 'failed', we could implement retry logic here.
    if (['busy', 'no-answer', 'failed'].includes(CallStatus)) {
        console.log(`[VOICE-AGENT-RETRY] Scheduling retry for ${To}...`);
        // Logic for queueing a retry after X minutes would go here.
    }

    res.status(200).send('Status received');
};

/**
 * NEW: Analyze ALL candidates and return their state globally.
 */
const analyzeAllCandidates = async (req, res) => {
    try {
        const users = await User.find({ role: 'seeker' });
        const analysis = [];

        for (const user of users) {
            const latestApplication = await Application.findOne({ userId: user.uid }).sort({ createdAt: -1 }).populate('jobId');
            
            // Re-use deriveCandidateState logic but manually for the bulk array
            let state = 'inactive_candidate';
            let jobTitle = null;

            if (latestApplication) {
                const { status, resumeMatchPercent, assessmentScore, interviewScore } = latestApplication;
                jobTitle = latestApplication.jobId?.title || 'Unknown Role';

                if (status === 'HIRED' || status === 'ELIGIBLE') state = 'completed';
                else if (assessmentScore !== null && assessmentScore !== undefined && (interviewScore === null || interviewScore === undefined)) state = 'interview_pending';
                else if (resumeMatchPercent !== null && resumeMatchPercent !== undefined && resumeMatchPercent >= 70 && status === 'APPLIED') state = 'resume_selected';
                else if (resumeMatchPercent !== null && resumeMatchPercent !== undefined && resumeMatchPercent >= 70 && (assessmentScore === null || assessmentScore === undefined)) state = 'skill_pending';
                else state = 'applied';
            }

            analysis.push({
                userId: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || 'No Phone',
                state,
                latestApplication: latestApplication ? latestApplication._id : null,
                jobTitle
            });
        }

        res.status(200).json({ success: true, count: analysis.length, candidates: analysis });
    } catch (error) {
        console.error("[VOICE-AGENT-CONTROLLER] Error analyzing candidates:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * NEW: Trigger a call by User ID (Fallback logic uses this seamlessly now)
 */
const triggerUserCall = async (req, res) => {
    try {
        let { userId } = req.params;
        userId = userId.trim();
        const stage = req.body?.stage || req.query?.stage;
        
        // Since triggerVoiceCall now handles User ID fallback, we can directly pass the userId.
        const result = await voiceAgentService.triggerVoiceCall(userId, stage);
        res.status(200).json(result);
    } catch (error) {
        console.error("[VOICE-AGENT-CONTROLLER] Error triggering user call:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    triggerCall,
    getTwiML,
    handleResponse,
    handleStatusCallback,
    analyzeAllCandidates,
    triggerUserCall
};
