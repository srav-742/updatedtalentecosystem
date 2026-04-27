const Application = require('../models/Application');
const User = require('../models/User'); // For inactive candidate case
const twilio = require('twilio');
const { callOpenAI, callSkillAI } = require('../utils/aiClients');

// Initialize Twilio Client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

/**
 * 🔹 MASTER SYSTEM PROMPT (Core logic as requested)
 */
const MASTER_SYSTEM_PROMPT = `
You are a professional, friendly voice assistant from Hire1Percent.

Your job is to:
- Inform candidates about their application status
- Guide them to the next step
- Keep conversation short, clear, and natural

Rules:
- Speak like a human recruiter
- Do not talk too long
- Always confirm candidate identity first
- Always guide to Hire1Percent platform
- Handle yes/no responses properly
- End politely

Never:
- Give unnecessary details
- Sound robotic
`;

/**
 * 8. STATE-AWARE EXECUTION (Fetch & Check Stage)
 */
const deriveCandidateState = (application) => {
    if (!application) return 'inactive_candidate';
    
    const { 
        status, 
        resumeMatchPercent, 
        assessmentScore, 
        interviewScore 
    } = application;

    if (status === 'HIRED' || status === 'ELIGIBLE') return 'completed';
    if (assessmentScore !== null && assessmentScore !== undefined && (interviewScore === null || interviewScore === undefined)) {
        return 'interview_pending';
    }
    if (resumeMatchPercent !== null && resumeMatchPercent !== undefined && resumeMatchPercent >= 70 && (assessmentScore === null || assessmentScore === undefined)) {
        return 'skill_pending';
    }
    if (resumeMatchPercent !== null && resumeMatchPercent !== undefined && resumeMatchPercent >= 70 && status === 'APPLIED') {
        return 'resume_selected';
    }

    return 'applied';
};

/**
 * 5. STAGE-WISE PROMPTS (Dynamic Generation)
 */
const getStageContext = (name, jobRole, stage) => {
    switch (stage) {
        case 'resume_selected':
            return `
                Context: Candidate ${name} has cleared resume screening for ${jobRole}.
                Task:
                - Inform candidate they are shortlisted
                - Ask if they received interview link
                - Guide them to attend interview
            `;
        case 'skill_pending':
            return `
                Context: Candidate ${name} has not completed skill assessment for ${jobRole}.
                Task:
                - Remind them to complete it
                - Explain it is required for next step
            `;
        case 'interview_pending':
            return `
                Context: Candidate ${name} has cleared previous rounds for ${jobRole}.
                Task:
                - Ask them to attend interview
                - Encourage quick completion
            `;
        case 'inactive_candidate':
            return `
                Context: Candidate ${name} applied earlier but is inactive.
                Task:
                - Inform about new job matching their profile
                - Encourage them to log in and apply
            `;
        case 'completed':
            return `
                Context: Candidate ${name} finished all steps for ${jobRole}.
                Task:
                - Inform completion
                - Say results will be shared soon
            `;
        default:
            return `
                Context: Application status update for ${name} regarding ${jobRole}.
                Task: Welcome them and ask them to check the platform.
            `;
    }
};

/**
 * 4. DYNAMIC PROMPT SYSTEM (AI Brain)
 * Uses OpenAI to generate the natural opening and response strategy.
 */
const generateDynamicPrompt = async (context) => {
    const { name, jobRole, stage } = context;
    const stageContext = getStageContext(name, jobRole, stage);

    const fullPrompt = `
        ${MASTER_SYSTEM_PROMPT}
        
        ${stageContext}

        Generate the initial dialogue for this call. 
        Structure:
        1. Opening identity check ("Hi, am I speaking with ${name}?")
        2. Context-based message based on the task.
        3. Clear action instruction (login to Hire1Percent.com).
        4. Branching question ("Can you do this now?").
    `;

    try {
        const aiResponse = await callSkillAI(fullPrompt, 500);
        console.log(`[VOICE-AI-BRAIN] AI Response: ${aiResponse}`);
        return aiResponse || `Hi, am I speaking with ${name}? I'm calling from Hire1Percent regarding your ${jobRole} application. Please visit our platform to see the next steps.`;
    } catch (error) {
        console.error("[VOICE-AI-BRAIN] Error generating prompt:", error);
        return `Hi, is this ${name}? This is Hire1Percent. Please check your dashboard for the ${jobRole} role.`;
    }
};

