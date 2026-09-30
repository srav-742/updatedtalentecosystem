/**
 * DMCE Master Mutation Engine
 * 
 * Orchestrates the full Dynamic Mutation Coding Engine technical round lifecycle:
 * - Dedicated Sandbox Lifecycle
 * - Baseline Execution & Validation
 * - Deterministic Mutation Trigger Evaluation
 * - Live Runtime Resource Clamping (without session destruction)
 * - Mutation-Specific Test Execution
 * - AST Analysis & Telemetry Forensics
 */

const { getMutationContract, selectMutationForQuestion } = require('./mutationRegistry');
const {
    createSession: createSandboxSession,
    getStatus: getSandboxStatus,
    applyResourceMutation,
    execute: executeInSandbox,
    executeMutationTests,
    destroySession: destroySandbox
} = require('./sandboxManager');
const {
    initSession,
    getSession,
    recordBaselineExecution,
    activateMutation,
    recordMutationExecution,
    ingestTelemetryBatch,
    finalizeSession,
    cleanupSession
} = require('./sessionManager');
const { evaluateMutationTrigger } = require('./mutationTrigger');

/**
 * Initializes a dedicated DMCE session and execution sandbox.
 */
function startSession({
    sessionId = null,
    candidateId = '',
    applicationId = '',
    jobId = '',
    questionId = '',
    language = 'python',
    config = {}
}) {
    const session = initSession({
        sessionId,
        candidateId,
        applicationId,
        jobId,
        questionId,
        language,
        config
    });

    // Initialize dedicated sandbox
    const sandbox = createSandboxSession(session.sessionId, { language });

    return {
        sessionId: session.sessionId,
        state: session.state,
        startedAt: session.startedAt,
        config: session.config,
        sandbox: {
            status: sandbox.status,
            currentConstraints: sandbox.currentConstraints
        }
    };
}

/**
 * Runs baseline tests in the dedicated sandbox.
 */
async function runBaseline(sessionId, code, language, testCases = []) {
    const session = getSession(sessionId) || initSession({ sessionId, language });

    // Execute baseline tests using the dedicated sandbox
    let passedCount = 0;
    let failedCount = 0;
    let totalTime = 0;
    const results = [];

    const publicTests = testCases.filter(t => !t.isHidden);
    const hiddenTests = testCases.filter(t => t.isHidden);

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const execRes = await executeInSandbox(sessionId, code, language, tc.input || '');
        totalTime += execRes.executionTime || 0;

        let tcPassed = false;
        let tcStatus = execRes.status;

        if (execRes.status === 'SUCCESS') {
            const isMatch = (execRes.stdout || '').trim() === (tc.expectedOutput || '').trim();
            if (isMatch) {
                tcPassed = true;
                tcStatus = 'PASSED';
            } else {
                tcPassed = false;
                tcStatus = 'WRONG_ANSWER';
            }
        }

        if (tcPassed) passedCount++;
        else failedCount++;

        results.push({
            id: tc._id ? String(tc._id) : `test-${i + 1}`,
            category: tc.category || 'NORMAL',
            isHidden: !!tc.isHidden,
            passed: tcPassed,
            status: tcStatus,
            executionTime: execRes.executionTime,
            actualOutput: tc.isHidden ? (tcPassed ? 'Passed' : 'Failed') : execRes.stdout,
            errorMessage: execRes.stderr || undefined
        });
    }

    const overallStatus = failedCount === 0 ? 'ALL_PASSED' : (passedCount > 0 ? 'PARTIALLY_PASSED' : 'FAILED');

    const executionSummary = {
        status: overallStatus,
        passed: passedCount,
        failed: failedCount,
        total: testCases.length,
        publicPassed: results.filter(r => !r.isHidden && r.passed).length,
        publicTotal: publicTests.length,
        hiddenPassed: results.filter(r => r.isHidden && r.passed).length,
        hiddenTotal: hiddenTests.length,
        executionTime: Math.round(totalTime * 100) / 100,
        results
    };

    // Update persistent session record
    recordBaselineExecution(sessionId, code, language, executionSummary);

    // Check trigger eligibility
    const triggerEval = evaluateMutationTrigger(session, code);

    return {
        execution: executionSummary,
        baselinePassed: session.baselinePassed,
        mutationEligible: triggerEval.eligible,
        triggerEvaluation: triggerEval
    };
}

