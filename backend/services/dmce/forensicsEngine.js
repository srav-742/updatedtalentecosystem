/**
 * DMCE Forensics & Telemetry Analytics Engine
 * 
 * Computes behavioral telemetry metrics based on the mentor PRD specification:
 * - Spatial Locality (S_loc): edit clustering & locality of modifications
 * - Keystroke Directional Monotonicity (M_ks): forward sequential typing rhythm
 * - Diagnostic Interactivity (D_iter): frequency and rhythm of test/compile executions
 * - Coding Authenticity Score (CAS): composite evidence score (0-100)
 * 
 * STRICT COMPLIANCE:
 * Does NOT generate false-positive cheating disqualifications.
 * Produces review indicators and evidence signals for recruiter evaluation.
 */

const crypto = require('crypto');

/**
 * Computes SHA-256 document hash for telemetry frame integrity.
 */
function hashDocument(code = '') {
    return crypto.createHash('sha256').update(code).digest('hex').substring(0, 16);
}

/**
 * Computes Spatial Locality (S_loc) across consecutive editing events.
 * Returns a value in [0.0, 1.0].
 * High value indicates concentrated, localized modifications.
 */
function calculateSpatialLocality(events = []) {
    if (!Array.isArray(events) || events.length < 2) {
        return 0.85; // Default neutral baseline
    }

    const locEvents = events.filter(e => e.line !== undefined && e.column !== undefined);
    if (locEvents.length < 2) return 0.85;

    let totalScore = 0;
    let comparisons = 0;

    for (let i = 0; i < locEvents.length - 1; i++) {
        const curr = locEvents[i];
        const next = locEvents[i + 1];

        const lineDelta = Math.abs((next.line || 1) - (curr.line || 1));
        const colDelta = Math.abs((next.column || 1) - (curr.column || 1));

        // Effective 2D text distance
        const dist = lineDelta * 2.0 + (colDelta / 40.0);
        // Exponential decay for locality
        const locality = 1.0 / (1.0 + 0.18 * dist);

        totalScore += locality;
        comparisons++;
    }

    const avg = comparisons > 0 ? totalScore / comparisons : 0.85;
    return Math.min(1.0, Math.max(0.0, Math.round(avg * 100) / 100));
}

/**
 * Computes Keystroke Directional Monotonicity (M_ks).
 * Measures organic forward typing vs random scatter.
 * Returns a value in [0.0, 1.0].
 */
function calculateKeystrokeMonotonicity(events = []) {
    if (!Array.isArray(events) || events.length < 5) {
        return 0.65; // Default organic typing baseline
    }

    const keyEvents = events.filter(e =>
        ['KEY_PRESS', 'INSERT', 'TYPE', 'KEY_DOWN'].includes((e.type || '').toUpperCase())
    );

    if (keyEvents.length < 5) return 0.65;

    let forwardProgressCount = 0;
    let totalTransitions = 0;

    for (let i = 0; i < keyEvents.length - 1; i++) {
        const curr = keyEvents[i];
        const next = keyEvents[i + 1];

        if (curr.line === next.line) {
            if ((next.column || 0) >= (curr.column || 0)) {
                forwardProgressCount++;
            }
        } else if ((next.line || 0) > (curr.line || 0)) {
            // Advancing to next line is forward progression
            forwardProgressCount++;
        }
        totalTransitions++;
    }

    const monotonicity = totalTransitions > 0 ? (forwardProgressCount / totalTransitions) : 0.65;
    return Math.min(1.0, Math.max(0.0, Math.round(monotonicity * 100) / 100));
}

/**
 * Computes Diagnostic Interactivity (D_iter).
 * Evaluates candidate engagement with the execution/test feedback loop.
 * Returns a value in [0.0, 1.0].
 */
function calculateDiagnosticInteractivity(events = [], executions = []) {
    const runEvents = events.filter(e =>
        ['RUN', 'COMPILE', 'TEST', 'EXECUTE'].includes((e.type || '').toUpperCase())
    );
    const totalExecutions = Math.max(runEvents.length, executions.length);

    if (totalExecutions === 0) {
        return 0.20; // Minimal interactivity (never ran tests before submitting)
    }

    // Healthy incremental testing: 3 to 12 runs during typical technical round
    if (totalExecutions >= 8) return 0.95;
    if (totalExecutions >= 5) return 0.85;
    if (totalExecutions >= 3) return 0.72;
    if (totalExecutions >= 1) return 0.50;
    return 0.35;
}

/**
 * Computes Composite Coding Authenticity Score (CAS) and qualitative review indicators.
 * 
 * Formulation:
 * CAS = 100 * [ 0.30 * S_loc + 0.30 * M_ks + 0.25 * D_iter + 0.15 * (1 - |V_ast - 0.25|) ]
 * Clamped strictly to [0, 100].
 */
function analyzeForensics({
    telemetryEvents = [],
    executions = [],
    astVolatility = null,
    preMutationCode = '',
    postMutationCode = ''
}) {
    const sLoc = calculateSpatialLocality(telemetryEvents);
    const mKs = calculateKeystrokeMonotonicity(telemetryEvents);
    const dIter = calculateDiagnosticInteractivity(telemetryEvents, executions);

    const effectiveVast = astVolatility !== null ? astVolatility : 0.25;
    const astStructuralAffinity = 1.0 - Math.min(1.0, Math.abs(effectiveVast - 0.25));

    // Weighted composite
    const rawCas = (0.30 * sLoc + 0.30 * mKs + 0.25 * dIter + 0.15 * astStructuralAffinity) * 100;
    const casScore = Math.min(100, Math.max(10, Math.round(rawCas)));

    // Generate descriptive review indicators (Zero false-positive cheating claims)
    const reviewIndicators = [];

    if (dIter >= 0.7) {
        reviewIndicators.push('HIGH_DIAGNOSTIC_INTERACTION');
    } else if (dIter < 0.35) {
        reviewIndicators.push('LOW_ITERATIVE_EXECUTION');
    }

    if (sLoc >= 0.75 && mKs >= 0.55) {
        reviewIndicators.push('ORGANIC_DEVELOPER_FLOW');
    }

    if (effectiveVast > 0.65) {
        reviewIndicators.push('SIGNIFICANT_ALGORITHM_REARCHITECT');
    } else if (effectiveVast <= 0.15 && (postMutationCode.length > 0)) {
        reviewIndicators.push('LOCALIZED_PARAMETRIC_TWEAK');
    }

    // Check for paste burst
    const largePasteEvents = telemetryEvents.filter(e => e.type === 'PASTE' || (e.text && e.text.length > 80));
    if (largePasteEvents.length > 0) {
        reviewIndicators.push('BULK_BUFFER_INSERTION_RECORDED');
    }

    return {
        casScore,
        spatialLocality: sLoc,
        keystrokeMonotonicity: mKs,
        diagnosticInteractivity: dIter,
        astVolatility: effectiveVast,
        telemetryEventCount: telemetryEvents.length,
        executionCount: executions.length,
        reviewIndicators,
        documentHash: hashDocument(postMutationCode || preMutationCode)
    };
}

module.exports = {
    hashDocument,
    calculateSpatialLocality,
    calculateKeystrokeMonotonicity,
    calculateDiagnosticInteractivity,
    analyzeForensics
};
