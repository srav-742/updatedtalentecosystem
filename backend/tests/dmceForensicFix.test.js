/**
 * Hire1Percent DMCE Forensic Fix - Regression & End-to-End Test Suite
 * 
 * Verifies all 5 core fixes:
 * Fix A: Test-Case Resolution Pipeline (configured testCases, examples fallback, falsy preservation)
 * Fix B: Python Execution Engine & Empty-String Handling (0-param, 1-param, multi-param, whitespace)
 * Fix C: Baseline Execution Integrity & Error Classification (no legacy runner fallback bypass)
 * Fix D: Mutation Workflow, Persistence & Idempotency
 * Fix E: Recruiter Configurable Memory Constraints (14 MB default, custom bounds, sandbox contract)
 */

const assert = require('assert');
const { 
    resolveTestCasesForQuestion, 
    getBaselineTestCases, 
    getMutationTestCases,
    maskHiddenTestCases 
} = require('../utils/testCaseResolver');

const {
    prepareRunnableCode,
    executeCodeIsolated,
    executeAgainstTestCases,
    normalizeOutput
} = require('../services/codeExecutionService');

const {
    createMemoryMutationContract,
    selectMutationForQuestion,
    DEFAULT_MUTATION_MEMORY_LIMIT_MB
} = require('../services/dmce/mutationRegistry');

const {
    initSession,
    getSession,
    recordBaselineExecution,
    activateMutation,
    recordMutationExecution,
    LIFECYCLE_STATES
} = require('../services/dmce/sessionManager');

const {
    createSession,
    applyResourceMutation,
    execute,
    destroySession
} = require('../services/dmce/sandboxManager');

const {
    activateCandidateMutation
} = require('../services/dmce/mutationEngine');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        throw err;
    }
}

async function runAsyncTest(name, fn) {
    totalTests++;
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        throw err;
    }
}

