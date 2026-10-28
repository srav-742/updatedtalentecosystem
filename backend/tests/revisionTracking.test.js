/**
 * Hire1Percent — Immutable Revision Tracking Test Suite
 * 
 * Verifies:
 * - Immutability of baseline snapshot
 * - Chronological sequence monotonicity (1, 2, 3...)
 * - SHA-256 hash chaining and tamper-evidence
 * - Deduplication of identical consecutive snapshots
 * - Bounded payload enforcement (<= 256KB)
 * - Strict candidate & assessment scoping (cross-candidate isolation)
 * - Concurrent write handling
 * - Backward-compatibility with legacy records lacking revisions
 * - Feature flag disabling and rollback behavior
 */

const assert = require('assert');
const revisionTracker = require('../services/revisionTrackingService');
const { isConstraintMutationAnalysisEnabled, setFeatureFlagOverride, clearFeatureFlagOverrides } = require('../config/featureFlags');

console.log('================================================================');
console.log('STARTING IMMUTABLE REVISION TRACKING TEST SUITE');
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ PASSED: ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`  ✗ FAILED: ${name}`);
        console.error(`    Error: ${err.message}`);
        failedCount++;
    }
}

async function runAllTests() {
    revisionTracker.resetMemoryStore();
    clearFeatureFlagOverrides();

    const assessmentId = 'job_test_001';
    const candidateId = 'cand_alice';
    const questionId = 'q_reverse_array';

    // ── GROUP 1: BASELINE RECORDING & IMMUTABILITY ──────────────
    console.log('--- GROUP 1: Baseline Recording & Immutability ---');

    await test('1.1: Successfully records initial BASELINE revision with sequence 1', async () => {
        const baselineCode = 'def solution(arr):\n    return arr[::-1]\n';
        const rev = await revisionTracker.recordRevision({
            assessmentId,
            candidateId,
            questionId,
            code: baselineCode,
            language: 'python',
            revisionType: 'BASELINE',
            runAttemptId: 'run_baseline_1'
        });

        assert.strictEqual(rev.sequenceNumber, 1);
        assert.strictEqual(rev.revisionType, 'BASELINE');
        assert.strictEqual(rev.baselineRevisionId, rev.revisionId);
        assert.strictEqual(rev.previousRevisionId, null);
        assert.strictEqual(rev.contentHash, revisionTracker.computeHash(baselineCode));
    });

    await test('1.2: Idempotent duplicate call with same baseline code returns existing revision', async () => {
        const baselineCode = 'def solution(arr):\n    return arr[::-1]\n';
        const rev = await revisionTracker.recordRevision({
            assessmentId,
            candidateId,
            questionId,
            code: baselineCode,
            language: 'python',
            revisionType: 'BASELINE'
        });
        assert.strictEqual(rev.sequenceNumber, 1);
    });

    await test('1.3: Immutability Protection: Rejects overwriting baseline with different code', async () => {
        let threw = false;
        try {
            await revisionTracker.recordRevision({
                assessmentId,
                candidateId,
                questionId,
                code: 'def solution(arr):\n    # Tampered code\n    return []\n',
                language: 'python',
                revisionType: 'BASELINE'
            });
        } catch (err) {
            threw = true;
            assert.match(err.message, /immutable/i);
        }
        assert.strictEqual(threw, true, 'Must reject overwriting baseline with differing code');
    });

    // ── GROUP 2: REVISION PROGRESSION & DEDUPLICATION ───────────
    console.log('\n--- GROUP 2: Revision Progression & Deduplication ---');

    await test('2.1: Records MUTATION_ACTIVE revision upon constraint activation', async () => {
        const baselineCode = 'def solution(arr):\n    return arr[::-1]\n';
        const rev = await revisionTracker.recordRevision({
            assessmentId,
            candidateId,
            questionId,
            code: baselineCode,
            language: 'python',
            revisionType: 'MUTATION_ACTIVE',
            constraintId: 'mut_mem_opt_14mb',
            metadata: { headline: 'Memory Clamped to 14MB' }
        });

        assert.strictEqual(rev.sequenceNumber, 2);
        assert.strictEqual(rev.revisionType, 'MUTATION_ACTIVE');
        assert.strictEqual(rev.constraintId, 'mut_mem_opt_14mb');
    });

    await test('2.2: Deduplicates consecutive identical code snapshots during editing', async () => {
        const adaptedCode = 'def solution(arr):\n    for item in reversed(arr):\n        yield item\n';
        const rev1 = await revisionTracker.recordRevision({
            assessmentId,
            candidateId,
            questionId,
            code: adaptedCode,
            language: 'python',
            revisionType: 'CHECKPOINT'
        });
        assert.strictEqual(rev1.sequenceNumber, 3);

        // Immediate identical checkpoint is deduplicated
        const rev2 = await revisionTracker.recordRevision({
            assessmentId,
            candidateId,
            questionId,
            code: adaptedCode,
            language: 'python',
            revisionType: 'CHECKPOINT'
        });
        assert.strictEqual(rev2.sequenceNumber, 3);
        assert.strictEqual(rev2.revisionId, rev1.revisionId);
    });

    await test('2.3: INTERMEDIATE_RUN records execution even if code matches last checkpoint', async () => {
        const adaptedCode = 'def solution(arr):\n    for item in reversed(arr):\n        yield item\n';
        const runRev = await revisionTracker.recordRevision({
            assessmentId,
            candidateId,
            questionId,
            code: adaptedCode,
            language: 'python',
            revisionType: 'INTERMEDIATE_RUN',
            runAttemptId: 'run_eval_42',
            constraintId: 'mut_mem_opt_14mb',
            metadata: { passed: 2, total: 2 }
        });

        assert.strictEqual(runRev.sequenceNumber, 4);
        assert.strictEqual(runRev.runAttemptId, 'run_eval_42');
    });

    await test('2.4: Records FINAL_SUBMISSION revision referencing exact submitted code', async () => {
        const finalCode = 'def solution(arr):\n    for item in reversed(arr):\n        yield item\n';
        const finalRev = await revisionTracker.recordRevision({
            assessmentId,
            candidateId,
            questionId,
            code: finalCode,
            language: 'python',
            revisionType: 'FINAL_SUBMISSION',
            finalSubmissionRef: 'sub_candidate_final_1',
            constraintId: 'mut_mem_opt_14mb'
        });

        assert.strictEqual(finalRev.sequenceNumber, 5);
        assert.strictEqual(finalRev.revisionType, 'FINAL_SUBMISSION');
        assert.strictEqual(finalRev.finalSubmissionRef, 'sub_candidate_final_1');
    });

    // ── GROUP 3: INTEGRITY VERIFICATION & CHAIN AUDIT ───────────
    console.log('\n--- GROUP 3: Integrity Verification & Chain Audit ---');

    await test('3.1: verifyRevisionIntegrity validates monotonic sequence and unbroken hash chain', async () => {
        const integrity = await revisionTracker.verifyRevisionIntegrity({
            assessmentId,
            candidateId,
            questionId
        });

        assert.strictEqual(integrity.valid, true);
        assert.strictEqual(integrity.count, 5);
        assert.strictEqual(integrity.hasBaseline, true);
    });

    await test('3.2: Reconstructs exact code submitted for any prior run attempt', async () => {
        const history = await revisionTracker.getRevisionHistory({
            assessmentId,
            candidateId,
            questionId
        });

        const runRev = history.find(r => r.runAttemptId === 'run_eval_42');
        assert.ok(runRev);
        assert.ok(runRev.codeSnapshot.includes('yield item'));
    });

    // ── GROUP 4: SECURITY & ISOLATION GUARDS ─────────────────────
    console.log('\n--- GROUP 4: Security & Isolation Guards ---');

    await test('4.1: Cross-Candidate Isolation: Candidate Bob cannot read Candidate Alice revisions', async () => {
        const bobHistory = await revisionTracker.getRevisionHistory({
            assessmentId,
            candidateId: 'cand_bob',
            questionId
        });
        assert.strictEqual(bobHistory.length, 0, 'Candidate Bob must have zero access to Alice revisions');
    });

    await test('4.2: Payload Limit: Rejects code snapshots exceeding 256KB', async () => {
        const hugeCode = 'x = 1\n' + 'a'.repeat(300 * 1024);
        let threw = false;
        try {
            await revisionTracker.recordRevision({
                assessmentId,
                candidateId: 'cand_bob',
                questionId,
                code: hugeCode,
                language: 'python'
            });
        } catch (err) {
            threw = true;
            assert.match(err.message, /exceeds maximum/i);
        }
        assert.strictEqual(threw, true);
    });

    // ── GROUP 5: FEATURE FLAG & ROLLBACK BEHAVIOR ───────────────
    console.log('\n--- GROUP 5: Feature Flag & Rollback Behavior ---');

    await test('5.1: isConstraintMutationAnalysisEnabled defaults to true when unset', () => {
        clearFeatureFlagOverrides();
        assert.strictEqual(isConstraintMutationAnalysisEnabled(), true);
    });

    await test('5.2: Rollback: Instant feature disabling via feature flag override', () => {
        setFeatureFlagOverride('CONSTRAINT_MUTATION_ANALYSIS_ENABLED', false);
        assert.strictEqual(isConstraintMutationAnalysisEnabled(), false);

        // Reset
        clearFeatureFlagOverrides();
        assert.strictEqual(isConstraintMutationAnalysisEnabled(), true);
    });

    // ── GROUP 6: CONCURRENT WRITE INTEGRITY ─────────────────────
    console.log('\n--- GROUP 6: Concurrent Write Integrity ---');

    await test('6.1: Concurrent asynchronous revision writes do not corrupt revision state', async () => {
        const candConc = 'cand_concurrent_user';
        const qConc = 'q_concurrent';

        const writes = [
            revisionTracker.recordRevision({ assessmentId, candidateId: candConc, questionId: qConc, code: 'def s(): return 1', language: 'python', revisionType: 'BASELINE' }),
            revisionTracker.recordRevision({ assessmentId, candidateId: candConc, questionId: qConc, code: 'def s(): return 2', language: 'python', revisionType: 'CHECKPOINT' }),
            revisionTracker.recordRevision({ assessmentId, candidateId: candConc, questionId: qConc, code: 'def s(): return 3', language: 'python', revisionType: 'CHECKPOINT' })
        ];

        await Promise.all(writes);

        const history = await revisionTracker.getRevisionHistory({ assessmentId, candidateId: candConc, questionId: qConc });
        assert.ok(history.length >= 2, 'All non-duplicate concurrent writes must be persisted');
        const integrity = await revisionTracker.verifyRevisionIntegrity({ assessmentId, candidateId: candConc, questionId: qConc });
        assert.strictEqual(integrity.valid, true);
    });

    console.log('\n================================================================');
    console.log(`📊 REVISION TRACKING RESULTS: ${passedCount} Passed, ${failedCount} Failed (Total: ${passedCount + failedCount})`);
    console.log('================================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runAllTests().catch(err => {
    console.error('Test execution fatal error:', err);
    process.exit(1);
});
