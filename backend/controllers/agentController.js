// backend/controllers/agentController.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");
const agentConfigs = require("../config/agentConfigs");
const sessionManager = require("../services/sessionManager");
const { generateSpeech } = require("../services/tts.service");
const { callInterviewAI } = require("../utils/aiClients");
const pdfParse = require("pdf-parse");

// Mapping of agent roles to suitable podcast-host/conversational voices
const AGENT_VOICE_MAP = {
  ai_engineer: "professional_interviewer",
  business_development: "professional_interviewer",
  product_manager: "professional_interviewer",
  data_scientist: "professional_interviewer",
  sales_executive: "professional_interviewer",
  frontend_engineer: "professional_interviewer",
  backend_engineer: "professional_interviewer",
  devops_engineer: "professional_interviewer",
  ux_designer: "professional_interviewer",
  marketing_manager: "professional_interviewer",
  hr_manager: "professional_interviewer",
  finance_analyst: "professional_interviewer",
  cybersecurity_analyst: "professional_interviewer"
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = "gemini-flash-latest"; // Fast and supports JSON mode well

// Helper to build the generation config for JSON
const getJsonConfig = (maxTokens = 1000) => ({
  temperature: 0.2,
  maxOutputTokens: maxTokens,
  responseMimeType: "application/json",
});

// Helper to clean markdown block and extract JSON
const cleanJson = (str) => {
  if (!str) return "";
  let cleaned = str.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) cleaned = match[1];
  }

  // Find the first '{' and last '}' to handle conversational filler
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  // Final cleanup of common artifacts
  return cleaned.trim().replace(/^[^{]*/, "").replace(/[^}]*$/, "");
};

