// backend/controllers/agentController.js

const Groq = require("groq-sdk");
const { v4: uuidv4 } = require("uuid");
const agentConfigs = require("../config/agentConfigs");
const sessionManager = require("../services/sessionManager");
const { generateSpeech } = require("../services/tts.service");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/agent/start
async function startSession(req, res) {
  try {
    const { agentRole, userId } = req.body;

    if (!agentConfigs[agentRole]) {
      return res.status(400).json({ error: `Unknown agent role: ${agentRole}` });
    }

    const sessionId = uuidv4();
    sessionManager.createSession(sessionId, agentRole, userId);

    const config = agentConfigs[agentRole];

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        { role: "system", content: config.systemPrompt },
        { role: "user", content: "Start the interview." }
      ]
    });

    const assistantMessage = response.choices[0].message.content;

    // Generate audio
    let audioBase64 = null;
    try {
      const audioBuffer = await generateSpeech(assistantMessage);
      if (audioBuffer) audioBase64 = audioBuffer.toString("base64");
    } catch (err) {
      console.warn("TTS generation failed:", err.message);
    }

    sessionManager.addMessage(sessionId, "user", "Start the interview.");
    sessionManager.addMessage(sessionId, "assistant", assistantMessage);

    return res.json({
      sessionId,
      agentRole,
      roleName: config.role,
      message: assistantMessage,
      audio: audioBase64
    });

  } catch (err) {
    console.error("startSession error:", err.message);
    res.status(500).json({
      error: "Failed to start interview session",
      detail: err.message
    });
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

    // add user message to session history
    sessionManager.addMessage(sessionId, "user", userMessage);

    // build full messages array with system prompt + entire history
    const messages = [
      { role: "system", content: config.systemPrompt },
      ...session.messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }))
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 800,
      temperature: 0.7,
      messages
    });

    const assistantMessage = response.choices[0].message.content;
    sessionManager.addMessage(sessionId, "assistant", assistantMessage);

    // Generate audio
    let audioBase64 = null;
    try {
      const audioBuffer = await generateSpeech(assistantMessage);
      if (audioBuffer) audioBase64 = audioBuffer.toString("base64");
    } catch (err) {
      console.warn("TTS generation failed:", err.message);
    }

    // check if interview finished
    const isComplete = assistantMessage.includes("INTERVIEW_COMPLETE");
    if (isComplete) sessionManager.completeSession(sessionId);

    return res.json({
      message: assistantMessage,
      isComplete,
      questionCount: session.questionCount,
      audio: audioBase64
    });

  } catch (err) {
    console.error("respondToAgent error:", err.message);
    res.status(500).json({
      error: "Failed to process response",
      detail: err.message
    });
  }
}

// POST /api/agent/evaluate
async function getEvaluation(req, res) {
  try {
    const { sessionId } = req.body;

    const session = sessionManager.getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const config = agentConfigs[session.agentRole];

    const evalPrompt = `The interview is now finished. Please provide a detailed evaluation in JSON format only.
Expected JSON structure:
{
  "overallScore": 8.5,
  "summary": "Short 2-sentence summary of performance.",
  "categories": [
    { "label": "Technical Depth", "score": 8, "feedback": "One line explanation" },
    ... (include all 4 categories from your rubric)
  ],
  "strengths": ["list point 1", "list point 2"],
  "improvements": ["list point 1", "list point 2"]
}
Do not include any text, headers, or markdown formatting outside the JSON block.`;

    const messages = [
      { role: "system", content: config.systemPrompt },
      ...session.messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      })),
      { role: "user", content: evalPrompt }
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      temperature: 0.5,
      messages
    });

    const evalMessage = response.choices[0].message.content;

    // Generate audio for evaluation conclusion maybe?
    // Or just return text. Usually eval is long so TTS might be too much.
    // Let's keep it simple for now, but generated if wanted.

    return res.json({
      evaluation: evalMessage,
      role: config.role,
      totalQuestions: session.questionCount,
      duration: Math.round((Date.now() - session.startTime) / 60000) + " minutes"
    });

  } catch (err) {
    console.error("getEvaluation error:", err.message);
    res.status(500).json({
      error: "Failed to generate evaluation",
      detail: err.message
    });
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

module.exports = { startSession, respondToAgent, getEvaluation, getAvailableRoles };