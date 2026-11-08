/**
 * Proctoring Calibration & Integrity Scoring Test Suite
 * 
 * Verifies that the authoritative scoring engine v2 correctly satisfies
 * precision, recall, and threshold guarantees across all benchmark cohorts.
 */

const assert = require('assert');
const { BENCHMARK_SESSIONS, evaluateCalibration } = require('../utils/proctoringCalibration');
const { evaluateIntegrity, normalizeIncident, CANONICAL_CATEGORIES } = require('../utils/proctoringScoring');

function runTests() {
    console.log('====================================================');
    console.log('  PROCTORING INTEGRITY SCORING & CALIBRATION TESTS  ');
    console.log('====================================================\n');

    // ── Test 1: Full Calibration Evaluation ──
    console.log('[TEST 1] Running Benchmark Calibration...');
    const calibration = evaluateCalibration();

    console.log(`Total Benchmark Sessions : ${calibration.totalSessions}`);
    console.log(`Accuracy                 : ${(calibration.accuracy * 100).toFixed(1)}%`);
    console.log(`High Risk Precision      : ${(calibration.highRiskMetrics.precision * 100).toFixed(1)}%`);
    console.log(`High Risk Recall         : ${(calibration.highRiskMetrics.recall * 100).toFixed(1)}%`);
    console.log(`High Risk F1-Score       : ${(calibration.highRiskMetrics.f1 * 100).toFixed(1)}%`);
    console.log('\nConfusion Matrix:');
    console.table(calibration.confusionMatrix);

    calibration.results.forEach(r => {
        console.log(`  Session [${r.id.padEnd(8)}] Cohort: ${r.cohort.padEnd(15)} Expected: ${r.expectedRisk.padEnd(16)} Actual: ${r.actualRisk.padEnd(16)} Score: ${String(r.integrityScore).padStart(3)} [${r.pass ? 'PASS' : 'FAIL'}]`);
    });

    assert.strictEqual(calibration.accuracy, 1.0, 'Calibration accuracy must be 100% across benchmark sessions');
    assert.strictEqual(calibration.highRiskMetrics.precision, 1.0, 'High Risk precision must be 1.0 (no false accusations)');
    assert.strictEqual(calibration.highRiskMetrics.recall, 1.0, 'High Risk recall must be 1.0 (no missed critical violations)');
    console.log('\n✅ TEST 1 PASSED: All benchmark sessions classified with 100% precision & recall.\n');

    // ── Test 2: Incident Normalization & Threshold Filtering ──
    console.log('[TEST 2] Testing Incident Normalization & Threshold Filtering...');
    // A gaze deviation under 1.5s with low confidence should be ignored as non-significant
    const subThresholdEvent = {
        type: 'LOOKING_AWAY',
        duration: 0.8,
        confidence: 0.4
    };
    const normSub = normalizeIncident(subThresholdEvent);
    assert.strictEqual(normSub.isSignificant, false, 'Sub-threshold duration and confidence must be marked non-significant');

    // Multi-camera benign peripheral must not produce penalty
    const benignCam = {
        type: 'MULTIPLE_DEVICES',
        detail: 'External USB Camera (Integrated Camera)',
        metadata: { cameraCount: 2 }
    };
    const normCam = normalizeIncident(benignCam);
    assert.strictEqual(normCam.rating, 0, 'Multi-camera hardware setup must receive rating 0');
    console.log('✅ TEST 2 PASSED: Benign noise and sub-threshold events normalized cleanly.\n');

    // ── Test 3: Critical Infraction Direct Escalation ──
    console.log('[TEST 3] Testing Critical Infraction Direct Escalation...');
    const singleCritical = [
        { type: 'PHONE_DETECTED', confidence: 0.95, isAnswering: true, evidenceFrames: ['frame1'] }
    ];
    const critEval = evaluateIntegrity(singleCritical);
    assert.strictEqual(critEval.riskLevel, 'HIGH RISK', 'Single verified phone detection must escalate to HIGH RISK');
    assert.strictEqual(critEval.criticalIncidents, 1, 'Critical incidents count must be 1');
    assert.ok(critEval.integrityScore <= 60, `Integrity score must be <= 60 (got ${critEval.integrityScore})`);
    assert.strictEqual(critEval.scoreVersion, 'v2', 'Score version must be v2');
    console.log(`✅ TEST 3 PASSED: Phone detected correctly classified as ${critEval.riskLevel} with score ${critEval.integrityScore}.\n`);

    // ── Test 4: Pure Answering Multiplier Logic ──
    console.log('[TEST 4] Testing Answering Multiplier Logic...');
    const nonAnsweringTab = evaluateIntegrity([
        { type: 'TAB_SWITCH', confidence: 0.9, isAnswering: false }
    ]);
    const answeringTab = evaluateIntegrity([
        { type: 'TAB_SWITCH', confidence: 0.9, isAnswering: true }
    ]);
    assert.ok(
        answeringTab.totalPenaltyRating > nonAnsweringTab.totalPenaltyRating,
        `Answering tab switch penalty (${answeringTab.totalPenaltyRating}) must exceed non-answering penalty (${nonAnsweringTab.totalPenaltyRating})`
    );
    console.log(`✅ TEST 4 PASSED: Answering weight applied (answering=${answeringTab.totalPenaltyRating} vs non-answering=${nonAnsweringTab.totalPenaltyRating}).\n`);

    console.log('====================================================');
    console.log('  ALL 4 PROCTORING CALIBRATION TESTS PASSED (100%)  ');
    console.log('====================================================\n');
}

runTests();