// POST /api/agent/start
async function startSession(req, res) {
  try {
    const { agentRole, userId, resumeBase64, resumeText: rawResumeText } = req.body;

    if (!agentConfigs[agentRole]) {
      return res.status(400).json({ error: `Unknown agent role: ${agentRole}` });
    }

    let extractedResumeText = rawResumeText || "";

    // If PDF base64 is provided, parse it
    if (resumeBase64 && !extractedResumeText) {
       try {
         const parts = resumeBase64.split(",");
         const base64Data = parts.length > 1 ? parts[1] : parts[0];
         const buffer = Buffer.from(base64Data, 'base64');
         const pdfData = await pdfParse(buffer);
         extractedResumeText = pdfData.text;
       } catch (err) {
         console.warn("Failed to parse PDF resume:", err.message);
       }
    }

    let parsedResumeData = null;
    const modelOptions = genAI.getGenerativeModel({ model: modelName });

    if (extractedResumeText && extractedResumeText.length > 50) {
      const resumePrompt = `
        You are an expert technical recruiter analyzing a resume. 
        Extract the following strictly in JSON format:
        {
          "skills": ["skill1", "skill2", "..."],
          "projects": ["brief desc of project 1", "brief desc of project 2"],
          "strength": ["perceived strong area 1"],
          "weakness": ["perceived weak area 1"]
        }
        Resume Content:
        ${extractedResumeText.substring(0, 15000)}
      `;
      try {
        const jsonText = await callInterviewAI(resumePrompt, 1000, true);
        if (jsonText) {
          parsedResumeData = JSON.parse(cleanJson(jsonText));
        }
      } catch (err) {
        console.warn("Failed to analyze resume with AI:", err.message);
      }
    }

    const sessionId = uuidv4();
    const sessionSeed = Math.floor(Math.random() * 1000000);
    const styles = ["Socratic", "Scenario-based", "Direct & Technical", "Pressure Test", "Growth-oriented"];
    const interviewStyle = styles[sessionSeed % styles.length];

    sessionManager.createSession(sessionId, agentRole, userId, parsedResumeData);
    const session = sessionManager.getSession(sessionId);
    session.sessionSeed = sessionSeed;
    session.interviewStyle = interviewStyle;
    session.voice = AGENT_VOICE_MAP[agentRole] || "podcast_host";

    const config = agentConfigs[agentRole];
    
    let baseContext = `CRITICAL POSITION IDENTIFICATION: You are conducting a technical interview for the role of ${config.role}. Every question MUST be specific to ${config.role} competencies.`;
    if (parsedResumeData) {
      baseContext += `\n\nCANDIDATE RESUME PROFILE:\n- Skills: ${parsedResumeData.skills?.join(', ') || 'N/A'}\n- Projects: ${parsedResumeData.projects?.join(' | ') || 'N/A'}\n- Strengths: ${parsedResumeData.strength?.join(', ') || 'N/A'}\n- Weaknesses: ${parsedResumeData.weakness?.join(', ') || 'N/A'}\n\nSTRATEGY: Bridge the candidate's background into the ${config.role} requirements. If their resume is in a different field, ask how they will adapt their skills to ${config.role} challenges.`;
    }

    const systemPrompt = config.systemPrompt + "\n\n" + baseContext + `\n\nINTERVIEW GUIDELINES:
1. This is a 10-question deep-dive technical interview.
2. Current Question Number: 1.
3. Session Seed: ${sessionSeed} (Use this to ensure a unique interview path).
4. Interview Style: ${interviewStyle}.
5. You MUST ask exactly ONE question. 
6. ROLE-SPECIFIC: Every question must be deeply related to the ${config.role} role.
7. NO GENERICISMS: Never ask "Tell me more about your experience" or "Elaborate on your role". Instead, pick a specific technology or project mentioned and ask a "How" or "Why" question.
8. Be professional, challenging, and technical.

RULES FOR JSON OUTPUT (STRICT):
You MUST reply ONLY in JSON format matching exactly this structure:
{
  "evaluation": {
    "score": 5,
    "confidence": "medium",
    "feedback": "Briefly describe how well they answered the previous point",
    "next_focus": "The specific technical or behavioral area you will target next"
  },
  "question": "Your actual question to the candidate",
  "is_complete": false
}
STRICT RULES:
1. OUTPUT ONLY THE JSON payload.
2. No conversational filler before or after the JSON.
3. If this is the FIRST message, set evaluation to null. 
4. After exactly 10 questions, set is_complete to true.`;

    const interviewModel = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemPrompt 
    });

    // Initialize conversation
    const messages = [
      { role: "user", parts: [{ text: "Start the interview." }] }
    ];

    let jsonResponse = { question: "", is_complete: false };
    let rawText = "";

    try {
      rawText = await callInterviewAI("Start the interview.", 1000, true, systemPrompt);
      if (!rawText) throw new Error("No response from AI providers");

      const cleaned = cleanJson(rawText);
      jsonResponse = JSON.parse(cleaned);
    } catch(err) {
      console.warn("Start session AI failure:", err.message);
      const questionMatch = rawText && rawText.match(/"question":\s*"([^"]+)"/);
      
      jsonResponse = { 
        question: questionMatch ? questionMatch[1] : `Hello! I'm your ${config.role} interviewer. To get started, could you please introduce yourself and tell me about your background in this field?`, 
        is_complete: false 
      };
    }

    const assistantMessage = jsonResponse.question || "Let's begin the interview!";

    // Generate audio
    let audioBase64 = null;
    try {
      const audioBuffer = await generateSpeech(assistantMessage, session.voice);
      if (audioBuffer) audioBase64 = audioBuffer.toString("base64");
    } catch (err) {
      console.warn("TTS generation failed:", err.message);
    }

    sessionManager.addMessage(sessionId, "user", "Start the interview.");
    sessionManager.addMessage(sessionId, "assistant", assistantMessage, jsonResponse.evaluation);

    return res.json({
      sessionId,
      agentRole,
      roleName: config.role,
      message: assistantMessage,
      audio: audioBase64,
      resumeParsed: !!parsedResumeData
    });

  } catch (err) {
    console.error("startSession error:", err.message);
    res.status(500).json({ error: "Failed to start interview session", detail: err.message });
  }
}

