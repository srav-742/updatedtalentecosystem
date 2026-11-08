const assert = require('assert');
const {
    SCORING_WEIGHTS,
    BUG_TYPES,
    BUG_SEVERITIES,
    round2,
    normalizeBugType,
    normalizeBugSeverity,
    isMeaningfulCode,
    createDeterministicZeroEvaluation,
    validateAndNormalizeEvaluation,
    createDeterministicFallbackEvaluation,
    buildStructuredFeedbackText
} = require('../utils/partialCreditCodingEvaluator');
const {
    evaluateQuestionScore,
    calculatePartialCreditScore,
    calculateAssessmentTotal,
    calculateDynamicMarks
} = require('../utils/codingScoreCalculator');

console.log('================================================================');
console.log('STARTING HIRE1PERCENT PARTIAL-CREDIT CODING EVALUATION TEST SUITE');
console.log('================================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, testFn) {
    try {
        testFn();
        console.log(`  ✓ PASSED: ${testName}`);
        testsPassed++;
    } catch (err) {
        console.error(`  ✗ FAILED: ${testName}`);
        console.error(`    Error: ${err.message}`);
        console.error(err.stack);
        testsFailed++;
    }
}

// ─── 1. FULLY CORRECT SOLUTION ───────────────────────────────────────────────
console.log('--- Test 1: Fully Correct Solution ---');
runTest('Fully correct solution scores 100 and marks Correct verdict', () => {
    const rawAiOutput = {
        algorithm: { score: 40, maxScore: 40, status: 'correct', reason: 'Optimal hash map approach.' },
        functionality: { score: 30, maxScore: 30, passedTests: 10, totalTests: 10, reason: 'All tests pass.' },
        testCoverage: { score: 15, maxScore: 15, reason: '100% test coverage.' },
        edgeCases: { score: 10, maxScore: 10, reason: 'Handles empty array and boundary targets.' },
        quality: { score: 5, maxScore: 5, reason: 'Clean O(n) implementation.' },
        bugs: [],
        finalScore: 100,
        confidence: 98,
        summary: 'Perfect solution.',
        suggestedCode: 'def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in seen:\n            return [seen[diff], i]\n        seen[n] = i\n'
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 25);
    assert.strictEqual(evaluated.finalScore, 100);
    assert.strictEqual(evaluated.correctnessVerdict, 'Correct');
    assert.strictEqual(evaluated.bugs.length, 0);
    assert.strictEqual(evaluated.algorithm.score, 40);
    assert.strictEqual(evaluated.functionality.score, 30);

    const questionScore = calculatePartialCreditScore(25, evaluated);
    assert.strictEqual(questionScore.obtainedMarks, 25);
    assert.strictEqual(questionScore.performancePercentage, 100);
});

// ─── 2. CORRECT ALGORITHM + MINOR BUG (E.g. Negative Numbers Init) ───────────
console.log('\n--- Test 2: Correct Algorithm + Minor Bug (Find Max with Init Bug) ---');
runTest('Candidate with correct loop/comparison but 0 init gets substantial partial credit', () => {
    // Problem: Find maximum number in array
    // Candidate initialized max_val = 0 instead of -infinity or nums[0], so negative arrays fail
    const rawAiOutput = {
        algorithm: {
            score: 36,
            maxScore: 40,
            status: 'correct',
            reason: 'Correct linear scan and comparative update pattern.'
        },
        functionality: {
            score: 21,
            maxScore: 30,
            passedTests: 7,
            totalTests: 10,
            reason: 'Fails for arrays with all-negative integers due to max_val = 0.'
        },
        testCoverage: {
            score: 11,
            maxScore: 15,
            reason: '7 of 10 standard test cases pass.'
        },
        edgeCases: {
            score: 4,
            maxScore: 10,
            reason: 'Fails all-negative numbers edge case.'
        },
        quality: {
            score: 4,
            maxScore: 5,
            reason: 'Clean loop logic.'
        },
        bugs: [
            {
                type: 'MINOR_IMPLEMENTATION_BUG',
                severity: 'minor',
                description: 'Initialized max value to 0 instead of nums[0] or -float("inf").',
                evidence: 'max_val = 0',
                impact: 'Causes failure when all numbers are negative.'
            },
            {
                type: 'EDGE_CASE_FAILURE',
                severity: 'minor',
                description: 'Negative-only arrays return 0 instead of highest negative value.',
                evidence: '[-5, -2, -9] returns 0 instead of -2.',
                impact: '3 test cases fail.'
            }
        ],
        finalScore: 76,
        confidence: 90,
        summary: 'Good algorithmic approach with a minor initialization bug for negative values.'
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 30);
    assert.strictEqual(evaluated.finalScore, 76);
    assert.strictEqual(evaluated.correctnessVerdict, 'Partially Correct');
    assert.strictEqual(evaluated.algorithm.score, 36);
    assert.ok(evaluated.finalScore >= 70, 'Must receive substantial partial credit for correct approach');

    const score = calculatePartialCreditScore(30, evaluated);
    assert.strictEqual(score.obtainedMarks, 22.8); // 76% of 30 marks = 22.8
});

