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

const { compareOutputs } = require('../codeExecutionService');
const { getMutationContract, selectMutationForQuestion } = require('./mutationRegistry');
const {
    createSession: createSandboxSession,
    getStatus: getSandboxStatus,
    applyResourceMutation,
    resetToOriginalConstraints,
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

    // Ensure baseline tests always run under original 512MB constraints,
    // not any previously-mutated 16MB from a prior mutation activation
    resetToOriginalConstraints(sessionId);

    if (!Array.isArray(testCases) || testCases.length === 0) {
        const executionSummary = {
            status: 'TEST_CONFIGURATION_ERROR',
            passed: 0,
            failed: 0,
            total: 0,
            publicPassed: 0,
            publicTotal: 0,
            hiddenPassed: 0,
            hiddenTotal: 0,
            executionTime: 0,
            errorMessage: 'No validated test cases configured for this question.',
            results: []
        };
        recordBaselineExecution(sessionId, code, language, executionSummary);
        return {
            execution: executionSummary,
            baselinePassed: false,
            mutationEligible: false,
            triggerEvaluation: { eligible: false, reason: 'NO_TEST_CASES' }
        };
    }

    // Execute baseline tests using the dedicated sandbox
    let passedCount = 0;
    let failedCount = 0;
    let totalTime = 0;
    const results = [];

    const publicTests = testCases.filter(t => !t.isHidden);
    const hiddenTests = testCases.filter(t => t.isHidden);

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        if (!tc || tc.input === undefined || tc.input === null || tc.expectedOutput === undefined || tc.expectedOutput === null) {
            results.push({
                id: tc?._id ? String(tc._id) : `test-${i + 1}`,
                category: tc?.category || 'NORMAL',
                isHidden: !!tc?.isHidden,
                passed: false,
                status: 'TEST_CONFIGURATION_ERROR',
                executionTime: 0,
                actualOutput: tc?.isHidden ? 'Failed' : '',
                errorMessage: 'Test case configuration error: missing input or expected output.'
            });
            failedCount++;
            continue;
        }

        const execRes = await executeInSandbox(sessionId, code, language, tc.input || '');
        totalTime += execRes.executionTime || 0;

        let tcPassed = false;
        let tcStatus = execRes.status;

        if (execRes.status === 'SUCCESS') {
            const isMatch = compareOutputs(execRes.stdout, tc.expectedOutput);
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

    // Select deterministic mutation contract respecting configured session memory limits
    const configuredMem = session.config?.memoryLimitMb;
    const effectiveMemLimit = configuredMem || session.mutation?.resourceConstraints?.memoryLimitMb;
    const effectiveBufferSec = session.config?.mutationTimeBufferSec !== undefined ? session.config.mutationTimeBufferSec : (session.mutation?.adaptationTimeBufferSec ?? 0);
    const contract = customMutationId
        ? getMutationContract(customMutationId, effectiveMemLimit ? { memoryLimitMb: effectiveMemLimit, adaptationTimeBufferSec: effectiveBufferSec } : {})
        : selectMutationForQuestion(session, effectiveMemLimit ? { memoryLimitMb: effectiveMemLimit, adaptationTimeBufferSec: effectiveBufferSec } : {});

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
 * Explicit candidate mutation activation (called when candidate clicks "Adapt Solution Under Constraint").
 * Validates candidate session & baseline eligibility, clamps resources to configured memory limit, and starts adaptation timer.
 */
function activateCandidateMutation(sessionId, currentCode = null, customMutationId = null) {
    const session = getSession(sessionId);
    if (!session) {
        throw new Error(`Session ${sessionId} not found`);
    }

    if (session.state === 'COMPLETED' || session.state === 'FINAL_SUBMISSION' || session.state === 'SANDBOX_DESTROYED') {
        throw new Error('Cannot activate mutation on completed or submitted assessment session.');
    }

    if (session.timerExpiresAt && Date.now() > session.timerExpiresAt) {
        throw new Error('Assessment session has expired.');
    }

    if (!session.baselinePassed && session.state !== 'MUTATION_ACTIVE') {
        throw new Error('Candidate must complete and pass Stage-1 baseline validation before adapting under mutated constraints.');
    }

    // Idempotent return if already activated
    if (session.mutation && session.mutation.activated) {
        const sandboxStatus = getSandboxStatus(sessionId);
        return {
            activated: true,
            alreadyActive: true,
            mutation: session.mutation,
            sandbox: sandboxStatus
        };
    }

    const configuredMem = session.config?.memoryLimitMb;
    const effectiveMemLimit = configuredMem || session.mutation?.resourceConstraints?.memoryLimitMb;
    const effectiveBufferSec = session.config?.mutationTimeBufferSec !== undefined ? session.config.mutationTimeBufferSec : (session.mutation?.adaptationTimeBufferSec ?? 0);
    const mutationId = customMutationId || session.mutation?.mutationId || (effectiveMemLimit ? `mut_mem_opt_${effectiveMemLimit}mb` : 'mut_mem_opt_16mb');
    const contract = getMutationContract(mutationId, effectiveMemLimit ? { memoryLimitMb: effectiveMemLimit, adaptationTimeBufferSec: effectiveBufferSec } : {})
        || selectMutationForQuestion(session, effectiveMemLimit ? { memoryLimitMb: effectiveMemLimit, adaptationTimeBufferSec: effectiveBufferSec } : {});

    if (!contract) {
        throw new Error(`Mutation contract ${mutationId} not found in registry`);
    }

    // 1. Live Hot Clamp active sandbox
    const updatedSandbox = applyResourceMutation(sessionId, contract);

    // 2. Activate in persistent session state
    const updatedSession = activateMutation(sessionId, contract, currentCode);

    return {
        activated: true,
        alreadyActive: false,
        mutation: updatedSession.mutation,
        sandbox: {
            status: updatedSandbox.status,
            currentConstraints: updatedSandbox.currentConstraints
        }
    };
}

/**
 * Executes mutation-specific tests under mutated constraints (16MB memory limit).
 * Supports question-specific test cases or falls back to contract benchmark tests.
 */
async function runMutationTests(sessionId, code, language, testCasesOverride = null) {
    const session = getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (!session.mutation || (!session.mutation.triggered && !session.mutation.activated)) {
        throw new Error('Mutation has not been triggered on this session');
    }

    const contract = getMutationContract(session.mutation.mutationId);
    let mutationTests = [];

    if (Array.isArray(testCasesOverride) && testCasesOverride.length > 0) {
        mutationTests = testCasesOverride;
    } else if (contract && Array.isArray(contract.mutationTests)) {
        mutationTests = contract.mutationTests;
    }

    // Execute under mutated constraints (16 MB clamped heap)
    const testResults = await executeMutationTests(sessionId, code, language, mutationTests);

    // Record snapshot and update session
    recordMutationExecution(sessionId, code, language, testResults);

    // Auto-reset sandbox back to original 512MB constraints after mutation tests complete
    // This ensures subsequent normal code runs are not permanently clamped to 16MB
    resetToOriginalConstraints(sessionId);

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
    activateCandidateMutation,
    runMutationTests,
    submitAndAnalyze,
    getSession,
    ingestTelemetryBatch,
    cleanupSession
};