async function runSuite() {
    console.log('\n======================================================');
    console.log('HIRE1PERCENT DMCE FORENSIC FIX REGRESSION TEST SUITE');
    console.log('======================================================\n');

    // ── FIX A: TEST CASE RESOLUTION PIPELINE ───────────────────
    console.log('--- FIX A: Test-Case Resolution Pipeline ---');

    runTest('A1: Uses configured testCases when present and valid', () => {
        const question = {
            _id: 'q1',
            testCases: [
                { input: '5', expectedOutput: '25', isHidden: false },
                { input: '10', expectedOutput: '100', isHidden: true }
            ],
            examples: [
                { input: '1', output: '1' }
            ]
        };
        const result = resolveTestCasesForQuestion(question);
        assert.strictEqual(result.source, 'testCases');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.testCases.length, 2);
        assert.strictEqual(result.testCases[0].input, '5');
        assert.strictEqual(result.testCases[0].expectedOutput, '25');
        assert.strictEqual(result.testCases[1].isHidden, true);
    });

    runTest('A2: Falls back to examples when testCases is empty array', () => {
        const question = {
            _id: 'q2',
            testCases: [],
            examples: [
                { input: '"hello"', output: '"olleh"', explanation: 'reverse' },
                { input: '""', output: '""', explanation: 'empty string' }
            ]
        };
        const result = resolveTestCasesForQuestion(question);
        assert.strictEqual(result.source, 'examples');
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.testCases.length, 2);
        assert.strictEqual(result.testCases[0].input, '"hello"');
        assert.strictEqual(result.testCases[0].expectedOutput, '"olleh"');
        assert.strictEqual(result.testCases[1].input, '""');
        assert.strictEqual(result.testCases[1].expectedOutput, '""');
    });

    runTest('A3: Falls back to examples when testCases is null or undefined', () => {
        const question = {
            _id: 'q3',
            examples: [
                { input: '42', output: '84' }
            ]
        };
        const result = resolveTestCasesForQuestion(question);
        assert.strictEqual(result.source, 'examples');
        assert.strictEqual(result.testCases.length, 1);
        assert.strictEqual(result.testCases[0].input, '42');
        assert.strictEqual(result.testCases[0].expectedOutput, '84');
    });

    runTest('A4: Preserves falsy values: empty-string "", zero 0, boolean false', () => {
        const question = {
            _id: 'q4',
            testCases: [
                { input: '', expectedOutput: '', isHidden: false },
                { input: 0, expectedOutput: 0, isHidden: false },
                { input: false, expectedOutput: false, isHidden: true }
            ]
        };
        const result = resolveTestCasesForQuestion(question);
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.testCases[0].input, '');
        assert.strictEqual(result.testCases[0].expectedOutput, '');
        assert.strictEqual(result.testCases[1].input, '0');
        assert.strictEqual(result.testCases[1].expectedOutput, '0');
        assert.strictEqual(result.testCases[2].input, 'false');
        assert.strictEqual(result.testCases[2].expectedOutput, 'false');
    });

    runTest('A5: Preserves whitespace-only input "   "', () => {
        const question = {
            _id: 'q5',
            examples: [
                { input: '   ', output: '   ' }
            ]
        };
        const result = resolveTestCasesForQuestion(question);
        assert.strictEqual(result.testCases[0].input, '   ');
        assert.strictEqual(result.testCases[0].expectedOutput, '   ');
    });

    runTest('A6: Returns structured TEST_CONFIGURATION_ERROR when no valid test cases or examples exist', () => {
        const question = {
            _id: 'q6',
            testCases: [],
            examples: []
        };
        const result = resolveTestCasesForQuestion(question);
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.status, 'TEST_CONFIGURATION_ERROR');
        assert.strictEqual(result.testCases.length, 0);
    });

    runTest('A7: Filters malformed test cases without throwing unhandled exceptions', () => {
        const question = {
            _id: 'q7',
            testCases: [
                { foo: 'bar' }, // completely invalid
                { input: '123', expectedOutput: '321' }
            ]
        };
        const result = resolveTestCasesForQuestion(question);
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.testCases.length, 1);
        assert.strictEqual(result.testCases[0].input, '123');
    });

    runTest('A8: Correctly separates baseline vs mutation test cases', () => {
        const question = {
            _id: 'q8',
            testCases: [
                { input: '1', expectedOutput: '1', isHidden: false, isMutationSuite: false },
                { input: '2', expectedOutput: '2', isHidden: true, isMutationSuite: false },
                { input: '3', expectedOutput: '3', isHidden: true, isMutationSuite: true }
            ]
        };
        const all = resolveTestCasesForQuestion(question).testCases;
        const baseline = getBaselineTestCases(all);
        const mutation = getMutationTestCases(all);
        assert.strictEqual(baseline.length, 2);
        assert.strictEqual(mutation.length, 1);
        assert.strictEqual(mutation[0].input, '3');
    });

    runTest('A9: maskHiddenTestCases sanitizes private inputs and outputs for client presentation', () => {
        const testCases = [
            { id: 't1', input: '1', expectedOutput: '1', isHidden: false, passed: true },
            { id: 't2', input: 'secret_input', expectedOutput: 'secret_out', isHidden: true, passed: true }
        ];
        const masked = maskHiddenTestCases(testCases);
        assert.strictEqual(masked[0].input, '1');
        assert.strictEqual(masked[0].expectedOutput, '1');
        assert.strictEqual(masked[1].input, undefined);
        assert.strictEqual(masked[1].expectedOutput, undefined);
        assert.strictEqual(masked[1].isHidden, true);
    });

    // ── FIX B: PYTHON EXECUTION & EMPTY-STRING HANDLING ──────────
    console.log('\n--- FIX B: Python Execution Engine & Empty-String Handling ---');

    await runAsyncTest('B1: Reverse a string - standard input "hello"', async () => {
        const code = `def solution(s):\n    return s[::-1]`;
        const result = await executeCodeIsolated(code, 'python', 'hello');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.stdout.trim(), 'olleh');
    });

    await runAsyncTest('B2: Reverse a string - explicit empty-string input ""', async () => {
        const code = `def solution(s):\n    return s[::-1]`;
        const result = await executeCodeIsolated(code, 'python', '');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(normalizeOutput(result.stdout), '');
    });

    await runAsyncTest('B3: Reverse a string - whitespace-only input "   "', async () => {
        const code = `def solution(s):\n    return s[::-1]`;
        const result = await executeCodeIsolated(code, 'python', '   ');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.stdout.replace(/\r?\n$/, ''), '   ');
    });

    await runAsyncTest('B4: Numeric zero input 0', async () => {
        const code = `def solution(n):\n    return n * 2`;
        const result = await executeCodeIsolated(code, 'python', '0');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.stdout.trim(), '0');
    });

    await runAsyncTest('B5: Negative numbers', async () => {
        const code = `def solution(n):\n    return abs(n)`;
        const result = await executeCodeIsolated(code, 'python', '-42');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.stdout.trim(), '42');
    });

    await runAsyncTest('B6: Array / List input', async () => {
        const code = `def solution(arr):\n    return sorted(arr)[-2] if len(arr) >= 2 else None`;
        const result = await executeCodeIsolated(code, 'python', '[10, 5, 20, 8]');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.stdout.trim(), '10');
    });

    await runAsyncTest('B7: Multiple arguments input [a, b]', async () => {
        const code = `def solution(a, b):\n    return a + b`;
        const result = await executeCodeIsolated(code, 'python', '[15, 27]');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.stdout.trim(), '42');
    });

    await runAsyncTest('B8: Zero-parameter function', async () => {
        const code = `def solution():\n    return "no args"`;
        const result = await executeCodeIsolated(code, 'python', '');
        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.stdout.trim(), 'no args');
    });

    await runAsyncTest('B9: Python runtime error captured as error without false positive pass', async () => {
        const code = `def solution(s):\n    return 1 / 0`;
        const result = await executeCodeIsolated(code, 'python', 'foo');
        assert.notStrictEqual(result.status, 'SUCCESS');
        assert.ok((result.stderr || '').includes('ZeroDivisionError'));
    });

    // ── FIX C: BASELINE EXECUTION INTEGRITY ─────────────────────
    console.log('\n--- FIX C: Baseline Execution Integrity ---');

    await runAsyncTest('C1: All baseline tests pass -> baselinePassed = true', async () => {
        const code = `def solution(s):\n    return s[::-1]`;
        const testCases = [
            { input: 'hello', expectedOutput: 'olleh', isHidden: false },
            { input: '', expectedOutput: '', isHidden: false },
            { input: 'racecar', expectedOutput: 'racecar', isHidden: true }
        ];

        const suiteResult = await executeAgainstTestCases(code, 'python', testCases);
        assert.strictEqual(suiteResult.status, 'ALL_PASSED');
        assert.strictEqual(suiteResult.passed, 3);
        assert.strictEqual(suiteResult.failed, 0);
    });

    await runAsyncTest('C2: Failing test case prevents baselinePassed', async () => {
        const buggyCode = `def solution(s):\n    return "wrong"`;
        const testCases = [
            { input: 'hello', expectedOutput: 'olleh', isHidden: false }
        ];
        const suiteResult = await executeAgainstTestCases(buggyCode, 'python', testCases);
        assert.strictEqual(suiteResult.status, 'FAILED');
        assert.strictEqual(suiteResult.passed, 0);
        assert.strictEqual(suiteResult.failed, 1);
    });

    // ── FIX D: MUTATION WORKFLOW & IDEMPOTENCY ──────────────────
    console.log('\n--- FIX D: Mutation Workflow & Idempotency ---');

    runTest('D1: Passing baseline activates mutation idempotently', () => {
        const sessionId = `test-session-${Date.now()}`;
        createSession(sessionId, 'q_mut_test', { memoryLimitMb: 14 });
        initSession({
            sessionId,
            candidateId: 'cand1',
            jobId: 'job1',
            questionId: 'q_mut_test',
            language: 'python',
            config: { memoryLimitMb: 14 }
        });

        // Record baseline execution
        const baselineResult = recordBaselineExecution(sessionId, 'def solution(s): return s[::-1]', 'python', {
            status: 'ALL_PASSED',
            passed: 3,
            total: 3,
            publicPassed: 2,
            publicTotal: 2,
            hiddenPassed: 1,
            hiddenTotal: 1
        });

        assert.strictEqual(baselineResult.state, LIFECYCLE_STATES.BASELINE_VALIDATED);

        // Activate mutation using activateCandidateMutation
        const actResult1 = activateCandidateMutation(sessionId, 'def solution(s): return s[::-1]');
        assert.strictEqual(actResult1.activated, true);
        assert.strictEqual(actResult1.alreadyActive, false);
        assert.strictEqual(actResult1.mutation.resourceConstraints.memoryLimitMb, 14);

        // Repeated activation is idempotent
        const actResult2 = activateCandidateMutation(sessionId, 'def solution(s): return s[::-1]');
        assert.strictEqual(actResult2.activated, true);
        assert.strictEqual(actResult2.alreadyActive, true);
        assert.strictEqual(actResult2.mutation.mutationId, actResult1.mutation.mutationId);
    });

    runTest('D2: Failing baseline does not allow mutation activation', () => {
        const sessionId = `test-session-fail-${Date.now()}`;
        createSession(sessionId, 'q_mut_fail', { memoryLimitMb: 14 });
        initSession({
            sessionId,
            candidateId: 'cand2',
            jobId: 'job1',
            questionId: 'q_mut_fail',
            language: 'python'
        });

        // Record incomplete baseline
        recordBaselineExecution(sessionId, 'def solution(s): return "wrong"', 'python', {
            status: 'FAILED',
            passed: 1,
            total: 2
        });

        assert.throws(() => {
            activateCandidateMutation(sessionId, 'def solution(s): return "wrong"');
        }, /Candidate must complete and pass Stage-1 baseline validation/);
    });

    // ── FIX E: RECRUITER CONFIGURABLE MEMORY LIMIT ───────────────
    console.log('\n--- FIX E: Recruiter Configurable Memory Limits ---');

    runTest('E1: Default memory target is 14 MB', () => {
        assert.strictEqual(DEFAULT_MUTATION_MEMORY_LIMIT_MB, 14);
        const contract = createMemoryMutationContract();
        assert.strictEqual(contract.resourceConstraints.memoryLimitMb, 14);
        assert.strictEqual(contract.id, 'mut_mem_opt_14mb');
    });

    runTest('E2: Recruiter configured limit (e.g. 24 MB) creates custom contract with exact limit', () => {
        const contract = createMemoryMutationContract(24);
        assert.strictEqual(contract.resourceConstraints.memoryLimitMb, 24);
        assert.strictEqual(contract.mutationId, 'mut_mem_opt_24mb');
        assert.ok(contract.description.includes('24 MB'));
    });

    runTest('E3: selectMutationForQuestion selects configured memory limit when question specifies it', () => {
        const questionWith32Mb = {
            _id: 'q_custom_mem',
            dynamicMutation: {
                enabled: true,
                memoryLimitMb: 32
            }
        };
        const contract = selectMutationForQuestion(questionWith32Mb);
        assert.strictEqual(contract.resourceConstraints.memoryLimitMb, 32);
        assert.strictEqual(contract.id, 'mut_mem_opt_32mb');
    });

    runTest('E4: Session initialization propagates memoryLimitMb into active constraints', () => {
        const sid = `sess-custom-mem-${Date.now()}`;
        initSession({
            sessionId: sid,
            candidateId: 'cand3',
            jobId: 'job1',
            questionId: 'q3',
            language: 'python',
            config: { memoryLimitMb: 28 }
        });
        const sess = getSession(sid);
        assert.strictEqual(sess.config.memoryLimitMb, 28);
    });

    runTest('E5: Sandbox resource mutation applies the configured memory limit', () => {
        createSession('sb-test');
        const contract = createMemoryMutationContract(20);
        const updated = applyResourceMutation('sb-test', contract);
        assert.strictEqual(updated.currentConstraints.memoryLimitMb, 20);
        destroySession('sb-test');
    });

    console.log('\n======================================================');
    console.log(`ALL ${passedTests}/${totalTests} FORENSIC FIX REGRESSION TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');
}

runSuite().catch(err => {
    console.error('\nTEST SUITE FAILED:', err);
    process.exit(1);
});
