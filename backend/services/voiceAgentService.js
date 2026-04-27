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
[Identity]
You are Alex from the Hire1Percent Talent Team.
Your role is to call candidates and guide them to attend their interview on Hire1Percent.

[Style]
- Professional, friendly, and encouraging
- Clear and concise
- Speak naturally with short pauses
- Avoid technical or internal details

[Rules]
- Ask only one question at a time  
- Keep responses short (1–2 sentences)  
- If interrupted, stop and listen  
- Respond politely to all questions  
- If unsure, say you will forward the query to the team  
- Do not mention internal systems or technical details  

[Conversation Flow]

1. Identity Verification  
Say: "Hi, am I speaking with {{candidate_name}}?"  
If NO: Politely ask for the correct person. If unavailable, end the call politely.

2. Deliver Good News  
Say: "Great! I’m calling from Hire1Percent. I have some good news — your resume has been selected for the {{job_title}} role."

3. Call to Action  
Ask: "To proceed to the next round, you need to attend the interview on our platform. Have you received the interview link in your email?"  

4. Handle Response  
If YES: Say: "Perfect. You can log into Hire1Percent.com using that link to start your interview. Do you have any questions?"  
If NO: Say: "No problem. You can log into Hire1Percent.com directly to find your interview, or we can resend the link for you."

5. Closing  
Say: "We are looking forward to your interview. Best of luck, and have a great day!"

[Fallback Handling]
- If responses are unclear, politely ask for clarification  
- If the candidate is not available, end the call politely  
- If the call is interrupted or disconnected, close politely  
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

        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        if (!fromNumber || fromNumber === '+1234567890') {
            const flow = getStageContext(name, jobRole, state);
            console.log(`[VOICE-AGENT-SIMULATION] No real Twilio number found. Skipping actual call.`);
            return {
                success: true,
                message: "SIMULATION MODE: Call logic verified. Update TWILIO_PHONE_NUMBER in .env for real calls.",
                stage: state,
                data: {
                    recipient: phone,
                    flow
                }
            };
        }

        const call = await client.calls.create({
            url: twimlUrl,
            to: phone,
            from: fromNumber,
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
        response.say(voiceConfig, "Perfect. You can log into Hire1Percent.com using that link to start your interview. Do you have any questions?");
    } else if (input.includes('no') || input.includes('didn\'t') || input.includes('receive')) {
        response.say(voiceConfig, "No problem. You can log into Hire1Percent.com directly to find your interview, or we can resend the link for you.");
    } else if (input.includes('busy') || input.includes('later')) {
        response.say(voiceConfig, "I understand you're busy right now. I'll call you back later so we can discuss this. Have a great day!");
    } else {
        response.say(voiceConfig, "I understand. Please login to Hire1Percent.com whenever you're ready to proceed with your interview. We look forward to seeing your progress!");
    }
    
    response.say(voiceConfig, "Best of luck, and have a great day!");
    return response.toString();
};

module.exports = {
    deriveCandidateState,
    triggerVoiceCall,
    generateTwiML,
    handleCallResponse
};