// ─── 3. CORRECT ALGORITHM + EDGE-CASE FAILURE ────────────────────────────────
console.log('\n--- Test 3: Correct Algorithm + Edge-Case Failure ---');
runTest('High score with small deduction for isolated boundary failure', () => {
    // 9 out of 10 passed, failed only on empty array
    const rawAiOutput = {
        algorithm: { score: 40, maxScore: 40, status: 'correct', reason: 'Correct algorithm throughout.' },
        functionality: { score: 27, maxScore: 30, passedTests: 9, totalTests: 10, reason: '9 of 10 test cases passed.' },
        testCoverage: { score: 14, maxScore: 15, reason: 'High test coverage.' },
        edgeCases: { score: 5, maxScore: 10, reason: 'Did not check for empty input array.' },
        quality: { score: 5, maxScore: 5, reason: 'Well-structured, clean code.' },
        bugs: [
            {
                type: 'EDGE_CASE_FAILURE',
                severity: 'minor',
                description: 'Empty input throws TypeError or Index error.',
                evidence: 'No if not nums check at start of function.',
                impact: '1 test case failed.'
            }
        ],
        finalScore: 91,
        confidence: 95
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 40);
    assert.strictEqual(evaluated.finalScore, 91);
    assert.strictEqual(evaluated.correctnessVerdict, 'Correct');
    const score = calculatePartialCreditScore(40, evaluated);
    assert.strictEqual(score.obtainedMarks, 36.4); // 91% of 40 = 36.4
});

// ─── 4. CORRECT ALGORITHM + RUNTIME ERROR ─────────────────────────────────────
console.log('\n--- Test 4: Correct Algorithm + Runtime Error ---');
runTest('Award logic credit for demonstrable approach; do not assign zero on runtime error', () => {
    // Two Sum hash map solution with index lookup syntax error: seen[target-nums[i]] vs seen.has()
    const rawAiOutput = {
        algorithm: {
            score: 35,
            maxScore: 40,
            status: 'correct',
            reason: 'Demonstrates hash map complement strategy in O(n) time.'
        },
        functionality: {
            score: 5,
            maxScore: 30,
            passedTests: 0,
            totalTests: 10,
            reason: 'Runtime TypeError: Cannot read property of undefined.'
        },
        testCoverage: {
            score: 0,
            maxScore: 15,
            reason: 'Runtime crash prevented tests from executing.'
        },
        edgeCases: {
            score: 2,
            maxScore: 10,
            reason: 'Could not be verified due to runtime exception.'
        },
        quality: {
            score: 3,
            maxScore: 5,
            reason: 'Logic layout is sound despite runtime fault.'
        },
        bugs: [
            {
                type: 'RUNTIME_ERROR',
                severity: 'major',
                description: 'Attempted to access undefined property on map.',
                evidence: 'seen[diff].index',
                impact: 'Causes runtime failure on execution.'
            }
        ],
        finalScore: 45,
        confidence: 88
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 20);
    assert.strictEqual(evaluated.finalScore, 45);
    assert.strictEqual(evaluated.correctnessVerdict, 'Partially Correct');
    assert.ok(evaluated.algorithm.score >= 30, 'Algorithm credit must be awarded based on demonstrable approach');
    assert.ok(evaluated.obtainedMarks === undefined, 'Raw evaluation does not set marks until scaled');

    const score = calculatePartialCreditScore(20, evaluated);
    assert.strictEqual(score.obtainedMarks, 9); // 45% of 20 = 9 marks (NOT 0!)
});

