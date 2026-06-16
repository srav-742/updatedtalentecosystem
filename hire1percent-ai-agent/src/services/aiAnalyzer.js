const Groq = require("groq-sdk");
const getCandidateStatus = require("./candidateTracker");
const conversations = require("../data/conversations");
const buildContext = require("./contextBuilder");
const Job = require("../models/Job");
const ConversationLog = require("../models/Conversation");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateConversationalResponse = async (candidate, userMessage = "") => {
    try {
        if (!userMessage) userMessage = "status";

        const candidateId = candidate._id.toString();
        const job = await Job.findOne({ title: candidate.appliedJob });
        const dynamicContext = buildContext(candidate, job);
        const stage = getCandidateStatus(candidate);

        if (!conversations[candidateId]) {
            conversations[candidateId] = [];
        }
        const history = conversations[candidateId];

        // Format history for Groq (role: "user" or "assistant")
        const recentMessages = history.slice(-6).map(msg => ({
            role: msg.role === "model" ? "assistant" : "user",
            content: msg.parts ? msg.parts[0].text : (msg.content || "")
        }));

        const systemPrompt = `
You are Alex, a warm, professional, and articulate Senior Executive Talent Scout for Hire1Percent. You are speaking with the candidate over a live voice phone call.

MISSION:
Your goal is to guide candidate ${candidate.name} through our elite hiring pipeline (Resume Analysis -> Skill Assessment -> AI Interview).
Always act like a real, helpful human recruiter. Speak naturally and warmly. Do NOT sound like a rigid automated assistant or a gatekeeper.

REAL-TIME DATABASE CONTEXT:
- CANDIDATE STAGE: ${stage}
- DATABASE DETAILS:
${dynamicContext}

CONVERSATIONAL RULES & GUIDANCE:
1. RESPONSE FIRST: Fully and warmly answer any questions the candidate asks about the role, required skills, company, or selection process. Use the Job Description and Required Skills in the database details above to provide rich, informative answers. Do NOT withhold information or say "I will explain after you upload your resume".
2. PIPELINE PROGRESSION:
   - If their resume is not yet uploaded/analyzed: Inform them they can upload their resume on the web portal at their convenience. Do not nag them. Ask if they have any questions about the role or company first.
   - If their resume is analyzed and they are shortlisted: Invite them to take their online technical assessment.
   - If they have passed the assessment: Congratulate them and discuss scheduling their AI Interview.
3. CONVERSATION FLOW:
   - Speak in short, clear sentences suitable for a voice call.
   - Address the candidate by their name: ${candidate.name}.
   - Keep answers concise (maximum 65 words) to ensure they are easy to listen to.
   - Conclude your turns with a single, friendly question that keeps the conversation moving naturally.
   - If they are saying goodbye or thank you, politely and formally wrap up the call without prompting for next steps.
`;

        console.log(`--- AI Interaction [Candidate: ${candidate.name}] ---`);
        console.log(`Stage: ${stage}`);
        console.log(`User Message: "${userMessage}"`);

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                ...recentMessages,
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5, // Lower temperature for more professional, deterministic tone
            max_tokens: 150,
        });

        const aiResponse = chatCompletion.choices[0].message.content;
        console.log(`AI Response: "${aiResponse}"`);

        // Save to MongoDB
        await ConversationLog.create({
            candidateId: candidate._id,
            role: "user",
            text: userMessage
        });
        await ConversationLog.create({
            candidateId: candidate._id,
            role: "assistant",
            text: aiResponse
        });

        // Update in-memory history
        history.push({ role: "user", parts: [{ text: userMessage }] });
        history.push({ role: "model", parts: [{ text: aiResponse }] });

        return aiResponse;

    } catch (error) {
        console.error("Groq Generation Error:", error.message);

        // --- FALLBACK SYSTEM ---
        const stage = getCandidateStatus(candidate);
        if (stage === "Just logged in") return `Hello ${candidate.name}. I see you have joined our platform. To proceed with the Top 1% evaluation, please upload your resume. Shall I assist you with that?`;
        if (stage.includes("shortlisted")) return `Congratulations, ${candidate.name}. Your profile meets our initial criteria for the ${candidate.appliedJob} role. Please proceed to the technical assessment when you are ready.`;
        
        return `Hello ${candidate.name}, you are currently advancing in the ${candidate.appliedJob} pipeline. Your next required action is indicated on your dashboard. Do you require any clarification?`;
    }
};

module.exports = generateConversationalResponse;