// POST /api/agent/respond
async function respondToAgent(req, res) {
  try {
    const { sessionId, userMessage } = req.body;

    const session = sessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.isComplete) return res.status(400).json({ error: "Session already complete" });

    const config = agentConfigs[session.agentRole];
    sessionManager.addMessage(sessionId, "user", userMessage);

    let baseContext = `CRITICAL POSITION IDENTIFICATION: You are conducting a technical interview for the role of ${config.role}. Every question MUST be specific to ${config.role} competencies.`;
    if (session.resumeData) {
      baseContext += `\nCANDIDATE INFO: ${JSON.stringify(session.resumeData)}\nSTRATEGY: Focus on ${config.role} specific challenges.`;
    }
    
    const currentQuestionCount = (session.messages.filter(m => m.role === 'assistant').length) + 1;
    // We want exactly 10 questions to be ANSWERED. 
    // So if currentQuestionCount is 10, we are asking the 10th question. 
    // We only set isComplete to true on the turn AFTER the 10th question is answered (i.e. count 11).
    const isLastTurn = currentQuestionCount > 10;
    const sessionSeed = (session.sessionSeed || 123) + currentQuestionCount + Date.now();
    const interviewStyle = session.interviewStyle || "Technical";

    const systemPrompt = config.systemPrompt + "\n\n" + baseContext + `\n\nINTERVIEW GUIDELINES:
1. This is a 10-question deep-dive technical interview.
2. Current Question Number: ${currentQuestionCount}/10.
3. Session Seed: ${sessionSeed}.
4. Interview Style: ${interviewStyle}.
5. You MUST ask exactly ONE question. 
6. ROLE-SPECIFIC: Every question must be deeply related to the ${config.role} role.
7. NO REPETITION: Look at the previous questions. DO NOT repeat topics. If you already discussed a project, move to a system design or a theoretical concept.
8. NO GENERICISMS: Never ask "Tell me more about your experience" or "Elaborate on your role". Instead, pick a specific technology or project mentioned and ask a "How" or "Why" question.
9. FINAL TURN: If Current Question Number is 10, this is the ABSOLUTE LAST question.
10. COMPLETION: If Current Question Number is greater than 10, set is_complete to true and STOP asking questions.

CRITICAL UNIQUENESS RULE:
Avoid any topic already covered in: ${session.messages.filter(m => m.role === 'assistant').slice(-3).map(m => m.content.substring(0, 80)).join(' | ')}


RULES FOR JSON OUTPUT (STRICT):
You MUST reply ONLY in JSON format matching exactly this structure:
{
  "evaluation": {
    "score": 7,
    "confidence": "high",
    "feedback": "Critique the candidate's last response",
    "next_focus": "What technical concept you are moving to next"
  },
  "question": "Your actual question to the candidate",
  "is_complete": ${isLastTurn}
}
STRICT RULES:
1. OUTPUT ONLY THE JSON payload.
2. Do not use conversational filler.
3. CONCISE: Keep the "question" string under 40 words.
4. UNIQUNESS: Ensure this question is distinct from all previous questions in the history.`;

    const interviewModel = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemPrompt
    });

    let jsonResponse = { question: "", is_complete: false };
    let rawText = "";

    try {
      const recentMessages = session.messages.slice(-4);
      const prompt = `Recent conversation:\n${recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}\n\nUSER_MESSAGE: ${userMessage}`;
      rawText = await callInterviewAI(prompt, 500, true, systemPrompt);
      
      if (!rawText) throw new Error("No response from AI providers");

      const cleaned = cleanJson(rawText);
      jsonResponse = JSON.parse(cleaned);
      
      if (!jsonResponse.question && jsonResponse.evaluation?.next_focus) {
          jsonResponse.question = jsonResponse.evaluation.next_focus;
      }
    } catch(err) {
      console.warn("Respond AI failure (Using Adaptive Fallbacks):", err.message);
      
      const questionMatch = rawText && rawText.match(/"question":\s*"([^"]+)"/);
      
      // Build a dynamic pool based on resume if available
      const skills = session.resumeData?.skills || ["software architecture", "best practices", "performance", "security"];
      const projects = session.resumeData?.projects || ["your recent implementation", "the core system"];
      const randomSkill = skills[Math.floor(Math.random() * skills.length)];
      const randomProject = projects[Math.floor(Math.random() * projects.length)];

      const adaptiveFallbacks = [
        `That's insightful. From a ${config.role} perspective, can you walk me through the technical implementation details of how you'd apply ${randomSkill}?`,
        `I see your point. How would you handle the scalability and performance optimization of ${randomProject} as a ${config.role}?`,
        `Could you go deeper into the specific tools and frameworks you'd use for ${randomSkill} in this role?`,
        `Very interesting. What are the potential security or reliability risks when using ${randomSkill} for ${randomProject}?`,
        `As a ${config.role}, how do you ensure ${randomSkill} integrates seamlessly with the rest of the stack?`,
        `Can you describe a high-pressure situation where you had to debug an issue related to ${randomSkill}?`,
        `In your opinion, what is the biggest challenge in scaling ${randomProject} for a global user base?`,
        `How do you stay updated with the latest advancements in ${randomSkill} as it relates to ${config.role} work?`
      ];
      
      const randomFallback = adaptiveFallbacks[Math.floor(Math.random() * adaptiveFallbacks.length)];
      
      jsonResponse = { 
        question: questionMatch ? questionMatch[1] : randomFallback, 
        is_complete: isLastTurn || currentQuestionCount >= 11
      };
    }

    console.log(`[AGENT] Session: ${sessionId} | Question: ${currentQuestionCount}/10 | LastTurn: ${isLastTurn}`);

    // CRITICAL: Force completion if we've exceeded the limit
    const isComplete = jsonResponse.is_complete || isLastTurn;

    const rawAssistantMessage = jsonResponse.question || jsonResponse.message || (isComplete ? "Thank you for your time. This concludes our interview." : "Can you elaborate on that?");
    const assistantMessage = rawAssistantMessage.replace(/Here is the JSON.*?(\{|:)/gi, "").replace(/json payload|bracket|curly brace/gi, "").trim() || (isComplete ? "Thank you for your time." : "Can you tell me more about that?");

    sessionManager.addMessage(sessionId, "assistant", assistantMessage, jsonResponse.evaluation);

    let audioBase64 = null;
    try {
      const audioBuffer = await generateSpeech(assistantMessage, session.voice);
      if (audioBuffer) audioBase64 = audioBuffer.toString("base64");
    } catch (err) {
      console.warn("TTS generation failed:", err.message);
    }

    if (isComplete) sessionManager.completeSession(sessionId);

    return res.json({
      message: assistantMessage,
      isComplete,
      questionCount: session.questionCount,
      audio: audioBase64,
      evaluation_snapshot: jsonResponse.evaluation
    });

  } catch (err) {
    console.error("respondToAgent error:", err.message);
    res.status(500).json({ error: "Failed to process response", detail: err.message });
  }
}

