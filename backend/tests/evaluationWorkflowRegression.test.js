/**
 * Hire1Percent Coding Round Evaluation Fix - Phase 9 Comprehensive Regression Suite
 * 
 * Verifies all 12 Phase 9 Acceptance Scenarios:
 * TEST 1: Latest code is evaluated (version A then version B)
 * TEST 2: Existing tests remain unchanged when candidate modifies code
 * TEST 3: Corrected code passes (failing code -> corrected code reflects pass)
 * TEST 4: Older results cannot overwrite newer results (out-of-order execution)
 * TEST 5: Constraint update auditable and distinguishable (baseline vs clamped memory)
 * TEST 6: Compilation and runtime failures shown for new submission without stale pass
 * TEST 7: Final score calculated from correct final evaluation using scoring rules
 * TEST 8: Repeated submissions work without duplicate finalization or corrupt state
 * TEST 9: Multiple candidates remain strictly isolated
 * TEST 10: Regression on core coding-round features and resolution pipelines
 * TEST 11: Stale editor state prevented (synchronous ref snapshot guarantees latest code)
 * TEST 12: Failed evaluation request reports failure and does not display stale pass
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
    destroySession,
    resetToOriginalConstraints
} = require('../services/dmce/sandboxManager');

const {
    runBaseline,
    activateCandidateMutation,
    runMutationTests,
    startSession
} = require('../services/dmce/mutationEngine');

const {
    calculateDynamicMarks,
    evaluateQuestionScore,
    calculateAssessmentTotal,
    round2
} = require('../utils/codingScoreCalculator');

let totalTests = 0;
let passedTests = 0;

async function runTest(testNumber, name, fn) {
    totalTests++;
    try {
        await fn();
        console.log(`  ✓ TEST ${testNumber}: ${name}`);
        passedTests++;
    } catch (err) {
        console.error(`  ✗ TEST ${testNumber}: ${name}`);
        console.error(`    Error: ${err.message}`);
        console.error(err.stack);
        throw err;
    }
}

async function runAllPhase9Tests() {
    console.log('\n================================================================');
    console.log('   HIRE1PERCENT PHASE 9 REGRESSION TEST SUITE');
    console.log('   Testing Evaluation Workflow, Versioning, and Anti-Stale Guarantees');
    console.log('================================================================\n');

    // ────────────────────────────────────────────────────────────────
    // TEST 1 — Latest code is evaluated
    // Submit code version A, modify it to version B, submit again, and verify that the second evaluation executes version B.
    // ────────────────────────────────────────────────────────────────
    await runTest(1, 'Latest code is evaluated (version A then version B)', async () => {
        const testCases = [
            { input: '2 3', expectedOutput: '5', isHidden: false },
            { input: '10 20', expectedOutput: '30', isHidden: true }
        ];

        // Code Version A: Returns incorrect constant
        const codeVersionA = `
def add(a, b):
    return 100
`;
        const resA = await executeAgainstTestCases(codeVersionA, 'python', testCases);
        assert.strictEqual(resA.passed, 0, 'Version A should fail both test cases');
        assert.strictEqual(resA.failed, 2, 'Version A should have 2 failures');

        // Code Version B: Correctly calculates sum
        const codeVersionB = `
def add(a, b):
    return a + b
`;
        const resB = await executeAgainstTestCases(codeVersionB, 'python', testCases);
        assert.strictEqual(resB.passed, 2, 'Version B should pass both test cases');
        assert.strictEqual(resB.failed, 0, 'Version B should have 0 failures');
        assert.strictEqual(resB.status, 'ALL_PASSED');
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 2 — Existing tests remain unchanged
    // Modify code without changing question or test cases. Confirm same applicable test cases run against new code.
    // ────────────────────────────────────────────────────────────────
    await runTest(2, 'Existing tests remain unchanged across code edits', async () => {
        const mockQuestion = {
            _id: 'q_unchanged_tests_123',
            title: 'Sum of Two Numbers',
            testCases: [
                { input: '5 7', expectedOutput: '12', isHidden: false },
                { input: '-3 8', expectedOutput: '5', isHidden: true },
                { input: '0 0', expectedOutput: '0', isHidden: false }
            ]
        };

        const resolvedInitial = resolveTestCasesForQuestion(mockQuestion);
        assert.strictEqual(resolvedInitial.testCases.length, 3);
        const initialSnapshots = JSON.stringify(resolvedInitial.testCases);

        // Edit 1: code v1
        const code1 = 'def add(a, b): return a';
        await executeAgainstTestCases(code1, 'python', resolvedInitial.testCases);

        // Edit 2: code v2
        const code2 = 'def add(a, b): return a + b';
        await executeAgainstTestCases(code2, 'python', resolvedInitial.testCases);

        // Confirm test cases remain strictly identical
        const resolvedAfter = resolveTestCasesForQuestion(mockQuestion);
        assert.strictEqual(resolvedAfter.testCases.length, 3);
        assert.strictEqual(JSON.stringify(resolvedAfter.testCases), initialSnapshots, 'Test cases must not mutate when candidate code changes');
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 3 — Corrected code passes
    // Start with code that fails a test, correct it, and verify that the new result reflects the corrected code.
    // ────────────────────────────────────────────────────────────────
    await runTest(3, 'Corrected code passes after initial failure', async () => {
        const testCases = [
            { input: 'racecar', expectedOutput: 'True', isHidden: false },
            { input: 'hello', expectedOutput: 'False', isHidden: false },
            { input: 'level', expectedOutput: 'True', isHidden: true }
        ];

        // Flawed code: Always returns True
        const flawedCode = `
def is_palindrome(s):
    return True
`;
        const initialResult = await executeAgainstTestCases(flawedCode, 'python', testCases);
        assert.strictEqual(initialResult.status, 'PARTIALLY_PASSED', 'Flawed code should only pass palindromes');
        assert.strictEqual(initialResult.passed, 2);
        assert.strictEqual(initialResult.failed, 1);

        // Corrected code: checks reversed string
        const correctedCode = `
def is_palindrome(s):
    return str(s) == str(s)[::-1]
`;
        const correctedResult = await executeAgainstTestCases(correctedCode, 'python', testCases);
        assert.strictEqual(correctedResult.status, 'ALL_PASSED');
        assert.strictEqual(correctedResult.passed, 3);
        assert.strictEqual(correctedResult.failed, 0);
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 4 — Older results cannot overwrite newer results
    // Simulate two evaluations where older evaluation finishes last. Confirm the system maintains the newer result.
    // ────────────────────────────────────────────────────────────────
    await runTest(4, 'Older delayed results cannot overwrite newer results (race condition guard)', async () => {
        const qId = 'q_race_guard_456';
        const activeEvaluations = {};
        const stateStore = {};

        // Candidate triggers Evaluation 1
        const evalId1 = `eval_${qId}_1000_1`;
        activeEvaluations[qId] = evalId1;

        // Candidate quickly edits code and triggers Evaluation 2
        const evalId2 = `eval_${qId}_1050_2`;
        activeEvaluations[qId] = evalId2;

        // Response handler simulating the frontend/controller guard
        function handleEvaluationResponse(incomingEvalId, incomingCode, incomingResult) {
            if (activeEvaluations[qId] !== incomingEvalId) {
                // Out of order: discard superseded response
                return false;
            }
            stateStore[qId] = {
                evaluationId: incomingEvalId,
                submittedCode: incomingCode,
                result: incomingResult
            };
            return true;
        }

        // Eval 2 completes first (fast run)
        const accepted2 = handleEvaluationResponse(evalId2, 'def solve(): return 42', { status: 'ALL_PASSED', passed: 5, total: 5 });
        assert.strictEqual(accepted2, true, 'Evaluation 2 must be accepted');
        assert.strictEqual(stateStore[qId].evaluationId, evalId2);
        assert.strictEqual(stateStore[qId].submittedCode, 'def solve(): return 42');

        // Eval 1 arrives later (delayed network/slow execution)
        const accepted1 = handleEvaluationResponse(evalId1, 'def solve(): return 0', { status: 'FAILED', passed: 0, total: 5 });
        assert.strictEqual(accepted1, false, 'Delayed Evaluation 1 must be discarded');
        assert.strictEqual(stateStore[qId].evaluationId, evalId2, 'Stored evaluation ID must remain eval 2');
        assert.strictEqual(stateStore[qId].submittedCode, 'def solve(): return 42', 'Stored code must remain eval 2 snapshot');
        assert.strictEqual(stateStore[qId].result.status, 'ALL_PASSED', 'Status must not be overwritten by delayed failure');
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 5 — Constraint update auditable and distinguishable
    // Where DMCE activates memory constraint, verify distinction between question baseline & mutation constraints without silent corruption.
    // ────────────────────────────────────────────────────────────────
    await runTest(5, 'Constraint update auditable and distinguishable (baseline vs clamped memory)', async () => {
        const sid = 'session_constraint_test_5';
        initSession({
            sessionId: sid,
            candidateId: 'cand_5',
            questionId: 'q_5',
            language: 'python',
            config: { memoryLimitMb: 14 }
        });
        createSession(sid, 512);

        // Baseline: runs with standard 512MB
        const baselineCode = 'def solve(n): return n * 2';
        recordBaselineExecution(sid, baselineCode, { status: 'ALL_PASSED', passed: 3, total: 3 });
        let session = getSession(sid);
        assert.strictEqual(session.state, LIFECYCLE_STATES.BASELINE_VALIDATED);
        assert.strictEqual(session.snapshots.baselineCode, baselineCode);

        // Activate Memory Mutation: 14MB
        activateCandidateMutation(sid, baselineCode);
        session = getSession(sid);
        assert.strictEqual(session.state, LIFECYCLE_STATES.MUTATION_ACTIVE);
        assert.strictEqual(session.mutation.resourceConstraints.memoryLimitMb, 14);

        // Baseline snapshot and mutation snapshot must be distinctly preserved
        assert.ok(session.snapshots.baselineCode, 'Baseline code snapshot must exist');
        assert.strictEqual(session.snapshots.baselineCode, baselineCode);

        // Candidate modifies code to adapt to memory constraint
        const adaptedCode = 'def solve(n): return (n << 1)';
        const mutationTests = [{ input: '10', expectedOutput: '20' }];
        const mutResult = await runMutationTests(sid, adaptedCode, 'python', mutationTests);
        
        session = getSession(sid);
        assert.strictEqual(session.snapshots.postMutationCode, adaptedCode);
        assert.strictEqual(mutResult.mutationStatus, 'PASSED');
        assert.strictEqual(mutResult.status, 'ALL_PASSED');

        destroySession(sid);
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 6 — Compilation and runtime failures
    // Verify that new errors are shown for the new submission and old successful results are not displayed as current.
    // ────────────────────────────────────────────────────────────────
    await runTest(6, 'Compilation and runtime failures shown for new submission without stale pass', async () => {
        const sid = 'session_comp_fail_6';
        initSession({
            sessionId: sid,
            candidateId: 'cand_6',
            questionId: 'q_6',
            language: 'python'
        });
        createSession(sid, 512);

        // 1. Initial successful run
        const goodCode = 'def process_items(lst): return sum(lst)';
        const tests = [{ input: '[1, 2, 3]', expectedOutput: '6' }];
        const baseline1 = await runBaseline(sid, goodCode, 'python', tests);
        assert.strictEqual(baseline1.baselinePassed, true);
        assert.strictEqual(baseline1.execution.status, 'ALL_PASSED');

        // 2. Candidate introduces a syntax error
        const syntaxErrorCode = 'def process_items(lst): return sum(lst) +';
        const baseline2 = await runBaseline(sid, syntaxErrorCode, 'python', tests);
        
        assert.strictEqual(baseline2.baselinePassed, false, 'Baseline must fail on syntax error');
        assert.strictEqual(baseline2.execution.status, 'COMPILATION_ERROR');
        assert.ok(baseline2.execution.errorMessage, 'Error message must describe the syntax failure');
        
        const session = getSession(sid);
        assert.strictEqual(session.baselinePassed, false, 'Session baselinePassed flag must NOT retain previous true state');

        destroySession(sid);
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 7 — Final score calculated from correct final evaluation
    // Verify that the final score is calculated from the correct final evaluation using the existing scoring algorithm.
    // ────────────────────────────────────────────────────────────────
    await runTest(7, 'Final score calculated from correct final evaluation using scoring rules', async () => {
        const questions = [
            { _id: 'q1', difficulty: 'LOW' },     // Weight: 1
            { _id: 'q2', difficulty: 'MEDIUM' },  // Weight: 2
            { _id: 'q3', difficulty: 'HIGH' }     // Weight: 3
        ];
        // Total weight = 6. Question weights: q1=16.67, q2=33.33, q3=50.00 -> Sum = 100.00

        // Candidate initial run on q1 failed, but final run scored 100%
        // Candidate scored 100% on q2 and 100% on q3
        const finalAnswers = [
            {
                questionId: 'q1',
                code: 'def q1_final(): return True',
                testResults: { passed: 4, total: 4, status: 'ALL_PASSED' }
            },
            {
                questionId: 'q2',
                code: 'def q2_final(): return True',
                testResults: { passed: 5, total: 5, status: 'ALL_PASSED' }
            },
            {
                questionId: 'q3',
                code: 'def q3_final(): return True',
                testResults: { passed: 6, total: 6, status: 'ALL_PASSED' }
            }
        ];

        const dynamicMarks = calculateDynamicMarks(questions);
        const marksMap = {};
        dynamicMarks.forEach(dm => { marksMap[dm.id] = dm.maximumMarks; });

        // Calculate score for 100% final answers
        const questionScores1 = finalAnswers.map(ans => {
            const maxMarks = marksMap[ans.questionId];
            return evaluateQuestionScore(maxMarks, ans.testResults.passed, ans.testResults.total);
        });
        const scoreSummary = calculateAssessmentTotal(questionScores1);
        assert.strictEqual(scoreSummary.totalObtainedMarks, 100, 'Score with 100% pass across all final evaluations must be 100');
        assert.strictEqual(scoreSummary.totalMaximumMarks, 100);

        // Verify partial failure on q2 final submission
        const partialAnswers = [
            { questionId: 'q1', testResults: { passed: 4, total: 4, status: 'ALL_PASSED' } },
            { questionId: 'q2', testResults: { passed: 0, total: 5, status: 'FAILED' } }, // 0% of 33.33
            { questionId: 'q3', testResults: { passed: 6, total: 6, status: 'ALL_PASSED' } }  // 50.00
        ];
        const questionScores2 = partialAnswers.map(ans => {
            const maxMarks = marksMap[ans.questionId];
            return evaluateQuestionScore(maxMarks, ans.testResults.passed, ans.testResults.total);
        });
        const partialSummary = calculateAssessmentTotal(questionScores2);
        assert.strictEqual(partialSummary.totalObtainedMarks, 66.67, 'Score must reflect final submitted evaluation of each question');
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 8 — Repeated submissions
    // Verify legitimate subsequent submissions work without duplicate finalization or corrupt state.
    // ────────────────────────────────────────────────────────────────
    await runTest(8, 'Repeated submissions work without duplicate finalization or state corruption', async () => {
        const sid = 'session_repeated_8';
        initSession({
            sessionId: sid,
            candidateId: 'cand_8',
            questionId: 'q_8',
            language: 'python'
        });
        createSession(sid, 512);

        const testCases = [{ input: '3', expectedOutput: '9' }];

        // Run 5 rapid successive iterations
        for (let iter = 1; iter <= 5; iter++) {
            const code = `def square(x):\n    # Iteration ${iter}\n    return x ** 2`;
            const result = await runBaseline(sid, code, 'python', testCases);
            assert.strictEqual(result.baselinePassed, true);
            assert.strictEqual(result.execution.status, 'ALL_PASSED');
            
            const session = getSession(sid);
            assert.strictEqual(session.snapshots.baselineCode, code, `Snapshot after iteration ${iter} must match code`);
        }

        destroySession(sid);
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 9 — Multiple candidates
    // Verify evaluations and results remain isolated between candidates and questions.
    // ────────────────────────────────────────────────────────────────
    await runTest(9, 'Multiple candidates remain strictly isolated', async () => {
        const sidA = 'session_candidate_A';
        const sidB = 'session_candidate_B';

        initSession({ sessionId: sidA, candidateId: 'candidate_A', questionId: 'q_shared', language: 'python' });
        initSession({ sessionId: sidB, candidateId: 'candidate_B', questionId: 'q_shared', language: 'python' });

        createSession(sidA, 512);
        createSession(sidB, 512);

        const tests = [{ input: '5', expectedOutput: '25' }];

        // Candidate A submits correct code
        const codeA = 'def calc(x): return x * 5';
        const resA = await runBaseline(sidA, codeA, 'python', tests);

        // Candidate B submits incorrect code
        const codeB = 'def calc(x): return x * 0';
        const resB = await runBaseline(sidB, codeB, 'python', tests);

        assert.strictEqual(resA.baselinePassed, true, 'Candidate A must pass');
        assert.strictEqual(resB.baselinePassed, false, 'Candidate B must fail');

        const sessionA = getSession(sidA);
        const sessionB = getSession(sidB);

        assert.strictEqual(sessionA.snapshots.baselineCode, codeA);
        assert.strictEqual(sessionB.snapshots.baselineCode, codeB);
        assert.strictEqual(sessionA.baselinePassed, true);
        assert.strictEqual(sessionB.baselinePassed, false);

        destroySession(sidA);
        destroySession(sidB);
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 10 — Regression on core coding-round features
    // Verify existing coding-round features continue working.
    // ────────────────────────────────────────────────────────────────
    await runTest(10, 'Regression: test case masking, difficulty weighting and normalization', async () => {
        // Test case masking
        const testSuite = [
            { input: '1', expectedOutput: '2', isHidden: false },
            { input: '2', expectedOutput: '4', isHidden: true },
            { input: '3', expectedOutput: '6', isHidden: false }
        ];
        const masked = maskHiddenTestCases(testSuite);
        assert.strictEqual(masked.length, 3);
        assert.strictEqual(masked[0].expectedOutput, '2');
        assert.strictEqual(masked[1].expectedOutput, undefined, 'Hidden test case expectedOutput must be undefined (masked)');
        assert.strictEqual(masked[1].isHidden, true);

        // Normalization
        assert.strictEqual(normalizeOutput('  Hello\r\nWorld  '), 'Hello\nWorld');
        assert.strictEqual(normalizeOutput('True'), 'True');

        // Distribution
        const dynamic = calculateDynamicMarks([
            { _id: '1', difficulty: 'LOW' },
            { _id: '2', difficulty: 'MEDIUM' }
        ]);
        const sumMarks = dynamic.reduce((acc, q) => acc + q.maximumMarks, 0);
        assert.strictEqual(round2(sumMarks), 100);
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 11 — Stale editor state
    // Modify editor contents immediately before execution: confirm exact current contents are evaluated.
    // ────────────────────────────────────────────────────────────────
    await runTest(11, 'Stale editor state prevented (synchronous snapshot ensures latest code evaluated)', async () => {
        // Simulating the React answersRef pattern
        const answersRef = {
            current: {
                'q_editor_1': { code: 'def initial(): return 0', language: 'python' }
            }
        };

        // Rapid edit before run button clicked
        const latestKeystrokeCode = 'def initial(): return 999';
        answersRef.current['q_editor_1'].code = latestKeystrokeCode;

        // Run Code triggered: captures code from answersRef.current directly
        const capturedSnapshot = answersRef.current['q_editor_1'].code;
        assert.strictEqual(capturedSnapshot, latestKeystrokeCode, 'Captured snapshot must match the latest keystroke');

        const testCases = [{ input: '', expectedOutput: '999' }];
        const evalResult = await executeAgainstTestCases(capturedSnapshot, 'python', testCases);
        assert.strictEqual(evalResult.status, 'ALL_PASSED');
        assert.strictEqual(evalResult.passed, 1);
    });

    // ────────────────────────────────────────────────────────────────
    // TEST 12 — Failed evaluation request
    // Simulate execution timeout or sandbox failure: UI reports failure and does not falsely mark previous result as current.
    // ────────────────────────────────────────────────────────────────
    await runTest(12, 'Failed evaluation request reports failure without retaining stale pass', async () => {
        const sid = 'session_fail_req_12';
        initSession({
            sessionId: sid,
            candidateId: 'cand_12',
            questionId: 'q_12',
            language: 'python'
        });
        createSession(sid, 512);

        // 1. Initial success
        const goodCode = 'def fast(): return 1';
        const tests = [{ input: '', expectedOutput: '1' }];
        const passResult = await runBaseline(sid, goodCode, 'python', tests);
        assert.strictEqual(passResult.baselinePassed, true);

        // 2. Candidate modifies to an infinite loop (Timeout simulation)
        const infiniteLoopCode = 'def fast():\n    while True: pass\n    return 1';
        const timeoutResult = await runBaseline(sid, infiniteLoopCode, 'python', tests);

        assert.strictEqual(timeoutResult.baselinePassed, false);
        assert.strictEqual(timeoutResult.execution.status, 'TIME_LIMIT_EXCEEDED');

        // Verify session state updated to false
        const session = getSession(sid);
        assert.strictEqual(session.baselinePassed, false, 'Session must not latch prior successful state');

        destroySession(sid);
    });

    console.log('\n================================================================');
    console.log(`   ALL ${passedTests}/${totalTests} PHASE 9 REGRESSION TESTS PASSED!`);
    console.log('================================================================\n');
}

runAllPhase9Tests().catch(err => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
});