/**
 * Checks trigger criteria and executes live runtime mutation if eligible.
 */
function triggerMutationIfEligible(sessionId, currentCode = null, customMutationId = null) {
    const session = getSession(sessionId);
    if (!session) {
        throw new Error(`Session ${sessionId} not found`);
    }

    const triggerEval = evaluateMutationTrigger(session, currentCode);
    if (!triggerEval.eligible) {
        return {
            triggered: false,
            reason: triggerEval.reason,
            details: triggerEval.details
        };
    }

    // Select deterministic mutation contract
    const contract = customMutationId
        ? getMutationContract(customMutationId)
        : selectMutationForQuestion({ mutationContractId: customMutationId });

    if (!contract) {
        throw new Error('Mutation contract not found in registry');
    }

    // 1. Live Hot Clamp active sandbox (Session stays alive)
    applyResourceMutation(sessionId, contract);

    // 2. Activate in persistent session state (Capture pre-mutation snapshot)
    activateMutation(sessionId, contract, currentCode);

    return {
        triggered: true,
        mutationId: contract.mutationId,
        headline: contract.headline,
        description: contract.description,
        type: contract.type,
        resourceConstraints: contract.resourceConstraints,
        adaptationTimeBufferSec: contract.adaptationTimeBufferSec,
        triggeredAt: session.mutation.triggeredAt,
        mutationTestsCount: contract.mutationTests.length
    };
}

/**
 * Executes mutation-specific tests under mutated constraints.
 */
async function runMutationTests(sessionId, code, language) {
    const session = getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (!session.mutation || !session.mutation.triggered) {
        throw new Error('Mutation has not been triggered on this session');
    }

    const contract = getMutationContract(session.mutation.mutationId);
    const mutationTests = contract ? contract.mutationTests : [];

    // Execute under mutated constraints
    const testResults = await executeMutationTests(sessionId, code, language, mutationTests);

    // Record snapshot and update session
    recordMutationExecution(sessionId, code, language, testResults);

    return {
        mutationStatus: session.mutation.status,
        passed: testResults.passed,
        failed: testResults.failed,
        total: testResults.total,
        adaptationDurationSec: session.mutation.adaptationDurationSec,
        results: testResults.results
    };
}

/**
 * Submits final solution, performs AST diff and behavioral forensics.
 */
function submitAndAnalyze(sessionId, finalCode, language) {
    const session = getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const finalized = finalizeSession(sessionId, finalCode, language);

    return {
        sessionId: finalized.sessionId,
        state: finalized.state,
        baseline: {
            passed: finalized.baselinePassed,
            score: finalized.baselineScore
        },
        mutation: {
            triggered: finalized.mutation.triggered,
            mutationId: finalized.mutation.mutationId,
            status: finalized.mutation.status,
            mutationTestsPassed: finalized.mutation.mutationTestsPassed,
            mutationTestsTotal: finalized.mutation.mutationTestsTotal,
            adaptationDurationSec: finalized.mutation.adaptationDurationSec
        },
        snapshots: finalized.snapshots,
        forensics: finalized.forensics,
        astVolatility: finalized.astVolatility,
        timeline: finalized.timeline
    };
}

module.exports = {
    startSession,
    runBaseline,
    triggerMutationIfEligible,
    runMutationTests,
    submitAndAnalyze,
    getSession,
    ingestTelemetryBatch,
    cleanupSession
};