// ─── 5. CORRECT APPROACH + INCOMPLETE IMPLEMENTATION ─────────────────────────
console.log('\n--- Test 5: Correct Approach + Incomplete Implementation ---');
runTest('Award credit for demonstrated logic, reduced according to completeness', () => {
    // Binary Search: has low, high, mid calculation and one branch, but didn't finish left branch
    const rawAiOutput = {
        algorithm: {
            score: 24,
            maxScore: 40,
            status: 'partial',
            reason: 'Binary search division by 2 and pointer movement demonstrated, but incomplete.'
        },
        functionality: {
            score: 8,
            maxScore: 30,
            passedTests: 3,
            totalTests: 10,
            reason: 'Incomplete loop only returns when target is at first mid position.'
        },
        testCoverage: {
            score: 4,
            maxScore: 15,
            reason: 'Passes 3 simple test cases where mid == target initially.'
        },
        edgeCases: {
            score: 2,
            maxScore: 10,
            reason: 'Boundary update missing.'
        },
        quality: {
            score: 3,
            maxScore: 5,
            reason: 'Clear variable names.'
        },
        bugs: [
            {
                type: 'INCOMPLETE_SOLUTION',
                severity: 'major',
                description: 'Right branch of binary search not fully implemented.',
                evidence: 'else block left empty with pass/comment.',
                impact: 'Fails searches in the upper half of the array.'
            }
        ],
        finalScore: 41,
        confidence: 90
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 20);
    assert.strictEqual(evaluated.finalScore, 41);
    assert.strictEqual(evaluated.correctnessVerdict, 'Partially Correct');
    assert.strictEqual(evaluated.algorithm.status, 'partial');
    assert.strictEqual(evaluated.algorithm.score, 24);
});

// ─── 6. INEFFICIENT BUT CORRECT SOLUTION ─────────────────────────────────────
console.log('\n--- Test 6: Inefficient But Correct Solution ---');
runTest('O(n^2) nested loop passing all test cases receives high functional score with minor efficiency deduction', () => {
    const rawAiOutput = {
        algorithm: {
            score: 30,
            maxScore: 40,
            status: 'partial',
            reason: 'Brute-force nested loop correctly checks all pairs, but suboptimal O(n^2).'
        },
        functionality: {
            score: 30,
            maxScore: 30,
            passedTests: 10,
            totalTests: 10,
            reason: 'Produces correct outputs for all required test cases.'
        },
        testCoverage: {
            score: 15,
            maxScore: 15,
            reason: 'Passes all 10 tests within small input limits.'
        },
        edgeCases: {
            score: 9,
            maxScore: 10,
            reason: 'Handles duplicate values and boundary inputs correctly.'
        },
        quality: {
            score: 2,
            maxScore: 5,
            reason: 'Inefficient O(n^2) time complexity; optimal is O(n).'
        },
        bugs: [
            {
                type: 'PERFORMANCE_ISSUE',
                severity: 'minor',
                description: 'Quadratic time complexity O(n^2) causes high latency on large inputs.',
                evidence: 'Nested for loops.',
                impact: 'Would time out on large datasets exceeding 10^5 elements.'
            }
        ],
        finalScore: 86,
        confidence: 95
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 30);
    assert.strictEqual(evaluated.finalScore, 86);
    assert.strictEqual(evaluated.functionality.score, 30);
    assert.strictEqual(evaluated.testCoverage.score, 15);
    assert.strictEqual(evaluated.quality.score, 2); // only quality/efficiency deducted
    assert.strictEqual(evaluated.bugs[0].type, 'PERFORMANCE_ISSUE');
});

