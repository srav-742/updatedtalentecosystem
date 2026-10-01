/**
 * DMCE Session Manager (Coding Assessment Session & Lifecycle)
 * 
 * Manages the persistent lifecycle of a technical round coding session:
 * CREATED -> STARTED -> BASELINE_BUILD -> BASELINE_VALIDATED ->
 * MUTATION_ELIGIBLE -> MUTATION_ACTIVE -> ADAPTATION ->
 * MUTATION_VALIDATED -> FINAL_SUBMISSION -> COMPLETED -> SANDBOX_DESTROYED
 * 
 * Captures snapshots (baselineCode, preMutationCode, postMutationCode, finalSubmittedCode)
 * and correlates all mutation events, telemetry frames, and forensics.
 */

const { v4: uuidv4 } = require('uuid');
const { countAstNodes, calculateAstVolatility } = require('./astEngine');
const { analyzeForensics } = require('./forensicsEngine');
const { destroySession: destroySandbox } = require('./sandboxManager');

// In-memory sessions map: sessionId -> DMCESession
const sessions = new Map();

const LIFECYCLE_STATES = Object.freeze({
    CREATED: 'CREATED',
    STARTED: 'STARTED',
    BASELINE_BUILD: 'BASELINE_BUILD',
    BASELINE_VALIDATED: 'BASELINE_VALIDATED',
    MUTATION_ELIGIBLE: 'MUTATION_ELIGIBLE',
    MUTATION_ACTIVE: 'MUTATION_ACTIVE',
    ADAPTATION: 'ADAPTATION',
    MUTATION_VALIDATED: 'MUTATION_VALIDATED',
    FINAL_SUBMISSION: 'FINAL_SUBMISSION',
    COMPLETED: 'COMPLETED',
    SANDBOX_DESTROYED: 'SANDBOX_DESTROYED'
});

/**
 * Initializes a new DMCE persistent session.
 */
function initSession({
    sessionId = null,
    candidateId = '',
    applicationId = '',
    jobId = '',
    questionId = '',
    language = 'python',
    config = {}
}) {
    const sid = sessionId || uuidv4();

    if (sessions.has(sid)) {
        return sessions.get(sid);
    }

    const session = {
        sessionId: sid,
        candidateId: String(candidateId),
        applicationId: String(applicationId),
        jobId: String(jobId),
        questionId: String(questionId),
        language: String(language || 'python').toLowerCase(),
        state: LIFECYCLE_STATES.STARTED,
        createdAt: Date.now(),
        startedAt: Date.now(),
        lastActivityAt: Date.now(),

        // Configurable bounds (minTriggerSec defaults to 0 so baseline success triggers mutation immediately)
        config: {
            minTriggerSec: config.minTriggerSec !== undefined ? config.minTriggerSec : 0,
            maxTriggerSec: config.maxTriggerSec !== undefined ? config.maxTriggerSec : 1800, // 30 mins
            minAstNodes: config.minAstNodes !== undefined ? config.minAstNodes : 12,
            mutationTimeBufferSec: config.mutationTimeBufferSec !== undefined ? config.mutationTimeBufferSec : 600, // +10 mins
            enabled: config.enabled !== undefined ? config.enabled : true
        },

        // Authoritative Timer Management (Server-enforced)
        durationSec: config.durationSec !== undefined ? config.durationSec : 1800,
        timerExpiresAt: Date.now() + (config.durationSec !== undefined ? config.durationSec : 1800) * 1000,
        adaptationBufferApplied: false,
        adaptationBufferSec: 0,

        // Baseline tracking
        baselinePassed: false,
        baselineScore: 0,
        baselinePassedAt: null,
        baselineExecution: null,

        // Code Snapshots
        snapshots: {
            baselineCode: '',
            preMutationCode: '',
            postMutationCode: '',
            finalSubmittedCode: ''
        },

        // Mutation Event Record
        mutation: {
            triggered: false,
            mutationId: null,
            type: null,
            headline: null,
            description: null,
            triggeredAt: null,
            adaptationStartedAt: null,
            adaptationDurationSec: 0,
            status: 'PENDING', // PENDING, PASSED, FAILED, PARTIALLY_PASSED
            mutationTestsPassed: 0,
            mutationTestsTotal: 0,
            results: []
        },

        // Telemetry Frames & Forensics
        telemetryEvents: [],
        executions: [],
        forensics: null,
        astVolatility: null,
        timeline: [
            { event: 'SESSION_INITIALIZED', timestamp: Date.now(), message: 'Assessment session started' }
        ]
    };

    sessions.set(sid, session);
    console.log(`[DMCE-SESSION] Session initialized: ${sid} for question ${questionId}`);
    return session;
}

