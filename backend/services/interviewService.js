// backend/services/interviewService.js
//
// HOW THIS WORKS:
// ─────────────────────────────────────────────────────────────────────────────
// 1. Every user gets a sessionId (pass it from your frontend).
// 2. We store the FULL message history in memory (sessions Map).
// 3. Every API call sends the complete history → model never forgets what it asked.
// 4. The model tags each question with [TOPIC_USED: ...] via the system prompt.
// 5. We extract that tag, store it in askedTopics[], and inject the list back
//    into the system prompt on the next call → double anti-repeat protection.
// 6. The [TOPIC_USED: ...] tag is stripped before sending text back to the UI.
// ─────────────────────────────────────────────────────────────────────────────

const agentConfigs = require('../config/agentConfigs');

// ─── In-memory session store ──────────────────────────────────────────────────
// Replace with Redis or a DB if you need persistence across server restarts.
const sessions = new Map();

function getSession(sessionId) {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            messages: [],       // full conversation history sent to Anthropic
            askedTopics: [],    // topics extracted from [TOPIC_USED: ...] tags
        });
    }
    return sessions.get(sessionId);
}

function clearSession(sessionId) {
    sessions.delete(sessionId);
}

// ─── Strip the hidden [TOPIC_USED: ...] tag from assistant replies ────────────
function extractAndStripTopic(text) {
    const match = text.match(/\[TOPIC_USED:\s*(.+?)\]/i);
    const topic = match ? match[1].trim() : null;
    const clean = text.replace(/\[TOPIC_USED:.*?\]/gi, '').trim();
    return { topic, clean };
}

// ─── Build the topics injection string appended to system prompt ──────────────
function buildTopicsBlock(askedTopics) {
    if (askedTopics.length === 0) {
        return '\n\n[ASKED_TOPICS: none yet — this is the first question]';
    }
    return (
        '\n\n[ASKED_TOPICS ALREADY COVERED — DO NOT ASK ABOUT THESE AGAIN]\n' +
        askedTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n') +
        '\nPick a completely fresh topic not on this list.'
    );
}

// ─── Main function: send a message and get a reply ────────────────────────────
async function sendMessage(sessionId, agentKey, userMessage) {
    const session = getSession(sessionId);
    const config = agentConfigs[agentKey];

    if (!config) {
        throw new Error(`Unknown agent key: "${agentKey}"`);
    }

    // 1. Add the user's message to history
    session.messages.push({ role: 'user', content: userMessage });

    // 2. Build system prompt = agent prompt + uniqueness rules (already in config)
    //    + live list of topics already asked this session
    const systemPrompt = config.systemPrompt + buildTopicsBlock(session.askedTopics);

    // 3. Call Anthropic API with FULL conversation history
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages: session.messages,   // ← full history, not just the latest message
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    const rawReply = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('');

    // 4. Extract [TOPIC_USED: ...] tag and clean the reply
    const { topic, clean } = extractAndStripTopic(rawReply);

    // 5. Save the CLEAN reply to history (no tags polluting future context)
    session.messages.push({ role: 'assistant', content: clean });

    // 6. Track the topic so the next call knows what to avoid
    if (topic && !session.askedTopics.includes(topic)) {
        session.askedTopics.push(topic);
    }

    // 7. Detect interview completion
    const isComplete = clean.includes('INTERVIEW_COMPLETE');

    return {
        reply: clean,
        isComplete,
        askedTopics: [...session.askedTopics],  // useful for debugging
    };
}

// ─── Start a fresh session (call this when user picks a role) ─────────────────
async function startInterview(sessionId, agentKey) {
    clearSession(sessionId);                        // wipe any previous session
    return sendMessage(sessionId, agentKey, 'Hello, I am ready to begin the interview.');
}

module.exports = { startInterview, sendMessage, clearSession };