// backend/controllers/agentController.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { v4: uuidv4 } = require("uuid");
const agentConfigs = require("../config/agentConfigs");
const sessionManager = require("../services/sessionManager");
const { generateSpeech } = require("../services/tts.service");
const pdfParse = require("pdf-parse");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = "gemini-flash-latest"; // Fast and supports JSON mode well

// Helper to build the generation config for JSON
const getJsonConfig = (maxTokens = 250) => ({
  temperature: 0.7,
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
  
  return cleaned.trim();
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
      // Parse resume using Gemini
      const resumePrompt = `
        You are an expert technical recruiter analyzing a resume. 
        Extract the following strictly in JSON format:
        {
          "skills": ["skill1", "skill2", "..."],
          "projects": ["brief desc of project 1", "brief desc of project 2"],
          "strength": ["perceived strong area 1"],
          "weakness": ["perceived weak area 1"]
        }
        Do not include any extra text. Resume Content:
        ${extractedResumeText.substring(0, 15000)}
      `;
      try {
        const resumeAnalysisResult = await modelOptions.generateContent({
           contents: [{ role: "user", parts: [{ text: resumePrompt }] }],
           generationConfig: getJsonConfig(800) // allow more tokens for resume parsing
        });
        const jsonText = cleanJson(resumeAnalysisResult.response.text());
        parsedResumeData = JSON.parse(jsonText);
      } catch (err) {
        console.warn("Failed to analyze resume with Gemini:", err.message);
      }
    }

    const sessionId = uuidv4();
    sessionManager.createSession(sessionId, agentRole, userId, parsedResumeData);

    const config = agentConfigs[agentRole];
    
    let baseContext = `You are a senior ${config.role} interviewer.`;
    if (parsedResumeData) {
      baseContext += `\n\nCANDIDATE RESUME PROFILE:\n- Skills: ${parsedResumeData.skills?.join(', ') || 'N/A'}\n- Projects: ${parsedResumeData.projects?.join(' | ') || 'N/A'}\n- Strengths: ${parsedResumeData.strength?.join(', ') || 'N/A'}\n- Weaknesses: ${parsedResumeData.weakness?.join(', ') || 'N/A'}\n\nSTRATEGY: Base questions heavily on their actual resume, adapting to their specific skills and listed projects. Test weaknesses starting with fundamentals, and push deeper on strengths.`;
    }

    const systemPrompt = config.systemPrompt + "\n\n" + baseContext + `\n\nINTERVIEW GUIDELINES:
1. This is a 10-question deep-dive interview.
2. Current Question Number: 1.
3. You MUST ask exactly ONE question related to the candidate's background or the role requirements.
4. Be professional, slightly challenging, and adaptive.

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

    const response = await interviewModel.generateContent({
       contents: messages,
       generationConfig: getJsonConfig()
    });

    let jsonResponse;
    try {
      const rawText = response.response.text();
      jsonResponse = JSON.parse(cleanJson(rawText));
    } catch(e) {
      console.warn("Start session JSON parse failed, using fallback");
      jsonResponse = { question: "Hello, let's begin the interview. Could you start by introducing yourself?", is_complete: false };
    }

    const assistantMessage = jsonResponse.question || "Let's begin the interview!";

    // Generate audio
    let audioBase64 = null;
    try {
      const audioBuffer = await generateSpeech(assistantMessage);
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

    let baseContext = `You are a senior ${config.role} interviewer.`;
    if (session.resumeData) {
      baseContext += `\nCANDIDATE INFO: ${JSON.stringify(session.resumeData)}`;
    }
    
    const currentQuestionCount = (session.messages.filter(m => m.role === 'assistant').length) + 1;
    const isLastQuestion = currentQuestionCount >= 10;

    const systemPrompt = config.systemPrompt + "\n\n" + baseContext + `\n\nINTERVIEW GUIDELINES:
1. This is a 10-question deep-dive interview.
2. Current Question Number: ${currentQuestionCount}.
3. You MUST ask exactly ONE question. 
4. If this is question 10, set is_complete to true after asking the question.
5. Be progressively more challenging. If the candidate answers well, go deeper into technical implementation details.

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
  "is_complete": ${isLastQuestion}
}
STRICT RULES:
1. OUTPUT ONLY THE JSON payload.
2. Do not use conversational filler.
3. CONCISE: Keep the "question" string under 30 words.`;

    const interviewModel = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemPrompt
    });

    const contents = [];
    session.messages.forEach(m => {
       const role = m.role === "assistant" ? "model" : "user";
       contents.push({ role, parts: [{ text: m.content }] });
    });

    const response = await interviewModel.generateContent({
       contents,
       generationConfig: getJsonConfig()
    });

    let jsonResponse;
    try {
      const rawText = response.response.text();
      const cleaned = cleanJson(rawText);
      jsonResponse = JSON.parse(cleaned);
      
      // Secondary check: if AI put the question inside evaluation or elsewhere
      if (!jsonResponse.question && jsonResponse.evaluation?.next_focus) {
          jsonResponse.question = jsonResponse.evaluation.next_focus;
      }
    } catch(e) {
      console.warn("Respond JSON parse failed, extracting best effort");
      const rawText = response.response.text();
      // Try to find anything that looks like a question if JSON fails
      const questionMatch = rawText.match(/"question":\s*"([^"]+)"/);
      if (questionMatch) {
          jsonResponse = { question: questionMatch[1], is_complete: false };
      } else {
          jsonResponse = { question: "Can you elaborate on your experience with this role?", is_complete: false };
      }
    }

    const assistantMessage = jsonResponse.question || jsonResponse.message || "Can you elaborate on that?";
    const isComplete = jsonResponse.is_complete || false;

    sessionManager.addMessage(sessionId, "assistant", assistantMessage, jsonResponse.evaluation);

    let audioBase64 = null;
    try {
      const audioBuffer = await generateSpeech(assistantMessage);
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
    const modelOptions = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: config.systemPrompt 
    });

    const evalPrompt = `The mock interview is now finished. Generate a comprehensive final report.
Here is the tracking history of their performance per question: ${JSON.stringify(session.evalHistory.filter(e => e))}

Provide the detailed evaluation strictly in JSON format matching this EXACT structure:
{
  "overallScore": 8.5,
  "summary": "Short 2-3 sentence executive summary of performance.",
  "categories": [
    { "label": "Technical Depth", "score": 8, "feedback": "One line explanation" },
    ... (include all 4 categories from the rubric)
  ],
  "strengths": ["list point 1", "list point 2"],
  "improvements": ["list point 1", "list point 2"],
  "suggested_learning_path": ["actionable advice 1", "actionable advice 2", "actionable advice 3"]
}
Rubric categories to use: ${JSON.stringify(config.evaluationRubric)}`;

    const contents = [];
    session.messages.forEach(m => {
       const role = m.role === "assistant" ? "model" : "user";
       contents.push({ role, parts: [{ text: m.content }] });
    });
    
    contents.push({ role: "user", parts: [{ text: evalPrompt }] });

    const response = await modelOptions.generateContent({
       contents,
       generationConfig: getJsonConfig(1000) // Detailed evaluation needs more tokens
    });

    const evalMessage = cleanJson(response.response.text());

    return res.json({
      evaluation: evalMessage,
      role: config.role,
      totalQuestions: session.questionCount,
      duration: Math.round((Date.now() - session.startTime) / 60000) + " minutes"
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