// ─── 7. WRONG ALGORITHM ──────────────────────────────────────────────────────
console.log('\n--- Test 7: Wrong Algorithm ---');
runTest('Wrong algorithm solving different problem gets low algorithmic credit even if simple cases pass', () => {
    // Problem asks to find longest substring without repeating characters, candidate just counts total vowels
    const rawAiOutput = {
        algorithm: {
            score: 4,
            maxScore: 40,
            status: 'incorrect',
            reason: 'Fundamentally misunderstood problem. Solves character counting instead of sliding window.'
        },
        functionality: {
            score: 3,
            maxScore: 30,
            passedTests: 1,
            totalTests: 10,
            reason: 'Only passed 1 trivial test case coincidentally.'
        },
        testCoverage: {
            score: 1,
            maxScore: 15,
            reason: 'Accidental match on 1 test.'
        },
        edgeCases: {
            score: 0,
            maxScore: 10,
            reason: 'Fails all sliding window edge cases.'
        },
        quality: {
            score: 2,
            maxScore: 5,
            reason: 'Code is syntactically valid.'
        },
        bugs: [
            {
                type: 'WRONG_ALGORITHM',
                severity: 'critical',
                description: 'Selected vowel-counting approach which does not address longest substring.',
                evidence: 'Count vowels dictionary implemented.',
                impact: 'Does not solve the required problem.'
            }
        ],
        finalScore: 10,
        confidence: 95
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 20);
    assert.strictEqual(evaluated.finalScore, 10);
    assert.strictEqual(evaluated.correctnessVerdict, 'Incorrect');
    assert.strictEqual(evaluated.algorithm.status, 'incorrect');
    assert.strictEqual(evaluated.bugs[0].type, 'WRONG_ALGORITHM');

    const score = calculatePartialCreditScore(20, evaluated);
    assert.strictEqual(score.obtainedMarks, 2); // 10% of 20 = 2 marks
});

// ─── 8. SYNTAX ERROR WITH RECOGNIZABLE LOGIC ─────────────────────────────────
console.log('\n--- Test 8: Syntax Error with Demonstrable Logic ---');
runTest('Missing colon/parenthesis in clearly written algorithm awards valid logic credit', () => {
    const rawAiOutput = {
        algorithm: {
            score: 32,
            maxScore: 40,
            status: 'correct',
            reason: 'Demonstrates BFS traversal with queue and visited set structure clearly.'
        },
        functionality: {
            score: 0,
            maxScore: 30,
            passedTests: 0,
            totalTests: 10,
            reason: 'SyntaxError prevented compilation and execution.'
        },
        testCoverage: {
            score: 0,
            maxScore: 15,
            reason: 'Zero tests run due to syntax defect.'
        },
        edgeCases: {
            score: 3,
            maxScore: 10,
            reason: 'Empty graph check present in code.'
        },
        quality: {
            score: 3,
            maxScore: 5,
            reason: 'Good queue-based organization.'
        },
        bugs: [
            {
                type: 'SYNTAX_ERROR',
                severity: 'major',
                description: 'Missing colon at end of while loop statement.',
                evidence: 'while queue',
                impact: 'SyntaxError on line 5.'
            }
        ],
        finalScore: 38,
        confidence: 90
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 30);
    assert.strictEqual(evaluated.finalScore, 38);
    assert.strictEqual(evaluated.correctnessVerdict, 'Partially Correct');
    assert.strictEqual(evaluated.algorithm.score, 32);
    assert.strictEqual(evaluated.functionality.score, 0);
    assert.strictEqual(evaluated.bugs[0].type, 'SYNTAX_ERROR');
});

// ─── 9. EMPTY SUBMISSION / STARTER TEMPLATE ONLY ─────────────────────────────
console.log('\n--- Test 9: Empty Submission / Starter Code Only ---');
runTest('Empty code or unmodified starter template gets exact 0 with NO_MEANINGFUL_SOLUTION', () => {
    const empty1 = isMeaningfulCode('', 'python');
    assert.strictEqual(empty1, false);

    const empty2 = isMeaningfulCode('   \n\t  ', 'javascript');
    assert.strictEqual(empty2, false);

    const starterPython = isMeaningfulCode('def solution():\n    # Write your solution here\n    pass\n', 'python');
    assert.strictEqual(starterPython, false);

    const starterJS = isMeaningfulCode('function solution() {\n    // Write your solution here\n    \n}\n', 'javascript');
    assert.strictEqual(starterJS, false);

    const zeroEval = createDeterministicZeroEvaluation();
    assert.strictEqual(zeroEval.finalScore, 0);
    assert.strictEqual(zeroEval.correctnessVerdict, 'Incorrect');
    assert.strictEqual(zeroEval.algorithm.score, 0);
    assert.strictEqual(zeroEval.functionality.score, 0);
    assert.strictEqual(zeroEval.testCoverage.score, 0);
    assert.strictEqual(zeroEval.edgeCases.score, 0);
    assert.strictEqual(zeroEval.quality.score, 0);
    assert.strictEqual(zeroEval.bugs[0].type, 'NO_MEANINGFUL_SOLUTION');
});

