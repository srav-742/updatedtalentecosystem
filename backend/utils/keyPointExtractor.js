/**
 * ─── Key Point Extractor Utility ────────────────────────────────────────────
 *
 * PURPOSE:
 *   Analyzes a candidate's spoken answer in real-time to extract specific
 *   key points. Validates each key point for specificity, relevance, and
 *   accuracy, then returns a decision: ask a follow-up about a valid key
 *   point, or skip to a brand-new topic.
 *
 * USED BY: keyPointInterceptor.js (the /next-fast interceptor)
 *
 * ISOLATION:
 *   This file is 100% self-contained. It only depends on the shared
 *   aiClients utility (callInterviewAI / safeParseAIJson).
 * ────────────────────────────────────────────────────────────────────────────
 */

const { callInterviewAI, safeParseAIJson } = require('./aiClients');

/**
 * Extract key points from a candidate's answer and decide whether to follow up.
 *
 * @param {string} questionText   - The interview question that was asked
 * @param {string} answerText     - The candidate's spoken answer (transcribed)
 * @param {object} jobContext     - { jobTitle, jobDescription, jobSkills, roleCategory, isTech }
 * @returns {object|null}         - { keyPoints, decision, followUpTarget, followUpHint } or null on failure
 */
async function extractAndValidateKeyPoints(questionText, answerText, jobContext) {
    // Guard: skip extraction for empty / too-short answers
    if (!answerText || answerText.trim().length < 15) {
        return {
            keyPoints: [],
            decision: 'SKIP',
            followUpTarget: null,
            followUpHint: null,
            reason: 'Answer too short for key point extraction'
        };
    }

    const { jobTitle, jobDescription, jobSkills, roleCategory, isTech } = jobContext || {};

    const prompt = `
You are a senior interview analyst. Your job is to extract KEY POINTS from the candidate's answer and decide if any are worth drilling deeper.

=== INTERVIEW QUESTION ===
${questionText || 'Not specified'}

=== CANDIDATE'S ANSWER ===
${answerText}

=== JOB CONTEXT ===
Title: ${jobTitle || 'Not specified'}
Description: ${(jobDescription || '').substring(0, 500)}
Required Skills: ${(jobSkills || []).join(', ') || 'Not specified'}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory || 'general'})

=== INSTRUCTIONS ===
1. Extract the specific key points the candidate mentioned (technical terms, tools, methodologies, architectures, experiences, metrics, decisions).
2. For each key point, evaluate:
   - SPECIFIC: Is it a concrete claim (not vague platitudes like "I have good experience")?
   - RELEVANT: Is it connected to the question or the job requirements?
   - DEPTH-WORTHY: Does it hint at deeper knowledge that could be explored?
3. Decision:
   - "FOLLOW_UP" if at least ONE key point is specific + relevant + depth-worthy
   - "SKIP" if ALL key points are vague, generic, irrelevant, or the answer lacks substance

=== RESPONSE FORMAT (JSON ONLY) ===
{
  "keyPoints": [
    { "point": "brief description of key point", "isValid": true or false, "reason": "why valid or invalid" }
  ],
  "decision": "FOLLOW_UP" or "SKIP",
  "followUpTarget": "the single most interesting valid key point to drill into (null if SKIP)",
  "followUpHint": "one-line angle for the follow-up question (null if SKIP)"
}
`;

    try {
        const rawResponse = await callInterviewAI(
            prompt,
            350,   // Keep it fast: 350 tokens max
            true,  // JSON mode
            'You are a precise interview analyst. Extract key points and return valid JSON only.'
        );

        const parsed = safeParseAIJson(rawResponse, null);

        if (!parsed || !parsed.decision) {
            console.warn('[KEY-POINT-EXTRACTOR] Failed to parse AI response, defaulting to SKIP');
            return {
                keyPoints: [],
                decision: 'SKIP',
                followUpTarget: null,
                followUpHint: null,
                reason: 'Parse failure — fallback to SKIP'
            };
        }

        // Normalize decision to uppercase
        parsed.decision = String(parsed.decision).toUpperCase().trim();
        if (parsed.decision !== 'FOLLOW_UP') {
            parsed.decision = 'SKIP';
        }

        // Safety: if decision is FOLLOW_UP but no target was provided, downgrade to SKIP
        if (parsed.decision === 'FOLLOW_UP' && !parsed.followUpTarget) {
            parsed.decision = 'SKIP';
            parsed.reason = 'FOLLOW_UP decision but no followUpTarget provided';
        }

        console.log(`[KEY-POINT-EXTRACTOR] Decision: ${parsed.decision} | Key Points: ${(parsed.keyPoints || []).length} | Target: ${parsed.followUpTarget || 'none'}`);

        return parsed;

    } catch (err) {
        console.error('[KEY-POINT-EXTRACTOR] Error:', err.message);
        return null; // Caller will use graceful fallback
    }
}

module.exports = { extractAndValidateKeyPoints };
