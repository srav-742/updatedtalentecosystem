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
    const minSec = session.config?.minTriggerSec !== undefined ? session.config.minTriggerSec : 120;
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

    // 1. Check time window bounds
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

    // 2. Check baseline validation
    if (!session.baselinePassed) {
        return {
            eligible: false,
            reason: 'BASELINE_NOT_PASSED: Candidate must pass Stage-1 baseline tests first',
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

module.exports = {
    evaluateMutationTrigger
};