// ─── 10. MULTIPLE FAILED TESTS CAUSED BY ONE ROOT BUG (NO DOUBLE PENALTY) ────
console.log('\n--- Test 10: Multiple Failed Tests Caused by Single Root Bug ---');
runTest('One root bug causing multiple test failures is not deducted multiple times from logic', () => {
    // Problem: Binary Search boundary update `high = mid` instead of `high = mid - 1`
    // Causes infinite loop on 5 test cases
    const rawAiOutput = {
        algorithm: {
            score: 34,
            maxScore: 40,
            status: 'correct',
            reason: 'Recognizable binary search strategy with correct halving logic.'
        },
        functionality: {
            score: 15,
            maxScore: 30,
            passedTests: 5,
            totalTests: 10,
            reason: '5 test cases timed out due to single root bug in high pointer update.'
        },
        testCoverage: {
            score: 8,
            maxScore: 15,
            reason: 'Passes all targets located in right half; hangs on left half.'
        },
        edgeCases: {
            score: 5,
            maxScore: 10,
            reason: 'Correct bounds check on entry.'
        },
        quality: {
            score: 4,
            maxScore: 5,
            reason: 'Clean binary search implementation.'
        },
        bugs: [
            {
                type: 'MINOR_IMPLEMENTATION_BUG',
                severity: 'minor',
                description: 'High pointer updated to mid instead of mid - 1.',
                evidence: 'high = mid',
                impact: 'Single root cause that affects 5 test cases (infinite loop).'
            }
        ],
        finalScore: 66,
        confidence: 92
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 20);
    // Verified: Algorithm retains 34/40; not penalized 5 times for 5 test failures
    assert.strictEqual(evaluated.algorithm.score, 34);
    assert.strictEqual(evaluated.bugs.length, 1);
    assert.strictEqual(evaluated.finalScore, 66);
    assert.strictEqual(evaluated.correctnessVerdict, 'Partially Correct');
});

// ─── 11. PARTIAL TEST SUCCESS ────────────────────────────────────────────────
console.log('\n--- Test 11: Partial Test Success (5 of 10 passed) ---');
runTest('5 of 10 tests passed combines actual execution evidence with algorithm analysis', () => {
    const rawAiOutput = {
        algorithm: { score: 28, maxScore: 40, status: 'partial', reason: 'Correct general approach with flaws.' },
        functionality: { score: 15, maxScore: 30, passedTests: 5, totalTests: 10, reason: '5 of 10 passed.' },
        testCoverage: { score: 7, maxScore: 15, reason: 'Half tests covered.' },
        edgeCases: { score: 4, maxScore: 10, reason: 'Boundary values fail.' },
        quality: { score: 3, maxScore: 5, reason: 'Acceptable code style.' },
        bugs: [
            {
                type: 'PARTIALLY_CORRECT_ALGORITHM',
                severity: 'major',
                description: 'Algorithm works for even array lengths but miscalculates on odd lengths.',
                evidence: 'mid = len(arr) // 2',
                impact: '5 odd-length tests fail.'
            }
        ],
        finalScore: 57,
        confidence: 90
    };

    const evaluated = validateAndNormalizeEvaluation(rawAiOutput, 'code', 20);
    assert.strictEqual(evaluated.finalScore, 57);
    assert.strictEqual(evaluated.functionality.passedTests, 5);
    assert.strictEqual(evaluated.correctnessVerdict, 'Partially Correct');
});

// ─── 12. AI UNAVAILABLE (SAFE DETERMINISTIC FALLBACK) ─────────────────────────
console.log('\n--- Test 12: AI Unavailable (Deterministic Fallback) ---');
runTest('Deterministic fallback analyzes code structure and assigns fair baseline without crashing', () => {
    const candidateCode = `
def findTarget(nums, target):
    for i in range(len(nums)):
        if nums[i] == target:
            return i
    return -1
`;
    const fallback = createDeterministicFallbackEvaluation({
        code: candidateCode,
        language: 'python',
        question: { title: 'Find Target', expectedApproach: 'Linear scan or binary search' },
        maxMarks: 30,
        errorMessage: 'Gemini 503 service unavailable'
    });

    assert.ok(fallback.finalScore > 0, 'Fallback score must be greater than 0 for valid code');
    assert.ok(fallback.finalScore <= 100, 'Fallback score must not exceed 100');
    assert.strictEqual(
        fallback.finalScore,
        round2(fallback.algorithm.score + fallback.functionality.score + fallback.testCoverage.score + fallback.edgeCases.score + fallback.quality.score)
    );
    assert.ok(fallback.feedback.includes('Deterministic fallback evaluation performed'));
    assert.ok(fallback.feedback.includes('Core Algorithm / Logic'));
});