/**
 * Retrieves a session by ID.
 */
function getSession(sessionId) {
    if (!sessionId) return null;
    return sessions.get(sessionId) || null;
}

/**
 * Records candidate baseline execution results and updates lifecycle.
 */
function recordBaselineExecution(sessionId, code, language, executionResult) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    session.lastActivityAt = Date.now();
    session.executions.push({
        type: 'BASELINE_RUN',
        timestamp: Date.now(),
        passed: executionResult.passed,
        total: executionResult.total,
        status: executionResult.status
    });

    const isAllPassed = executionResult.status === 'ALL_PASSED' || (executionResult.passed === executionResult.total && executionResult.total > 0);

    if (isAllPassed) {
        session.baselinePassed = true;
        session.baselineScore = 100;
        session.baselinePassedAt = Date.now();
        session.baselineExecution = executionResult;
        session.snapshots.baselineCode = code;
        if (!session.snapshots.preMutationCode) {
            session.snapshots.preMutationCode = code;
        }

        if (session.state === LIFECYCLE_STATES.STARTED || session.state === LIFECYCLE_STATES.BASELINE_BUILD) {
            session.state = LIFECYCLE_STATES.BASELINE_VALIDATED;
            session.timeline.push({
                event: 'BASELINE_PASSED',
                timestamp: Date.now(),
                message: `Baseline tests passed (${executionResult.passed}/${executionResult.total})`
            });
        }
    }

    return session;
}

/**
 * Activates a mutation on the session and captures the pre-mutation snapshot.
 * Idempotent: If already activated, preserves existing activation timestamp and state.
 */
function activateMutation(sessionId, mutationContract, currentCode) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Idempotent guard: if already activated, do not reset adaptation timer or re-trigger
    if (session.mutation && session.mutation.activated) {
        return session;
    }

    const now = Date.now();
    session.state = LIFECYCLE_STATES.MUTATION_ACTIVE;
    session.snapshots.preMutationCode = currentCode || session.snapshots.preMutationCode || session.snapshots.baselineCode;

    const bufferSec = mutationContract.adaptationTimeBufferSec || 600;

    if (!session.adaptationBufferApplied) {
        session.adaptationBufferApplied = true;
        session.adaptationBufferSec = bufferSec;
        session.timerExpiresAt = (session.timerExpiresAt || (session.startedAt + (session.durationSec || 1800) * 1000)) + (bufferSec * 1000);
    }

    session.mutation = {
        triggered: true,
        activated: true,
        mutationId: mutationContract.mutationId,
        type: mutationContract.type,
        headline: mutationContract.headline,
        description: mutationContract.description,
        resourceConstraints: mutationContract.resourceConstraints,
        adaptationTimeBufferSec: bufferSec,
        triggeredAt: session.mutation?.triggeredAt || now,
        adaptationStartedAt: session.mutation?.adaptationStartedAt || now,
        adaptationDurationSec: 0,
        status: 'ACTIVE',
        mutationTestsPassed: 0,
        mutationTestsTotal: Array.isArray(mutationContract.mutationTests) ? mutationContract.mutationTests.length : 0,
        results: []
    };

    session.timeline.push({
        event: 'MUTATION_ACTIVATED',
        timestamp: now,
        mutationId: mutationContract.mutationId,
        message: `Mutation activated by candidate: ${mutationContract.headline} (${mutationContract.resourceConstraints?.memoryLimitMb || 16} MB clamped)`
    });

    console.log(`[DMCE-SESSION] [MUTATION_ACTIVATED] Mutation ${mutationContract.mutationId} activated for session ${sessionId}`);
    return session;
}

/**
 * Records mutation test execution and updates adaptation metrics.
 */
