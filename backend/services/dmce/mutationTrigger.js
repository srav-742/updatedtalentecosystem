/**
 * DMCE Mutation Trigger Engine
 * 
 * Evaluates deterministic mutation eligibility based strictly on mentor SME rules:
 * 1. Elapsed assessment time is within configurable bounds: minTriggerSec <= elapsed <= maxTriggerSec
 * 2. Stage-1 baseline tests must have ALL PASSED (baselinePassed === true)
 * 3. Minimum AST structural density achieved (nodeCount >= minAstNodes) to reject mere stubs
 * 
 * NEVER triggers on random time alone.
 * NEVER triggers before baseline eligibility is achieved.
 */

const { countAstNodes } = require('./astEngine');

/**
 * Evaluates whether a session is currently eligible for runtime mutation.
 * 
 * @param {Object} session - The active DMCE session
 * @param {string} [currentCode] - Candidate's current buffer code (optional, falls back to baseline snapshot)
 * @returns {Object} Evaluation verdict: { eligible: boolean, reason: string, details: Object }
 */
function evaluateMutationTrigger(session, currentCode = null) {
    if (!session) {
        return { eligible: false, reason: 'SESSION_NULL', details: {} };
    }

    if (session.config && session.config.enabled === false) {
        return { eligible: false, reason: 'MUTATION_DISABLED_IN_CONFIG', details: {} };
    }

    // Already triggered? Do not trigger a second time
    if (session.mutation && session.mutation.triggered) {
        return { eligible: false, reason: 'ALREADY_TRIGGERED', details: {} };
    }

    const now = Date.now();
    const elapsedSec = Math.max(0, Math.floor((now - (session.startedAt || now)) / 1000));
    const minSec = session.config?.minTriggerSec !== undefined ? session.config.minTriggerSec : 0;
    const maxSec = session.config?.maxTriggerSec !== undefined ? session.config.maxTriggerSec : 1800;
    const minAst = session.config?.minAstNodes !== undefined ? session.config.minAstNodes : 12;

    const details = {
        elapsedSec,
        minTriggerSec: minSec,
        maxTriggerSec: maxSec,
        baselinePassed: !!session.baselinePassed,
        minAstNodes: minAst,
        astNodeCount: 0
    };

    // 1. Check baseline validation (Mandatory Mentor Requirement)
    if (!session.baselinePassed) {
        return {
            eligible: false,
            reason: 'BASELINE_NOT_PASSED: Candidate must pass Stage-1 baseline tests first',
            details
        };
    }

    // 2. Check time window bounds
    if (elapsedSec < minSec) {
        return {
            eligible: false,
            reason: `BEFORE_MIN_TRIGGER_TIME: Elapsed ${elapsedSec}s is less than min ${minSec}s`,
            details
        };
    }

    if (elapsedSec > maxSec) {
        return {
            eligible: false,
            reason: `AFTER_MAX_TRIGGER_TIME: Elapsed ${elapsedSec}s exceeds max ${maxSec}s`,
            details
        };
    }

    // 3. Check AST structural density (must not be an empty template/stub)
    const codeToCheck = currentCode || session.snapshots?.baselineCode || session.snapshots?.preMutationCode || '';
    const astCount = countAstNodes(codeToCheck, session.language || 'python');
    details.astNodeCount = astCount;

    if (astCount < minAst) {
        return {
            eligible: false,
            reason: `INSUFFICIENT_AST_DENSITY: Node count ${astCount} is below required threshold ${minAst}`,
            details
        };
    }

    // All mentor SME criteria met!
    return {
        eligible: true,
        reason: 'ELIGIBLE_ALL_CRITERIA_MET',
        details
    };
}

/**
 * Validates whether candidate code represents a meaningful, relevant attempt to solve
 * the problem, utilizing Gemini 2.5 Flash logic analysis with deterministic fallback.
 * (Mentor Requirement 6.1 & 18.1)
 */
async function validateCodeIntentWithAi({ questionTitle = '', questionDescription = '', code = '', language = 'python' }) {
    const { isMeaningfulCode, isSyntaxAttempt } = require('../../utils/partialCreditCodingEvaluator');

    if (!isMeaningfulCode(code, language)) {
        return {
            meaningfulAttempt: false,
            reason: 'Code is empty, only comments, or unmodified starter template.'
        };
    }

    if (!isSyntaxAttempt(code)) {
        return {
            meaningfulAttempt: false,
            reason: 'Code lacks valid programming syntax or structural statements.'
        };
    }

    const systemInstruction = 'You are a senior technical coding interviewer. Your task is to verify whether candidate code appears to meaningfully attempt the specified programming challenge, or whether it is completely unrelated/trivial dummy/empty. Return only valid JSON.';
    const prompt = `QUESTION TITLE: ${questionTitle}
QUESTION DESCRIPTION: ${questionDescription}
LANGUAGE: ${language}

CANDIDATE CODE:
\`\`\`${language}
${code}
\`\`\`

Evaluate if this code represents a relevant attempt to solve the question (even if buggy, partial, or non-optimal).
Does it demonstrate algorithmic intent addressing the problem, or is it completely unrelated/hardcoded dummy/empty?

Respond strictly in JSON format:
{
  "meaningfulAttempt": true,
  "reason": "concise explanation of findings"
}`;

    try {
        const { callGemini } = require('../../utils/aiClients');
        const raw = await callGemini(prompt, systemInstruction, { temperature: 0.1 });
        const jsonMatch = raw && raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                meaningfulAttempt: parsed.meaningfulAttempt !== false,
                reason: parsed.reason || 'AI verified candidate code algorithmic intent.'
            };
        }
    } catch (aiErr) {
        // Safe fallback - do not block assessment on AI outage
    }

    // Graceful deterministic fallback
    return {
        meaningfulAttempt: true,
        reason: 'Deterministic syntax and structure check verified meaningful algorithmic attempt.'
    };
}

module.exports = {
    evaluateMutationTrigger,
    validateCodeIntentWithAi
};
