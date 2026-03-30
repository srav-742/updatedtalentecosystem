// backend/services/sessionManager.js

const sessions = new Map(); // In-memory; replace with Redis for production

function createSession(sessionId, agentRole, userId, resumeData = null) {
  const session = {
    sessionId,
    agentRole,
    userId,
    resumeData,           // Parsed `{ skills: [], projects: [], strength: [], weakness: [] }`
    messages: [],         // Full conversation history for Gemini
    evalHistory: [],      // History of per-question evaluations 
    questionCount: 0,
    startTime: Date.now(),
    isComplete: false
  };
  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function addMessage(sessionId, role, content, evaluation = null) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  session.messages.push({ role, content });
  if (role === 'assistant') {
      session.questionCount++;
      if (evaluation) session.evalHistory.push(evaluation);
  }
  return session;
}

function completeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) session.isComplete = true;
  return session;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { createSession, getSession, addMessage, completeSession, deleteSession };