function recordMutationExecution(sessionId, code, language, mutationResult) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    const now = Date.now();
    session.lastActivityAt = now;
    session.snapshots.postMutationCode = code;

    const adaptationDuration = session.mutation.adaptationStartedAt
        ? Math.round((now - session.mutation.adaptationStartedAt) / 1000)
        : 0;

    session.mutation.adaptationDurationSec = adaptationDuration;
    session.mutation.mutationTestsPassed = mutationResult.passed;
    session.mutation.mutationTestsTotal = mutationResult.total;
    session.mutation.status = mutationResult.status === 'ALL_PASSED' ? 'PASSED' : (mutationResult.passed > 0 ? 'PARTIALLY_PASSED' : 'FAILED');
    session.mutation.results = mutationResult.results || [];

    session.executions.push({
        type: 'MUTATION_RUN',
        timestamp: now,
        passed: mutationResult.passed,
        total: mutationResult.total,
        status: mutationResult.status
    });

    if (mutationResult.status === 'ALL_PASSED') {
        session.state = LIFECYCLE_STATES.MUTATION_VALIDATED;
    }

    session.timeline.push({
        event: 'MUTATION_TEST_EXECUTED',
        timestamp: now,
        passed: mutationResult.passed,
        total: mutationResult.total,
        status: session.mutation.status,
        message: `Mutation tests executed: ${mutationResult.passed}/${mutationResult.total} passed`
    });

    return session;
}

/**
 * Ingests a batch of telemetry frames from candidate editor.
 */
function ingestTelemetryBatch(sessionId, frame = {}) {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.lastActivityAt = Date.now();
    const events = Array.isArray(frame.events) ? frame.events : (frame.event ? [frame.event] : []);

    for (const evt of events) {
        session.telemetryEvents.push({
            ...evt,
            seqId: frame.seqId || session.telemetryEvents.length + 1,
            timestamp: evt.timestamp || Date.now()
        });
    }

    // Keep memory bounded to last 2000 events
    if (session.telemetryEvents.length > 2000) {
        session.telemetryEvents = session.telemetryEvents.slice(-2000);
    }

    return true;
}

/**
 * Finalizes session submission: runs AST tree edit distance and behavioral forensics.
 */
function finalizeSession(sessionId, finalCode, language) {
    const session = sessions.get(sessionId);
    if (!session) return null;

    session.state = LIFECYCLE_STATES.FINAL_SUBMISSION;
    session.snapshots.finalSubmittedCode = finalCode;

    const preCode = session.snapshots.preMutationCode || session.snapshots.baselineCode || finalCode;
    const postCode = session.snapshots.postMutationCode || finalCode;
    const lang = language || session.language || 'python';

    // 1. Calculate AST Volatility between pre-mutation and post-mutation
    const astResult = calculateAstVolatility(preCode, postCode, lang);
    session.astVolatility = astResult.astVolatility;

    // 2. Run behavioral forensics analytics
    const forensics = analyzeForensics({
        telemetryEvents: session.telemetryEvents,
        executions: session.executions,
        astVolatility: astResult.astVolatility,
        preMutationCode: preCode,
        postMutationCode: postCode
    });
    session.forensics = forensics;

    session.timeline.push({
        event: 'SESSION_COMPLETED',
        timestamp: Date.now(),
        message: 'Assessment completed and submitted'
    });

    session.state = LIFECYCLE_STATES.COMPLETED;
    console.log(`[DMCE-SESSION] [SESSION_COMPLETED] Finalized session ${sessionId}. AST Volatility: ${session.astVolatility}, CAS: ${forensics.casScore}`);

    return session;
}

/**
 * Destroys session and cleans associated sandbox.
 */
function cleanupSession(sessionId) {
    if (!sessionId || !sessions.has(sessionId)) return false;
    destroySandbox(sessionId);
    sessions.delete(sessionId);
    return true;
}

module.exports = {
    LIFECYCLE_STATES,
    initSession,
    getSession,
    recordBaselineExecution,
    activateMutation,
    recordMutationExecution,
    ingestTelemetryBatch,
    finalizeSession,
    cleanupSession,
    getActiveSessionCount: () => sessions.size,
    _sessions: sessions
};