// ─── 13. MALFORMED AI RESPONSE ───────────────────────────────────────────────
console.log('\n--- Test 13: Malformed AI Response Handling ---');
runTest('Malformed JSON or missing fields are safely handled and normalized', () => {
    // Missing dimension objects, string scores, bad types
    const malformedPayload = {
        algorithmScore: 35, // legacy flat field
        functionalityScore: '20', // string number
        finalScore: 999, // out of bounds
        bugs: [
            { type: 'INVALID_UNKNOWN_CUSTOM_BUG', severity: 'super_high', description: 'Some bug' }
        ]
    };

    const normalized = validateAndNormalizeEvaluation(malformedPayload, 'code', 10);
    assert.ok(normalized.finalScore >= 0 && normalized.finalScore <= 100, 'Score must be clamped to [0, 100]');
    assert.strictEqual(
        normalized.finalScore,
        round2(normalized.algorithm.score + normalized.functionality.score + normalized.testCoverage.score + normalized.edgeCases.score + normalized.quality.score)
    );
    assert.strictEqual(normalized.bugs[0].type, 'MINOR_IMPLEMENTATION_BUG', 'Unknown bug type normalized');
    assert.strictEqual(normalized.bugs[0].severity, 'major', 'super_high severity normalized to major');
});

// ─── 14. UNSUPPORTED / UNKNOWN EVALUATION RESPONSE (CLAMPING & BOUNDS) ───────
console.log('\n--- Test 14: Score Invariants & Overflow Clamping ---');
runTest('All 5 dimension scores clamp to their exact maxMarks and sum to finalScore', () => {
    const overflowingPayload = {
        algorithm: { score: 100, maxScore: 40 },
        functionality: { score: 50, maxScore: 30 },
        testCoverage: { score: 30, maxScore: 15 },
        edgeCases: { score: 20, maxScore: 10 },
        quality: { score: 10, maxScore: 5 },
        finalScore: 210,
        confidence: 500 // should clamp to 100
    };

    const normalized = validateAndNormalizeEvaluation(overflowingPayload, 'code', 100);
    assert.strictEqual(normalized.algorithm.score, 40, 'Algorithm clamped to max 40');
    assert.strictEqual(normalized.functionality.score, 30, 'Functionality clamped to max 30');
    assert.strictEqual(normalized.testCoverage.score, 15, 'Test coverage clamped to max 15');
    assert.strictEqual(normalized.edgeCases.score, 10, 'Edge cases clamped to max 10');
    assert.strictEqual(normalized.quality.score, 5, 'Quality clamped to max 5');
    assert.strictEqual(normalized.finalScore, 100, 'Final score clamped to max 100');
    assert.strictEqual(normalized.confidence, 100, 'Confidence clamped to max 100');
});

// ─── 15. HISTORICAL SUBMISSION COMPATIBILITY ─────────────────────────────────
console.log('\n--- Test 15: Historical Submission Compatibility ---');
runTest('Historical 3-argument evaluateQuestionScore and calculateAssessmentTotal remain 100% identical', () => {
    // 1. Legacy 3-arg call
    const legacyEval = evaluateQuestionScore(30, 8, 10);
    assert.strictEqual(legacyEval.obtainedMarks, 24);
    assert.strictEqual(legacyEval.performancePercentage, 80);

    // 2. Legacy total calculation
    const answers = [
        { obtainedMarks: 24, maximumMarks: 30 },
        { obtainedMarks: 21, maximumMarks: 30 },
        { obtainedMarks: 16, maximumMarks: 20 },
        { obtainedMarks: 18, maximumMarks: 20 }
    ];
    const total = calculateAssessmentTotal(answers);
    assert.strictEqual(total.totalObtainedMarks, 79);
    assert.strictEqual(total.totalMaximumMarks, 100);
    assert.strictEqual(total.finalPercentage, 79);

    // 3. Dynamic marks distribution unaltered
    const questions = [{ difficulty: 'LOW' }, { difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }];
    const marks = calculateDynamicMarks(questions);
    assert.strictEqual(marks[0].maximumMarks, 16.67);
    assert.strictEqual(marks[1].maximumMarks, 33.33);
    assert.strictEqual(marks[2].maximumMarks, 50);
});

