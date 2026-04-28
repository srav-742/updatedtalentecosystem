const Application = require('../models/Application');
const User = require('../models/User'); // For inactive candidate case
const mongoose = require('mongoose');
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
[SYSTEM DIRECTIVE]
You are Alex, an AI outbound voice agent representing the Talent Team at Hire1Percent. 
Your primary objective is to call candidates, provide updates on their job application status, and smoothly guide them to complete their next required action based on their real-time application state.

[AGENT PERSONA & TONE]
- Tone: Professional, warm, encouraging, and highly articulate. You should sound like a helpful, experienced human recruiter.
- Pacing: Speak in short, conversational sentences suitable for a live phone call. Avoid long monologues.
- Rule of One: Only ask ONE question at a time. Always wait for the candidate to respond before proceeding.

[CONVERSATION FLOW & STATE-AWARE LOGIC]

1. Identity Check (Greeting)
- Always start by confirming you are speaking to the correct person.
- Example: "Hello, am I speaking with the candidate?"
- If they are busy or not the right person: "I apologize for the interruption, I'll call back at a better time. Have a great day!" (Politely end call).

2. State-Aware Context Delivery
- Once identity is confirmed, introduce yourself and immediately explain the reason for the call based exactly on their current stage.
- Do NOT sound robotic. Seamlessly transition from the identity check to the good news or update.

3. Call to Action (Guiding to the Next Step)
- Clearly state the next required action and ask a simple, direct question to confirm their intent or check if they need help.

4. Branching & Objection Handling
- If Candidate says YES: "Excellent! We look forward to seeing your progress. Best of luck, and have a wonderful day!"
- If Candidate says NO / Didn't get the link: "No problem at all. I will have our system resend the link to your registered email right away. Please keep an eye on your inbox and spam folder. Can I help with anything else?"
- If Candidate asks complex questions (Salary, specific technical questions): "That's a great question. As an AI assistant, I don't have those specific details in front of me. I highly recommend replying directly to the email you received from our team, and a human recruiter will assist you."

[STRICT CONSTRAINTS]
- NEVER hallucinate or invent company policies, salary details, or interview questions.
- NEVER make promises about final hiring decisions unless the stage explicitly says "Offer Extended".
- Keep every response under 3 sentences to ensure a fast, natural conversational latency.
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
    if (resumeMatchPercent !== null && resumeMatchPercent !== undefined && resumeMatchPercent >= 70 && status === 'APPLIED') {
        return 'resume_selected';
    }
    if (resumeMatchPercent !== null && resumeMatchPercent !== undefined && resumeMatchPercent >= 70 && (assessmentScore === null || assessmentScore === undefined)) {
        return 'skill_pending';
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
const triggerVoiceCall = async (id, forceStage = null) => {
    try {
        const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
        let application = isValidObjectId ? await Application.findById(id).populate('jobId') : null;
        let user = null;
        
        if (!application) {
            user = isValidObjectId ? await User.findById(id) : null;
            if (!user) user = await User.findOne({ uid: id });
            
            if (user) {
                application = await Application.findOne({ userId: user.uid }).sort({ createdAt: -1 }).populate('jobId');
            }
        }

        if (!application && !user && !forceStage) throw new Error('Candidate or Application not found');

        const name = application ? application.applicantName : (user ? user.name : "Candidate");
        const jobRole = application?.jobId?.title || 'an exciting new role';
        const state = forceStage || deriveCandidateState(application);
        const phone = application?.applicantPhone || (user?.phone || "+1234567890");

        console.log(`[STATE-AWARE-EXEC] Fetching data for ${name} | Stage: ${state}`);

        const identifier = application ? application._id.toString() : (user ? user._id.toString() : id);
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const twimlUrl = `${baseUrl}/api/voice-agent/twiml/${identifier}${forceStage ? '?stage=' + forceStage : ''}`;

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
            statusCallback: `${baseUrl}/api/voice-agent/status-callback/${identifier}`,
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
const generateTwiML = async (id, queryStage = null) => {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    let application = isValidObjectId ? await Application.findById(id).populate('jobId') : null;
    let user = null;
    
    if (!application) {
        user = isValidObjectId ? await User.findById(id) : null;
        if (!user) user = await User.findOne({ uid: id });
        
        if (user) {
            application = await Application.findOne({ userId: user.uid }).sort({ createdAt: -1 }).populate('jobId');
        }
    }

    const state = queryStage || deriveCandidateState(application);
    const name = application ? application.applicantName : (user ? user.name : "Candidate");
    const jobRole = application?.jobId?.title || 'an exciting new role';

    const aiDialogue = await generateDynamicPrompt({ name, jobRole, stage: state });

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // 🔊 2.3 Voice Engine (Currently using Polly as placeholder for ElevenLabs)
    // Note: To use ElevenLabs, you'd use <Play> with a pre-generated URL from ElevenLabs API.
    const voiceConfig = { voice: 'Polly.Matthew', language: 'en-US' };

    response.say(voiceConfig, aiDialogue);
    
    const identifier = application ? application._id.toString() : (user ? user._id.toString() : id);
    const gather = response.gather({
        input: 'speech',
        action: `${process.env.BASE_URL}/api/voice-agent/handle-response/${identifier}`,
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
const handleCallResponse = async (id, speechResult) => {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    let application = isValidObjectId ? await Application.findById(id) : null;
    let user = null;
    
    if (!application) {
        user = isValidObjectId ? await User.findById(id) : null;
        if (!user) user = await User.findOne({ uid: id });
        
        if (user) {
            application = await Application.findOne({ userId: user.uid }).sort({ createdAt: -1 });
        }
    }

    const state = deriveCandidateState(application);
    let actionStep = 'interview';
    if (state === 'skill_pending') actionStep = 'skill assessment';
    else if (state === 'resume_selected') actionStep = 'next steps';
    else if (state === 'applied') actionStep = 'application review';

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    const voiceConfig = { voice: 'Polly.Matthew', language: 'en-US' };
    
    const input = (speechResult || "").toLowerCase();
    
    if (input.includes('yes') || input.includes('sure') || input.includes('okay')) {
        response.say(voiceConfig, `Perfect. You can log into Hire1Percent.com using that link to start your ${actionStep}. Do you have any questions?`);
    } else if (input.includes('no') || input.includes('didn\'t') || input.includes('receive')) {
        response.say(voiceConfig, `No problem. You can log into Hire1Percent.com directly to find your ${actionStep}, or we can resend the link for you.`);
    } else if (input.includes('busy') || input.includes('later')) {
        response.say(voiceConfig, "I understand you're busy right now. I'll call you back later so we can discuss this. Have a great day!");
    } else {
        response.say(voiceConfig, `I understand. Please login to Hire1Percent.com whenever you're ready to proceed with your ${actionStep}. We look forward to seeing your progress!`);
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