/**
 * 2.1 Calling System (Twilio)
 */
const triggerVoiceCall = async (applicationId, forceStage = null) => {
    try {
        const application = await Application.findById(applicationId).populate('jobId');
        if (!application && !forceStage) throw new Error('Application not found');

        const name = application ? application.applicantName : "Candidate";
        const jobRole = application?.jobId?.title || 'the position';
        const state = forceStage || deriveCandidateState(application);
        const phone = application?.applicantPhone || "+1234567890";

        console.log(`[STATE-AWARE-EXEC] Fetching data for ${name} | Stage: ${state}`);

        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const twimlUrl = `${baseUrl}/api/voice-agent/twiml/${applicationId}${forceStage ? '?stage=' + forceStage : ''}`;

        const call = await client.calls.create({
            url: twimlUrl,
            to: phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            statusCallback: `${baseUrl}/api/voice-agent/status-callback/${applicationId}`,
            statusCallbackEvent: ['completed', 'failed', 'busy', 'no-answer']
        });

        return { success: true, callSid: call.sid, stage: state };
    } catch (error) {
        console.error("[VOICE-AGENT-EXEC] Error:", error);
        throw error;
    }
};

/**
 * 3. CALL FLOW SYSTEM (TwiML Generation)
 */
const generateTwiML = async (applicationId, queryStage = null) => {
    const application = await Application.findById(applicationId).populate('jobId');
    const state = queryStage || deriveCandidateState(application);
    const name = application ? application.applicantName : "Candidate";
    const jobRole = application?.jobId?.title || 'the position';

    const aiDialogue = await generateDynamicPrompt({ name, jobRole, stage: state });

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // 🔊 2.3 Voice Engine (Currently using Polly as placeholder for ElevenLabs)
    // Note: To use ElevenLabs, you'd use <Play> with a pre-generated URL from ElevenLabs API.
    const voiceConfig = { voice: 'Polly.Matthew', language: 'en-US' };

    response.say(voiceConfig, aiDialogue);
    
    const gather = response.gather({
        input: 'speech',
        action: `${process.env.BASE_URL}/api/voice-agent/handle-response/${applicationId}`,
        timeout: 3,
        speechTimeout: 'auto',
        hints: 'yes, no, sure, busy, later, confused'
    });
    
    // Explicit Branch Handling in TwiML
    gather.say(voiceConfig, "Are you able to complete this step right now? Please say yes, no, or if you are busy.");

    return response.toString();
};

/**
 * 6. RESPONSE HANDLING LOGIC
 */
const handleCallResponse = (applicationId, speechResult) => {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    const voiceConfig = { voice: 'Polly.Matthew', language: 'en-US' };
    
    const input = (speechResult || "").toLowerCase();
    
    if (input.includes('yes') || input.includes('sure') || input.includes('okay')) {
        response.say(voiceConfig, "Perfect! Please head over to Hire1Percent.com now. We look forward to your progress. All the best!");
    } else if (input.includes('no') || input.includes('didn\'t') || input.includes('receive')) {
        response.say(voiceConfig, "No worries. I've just resent the link and instructions to your email. You can access them through Hire1Percent.com as well.");
    } else if (input.includes('busy') || input.includes('later')) {
        response.say(voiceConfig, "I understand you're busy. I'll call you back later. Have a great day!");
    } else if (input.includes('confused') || input.includes('what') || input.includes('help')) {
        response.say(voiceConfig, "I apologize for the confusion. Basically, you have a pending step on our platform. Just login to Hire1Percent.com to continue.");
    } else {
        response.say(voiceConfig, "Thank you for your time. Please login to Hire1Percent.com whenever you're ready to proceed. Goodbye!");
    }
    
    response.hangup();
    return response.toString();
};

module.exports = {
    deriveCandidateState,
    triggerVoiceCall,
    generateTwiML,
    handleCallResponse
};