// ─── 16. BUG CLASSIFIER SPECIFICATION TESTS ──────────────────────────────────
console.log('\n--- Bug Classifier Mapping Tests ---');
runTest('All 12 standard bug types are correctly normalized and recognized', () => {
    const typesToTest = [
        ['SYNTAX_ERROR', 'SYNTAX_ERROR'],
        ['syntax error on line 4', 'SYNTAX_ERROR'],
        ['COMPILATION_ERROR', 'COMPILATION_ERROR'],
        ['compiler failed', 'COMPILATION_ERROR'],
        ['RUNTIME_ERROR', 'RUNTIME_ERROR'],
        ['null pointer exception', 'RUNTIME_ERROR'],
        ['MINOR_IMPLEMENTATION_BUG', 'MINOR_IMPLEMENTATION_BUG'],
        ['MAJOR_IMPLEMENTATION_BUG', 'MAJOR_IMPLEMENTATION_BUG'],
        ['EDGE_CASE_FAILURE', 'EDGE_CASE_FAILURE'],
        ['boundary condition error', 'EDGE_CASE_FAILURE'],
        ['OUTPUT_FORMAT_ERROR', 'OUTPUT_FORMAT_ERROR'],
        ['PERFORMANCE_ISSUE', 'PERFORMANCE_ISSUE'],
        ['timeout on large inputs', 'PERFORMANCE_ISSUE'],
        ['PARTIALLY_CORRECT_ALGORITHM', 'PARTIALLY_CORRECT_ALGORITHM'],
        ['WRONG_ALGORITHM', 'WRONG_ALGORITHM'],
        ['INCOMPLETE_SOLUTION', 'INCOMPLETE_SOLUTION'],
        ['NO_MEANINGFUL_SOLUTION', 'NO_MEANINGFUL_SOLUTION']
    ];

    for (const [raw, expected] of typesToTest) {
        assert.strictEqual(normalizeBugType(raw), expected, `Failed normalizing "${raw}"`);
    }
});

// ─── 17. STRUCTURED FEEDBACK FORMATTING TEST ─────────────────────────────────
console.log('\n--- Structured Feedback Generation Test ---');
runTest('Feedback text correctly formats dimensions, issues, and executive summary', () => {
    const sampleEval = {
        algorithm: { score: 35, maxScore: 40, status: 'correct', reason: 'Used two pointers correctly.' },
        functionality: { score: 20, maxScore: 30, passedTests: 7, totalTests: 10, reason: '3 negative inputs failed.' },
        testCoverage: { score: 11, maxScore: 15, reason: 'Standard tests passed.' },
        edgeCases: { score: 5, maxScore: 10, reason: 'Negative numbers unhandled.' },
        quality: { score: 4, maxScore: 5, reason: 'Clean O(n) code.' },
        bugs: [
            {
                type: 'MINOR_IMPLEMENTATION_BUG',
                severity: 'minor',
                description: 'Incorrect initialization.',
                evidence: 'left = 1',
                impact: 'Index shift.'
            }
        ],
        finalScore: 75,
        summary: 'Solid solution with minor indexing bug.',
        correctnessVerdict: 'Partially Correct'
    };

    const feedback = buildStructuredFeedbackText(sampleEval);
    assert.ok(feedback.includes('EVALUATION SUMMARY'));
    assert.ok(feedback.includes('Verdict: Partially Correct • Internal Score: 75/100'));
    assert.ok(feedback.includes('• Core Algorithm / Logic: 35/40 (correct)'));
    assert.ok(feedback.includes('• Functional Correctness: 20/30 (7/10 tests passed)'));
    assert.ok(feedback.includes('[MINOR_IMPLEMENTATION_BUG | MINOR] Incorrect initialization.'));
    assert.ok(feedback.includes('Evidence: left = 1'));
});

console.log('\n================================================================');
console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('================================================================\n');

if (testsFailed > 0) {
    process.exit(1);
}
