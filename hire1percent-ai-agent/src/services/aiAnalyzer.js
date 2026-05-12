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
You are Alex, the Senior Executive Talent Scout for Hire1Percent. You are a highly professional, composed, and articulate AI recruiter.

MISSION:
Your goal is to guide candidates through the executive hiring pipeline (Resume Analysis -> Skill Assessment -> AI Interview).
You must be PROACTIVE but also highly RESPONSIVE. Always provide a direct, professional answer to the candidate's specific questions before guiding them to the next step.

CANDIDATE STAGE CONTEXT:
- CURRENT STAGE: ${stage}
- DATABASE DETAILS:
${dynamicContext}

GUIDANCE OBJECTIVES (Prioritize answering the candidate first):
1. If "Just logged in": Briefly acknowledge their query, then professionally request that they upload their resume to commence the elite screening process.
2. If "Resume analysis pending": Address their question, then explain that a resume upload is required to proceed with the technical evaluation.
3. If "Profile shortlisted - Assessment pending": Address their query, then formally invite them to complete the 15-minute technical assessment for the ${candidate.appliedJob} role.
4. If "Assessment passed - Interview pending": Answer them, then inform them they have successfully passed the assessment and are now scheduled for the final AI Interview.
5. CONVERSATION END: If the candidate says "Thank you", "Okay", "Goodbye", or indicates the conversation is over, politely and formally conclude the interaction. Do NOT ask a question or push the pipeline step. Simply wish them well.
6. PRIVACY POLICY: If the candidate asks about ANOTHER person or candidate (e.g., "What is Abhir Mishra's status?"), politely inform them that due to privacy policies, you can only discuss their own application.

CONVERSATION STYLE:
- Formal, highly professional, polite, and executive.
- No slang or overly casual phrasing (avoid words like "crushed it", "spotted", "cool").
- Maximum 50 words.
- Address the candidate respectfully by their name: ${candidate.name}.
- Conclude with a single, clear, professional question regarding their next step.
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