// POST /api/agent/evaluate
async function getEvaluation(req, res) {
  try {
    const { sessionId } = req.body;

    const session = sessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const config = agentConfigs[session.agentRole];

    const evalPrompt = `The mock interview for ${config.role} is now finished. Generate a comprehensive final report.
Here is the tracking history of their performance per question: ${JSON.stringify(session.evalHistory.filter(e => e))}

Provide the detailed evaluation strictly in JSON format matching this EXACT structure:
{
  "overallScore": 8.5,
  "summary": "Short 2-3 sentence executive summary of performance.",
  "categories": [
    { "label": "Technical Depth", "score": 8, "feedback": "One line explanation" },
    { "label": "System Thinking", "score": 7, "feedback": "One line explanation" },
    { "label": "Communication", "score": 9, "feedback": "One line explanation" },
    { "label": "Problem Solving", "score": 8, "feedback": "One line explanation" }
  ],
  "strengths": ["list point 1", "list point 2"],
  "improvements": ["list point 1", "list point 2"],
  "suggested_learning_path": ["actionable advice 1", "actionable advice 2", "actionable advice 3"]
}
Rubric categories to use: ${JSON.stringify(config.evaluationRubric)}`;

    const fullHistory = session.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const prompt = `Full Interview History:\n${fullHistory}\n\nINSTRUCTION: ${evalPrompt}`;

    let evalData = null;
    try {
      const evalResult = await callInterviewAI(prompt, 2000, true, config.systemPrompt);
      if (evalResult) {
        evalData = JSON.parse(cleanJson(evalResult));
      }
    } catch (aiErr) {
      console.warn("AI Evaluation failed, using local fallback calculation:", aiErr.message);
    }
    
    // HARD FALLBACK: Calculate from history if AI fails
    if (!evalData) {
      const history = session.evalHistory.filter(e => e && typeof e.score === 'number');
      const avgScore = history.length > 0 
        ? Number((history.reduce((s, e) => s + e.score, 0) / history.length).toFixed(1))
        : 5.0;

      evalData = {
        overallScore: avgScore,
        summary: `Interview completed for ${config.role}. Based on ${history.length} evaluated responses, the candidate demonstrated a consistent technical foundation.`,
        categories: [
          { label: "Technical Depth", score: avgScore, feedback: "Calculated from session history." },
          { label: "System Thinking", score: Math.max(0, avgScore - 1), feedback: "Automated baseline." },
          { label: "Communication", score: Math.min(10, avgScore + 1), feedback: "Interaction quality analysis." },
          { label: "Problem Solving", score: avgScore, feedback: "Direct response evaluation." }
        ],
        strengths: ["Consistent participation", "Technical engagement"],
        improvements: ["Deepen architectural explanations", "Provide more specific examples"],
        suggested_learning_path: ["Review core documentation", "Practice system design", "Build hands-on projects"]
      };
    }

    return res.json({
      evaluation: JSON.stringify(evalData),
      role: config.role,
      totalQuestions: session.questionCount,
      duration: Math.round((Date.now() - session.startTime) / 60000) + " minutes",
      transcript: session.messages,
      perQuestionEval: session.evalHistory
    });

  } catch (err) {
    console.error("getEvaluation error:", err.message);
    res.status(500).json({ error: "Failed to generate evaluation", detail: err.message });
  }
}

// GET /api/agent/roles
function getAvailableRoles(req, res) {
  try {
    const roles = Object.entries(agentConfigs).map(([key, config]) => ({
      key,
      role: config.role
    }));
    return res.json({ roles });
  } catch (err) {
    console.error("getAvailableRoles error:", err.message);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
}

// POST /api/agent/terminate
function terminateSession(req, res) {
  try {
    const { sessionId, reason } = req.body;
    console.log(`[AGENT-TERMINATE] Session ${sessionId} closed. Reason: ${reason || 'User ended session'}`);
    
    // We don't necessarily delete the session immediately to allow for final evaluation if needed,
    // but we can mark it as complete.
    const session = sessionManager.getSession(sessionId);
    if (session) {
        session.isComplete = true;
    }

    return res.json({ success: true, message: "Session terminated" });
  } catch (err) {
    console.error("terminateSession error:", err.message);
    res.status(500).json({ error: "Failed to terminate session" });
  }
}

module.exports = { startSession, respondToAgent, getEvaluation, getAvailableRoles, terminateSession };
