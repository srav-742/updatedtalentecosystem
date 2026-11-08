const assert = require('assert');
const {
    DIFFICULTY_WEIGHTS,
    normalizeDifficulty,
    getDifficultyWeight,
    calculateDynamicMarks,
    evaluateQuestionScore,
    calculateAssessmentTotal,
    getRecruiterDistributionSummary,
    round2
} = require('../utils/codingScoreCalculator');

console.log('====================================================');
console.log('STARTING DYNAMIC CODING SCORING TEST SUITE');
console.log('====================================================\n');

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
        testsFailed++;
    }
}

function verifyMarks(questions, expectedMarks, testName) {
    runTest(testName, () => {
        const result = calculateDynamicMarks(questions);
        const marks = result.map(r => r.maximumMarks);
        const sum = round2(marks.reduce((a, b) => a + b, 0));

        // 1. Verify sum of marks is strictly 100
        assert.strictEqual(sum, 100, `Sum of marks must be exactly 100, got ${sum}`);

        // 2. Verify individual marks match expected values
        assert.strictEqual(marks.length, expectedMarks.length, `Expected ${expectedMarks.length} questions, got ${marks.length}`);
        for (let i = 0; i < expectedMarks.length; i++) {
            assert.strictEqual(
                marks[i],
                expectedMarks[i],
                `Question ${i + 1} mark mismatch: expected ${expectedMarks[i]}, got ${marks[i]}`
            );
        }
    });
}

// ─── 1. SINGLE QUESTION TESTS ─────────────────────────────
console.log('--- 1 Question Tests ---');
verifyMarks([{ difficulty: 'LOW' }], [100], '1 LOW = 100 marks');
verifyMarks([{ difficulty: 'MEDIUM' }], [100], '1 MEDIUM = 100 marks');
verifyMarks([{ difficulty: 'HIGH' }], [100], '1 HIGH = 100 marks');

// ─── 2. TWO QUESTION TESTS ────────────────────────────────
console.log('\n--- 2 Questions Tests ---');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'LOW' }], [50, 50], '2 LOW = 50, 50');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'MEDIUM' }], [33.33, 66.67], '1 LOW + 1 MEDIUM = 33.33, 66.67');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'HIGH' }], [25, 75], '1 LOW + 1 HIGH = 25, 75');
verifyMarks([{ difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }], [50, 50], '2 MEDIUM = 50, 50');
verifyMarks([{ difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }], [40, 60], '1 MEDIUM + 1 HIGH = 40, 60');
verifyMarks([{ difficulty: 'HIGH' }, { difficulty: 'HIGH' }], [50, 50], '2 HIGH = 50, 50');

// ─── 3. THREE QUESTION TESTS ──────────────────────────────
console.log('\n--- 3 Questions Tests ---');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'LOW' }, { difficulty: 'LOW' }], [33.33, 33.33, 33.34], '3 LOW = 33.33, 33.33, 33.34');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'LOW' }, { difficulty: 'MEDIUM' }], [25, 25, 50], '2 LOW + 1 MEDIUM = 25, 25, 50');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }], [20, 40, 40], '1 LOW + 2 MEDIUM = 20, 40, 40');
verifyMarks([{ difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }], [33.33, 33.33, 33.34], '3 MEDIUM = 33.33, 33.33, 33.34');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'LOW' }, { difficulty: 'HIGH' }], [20, 20, 60], '2 LOW + 1 HIGH = 20, 20, 60');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }], [16.67, 33.33, 50], '1 LOW + 1 MEDIUM + 1 HIGH = 16.67, 33.33, 50');
verifyMarks([{ difficulty: 'LOW' }, { difficulty: 'HIGH' }, { difficulty: 'HIGH' }], [14.29, 42.86, 42.85], '1 LOW + 2 HIGH = 14.29, 42.86, 42.85 (Rounding adjusted)');
verifyMarks([{ difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }], [28.57, 28.57, 42.86], '2 MEDIUM + 1 HIGH = 28.57, 28.57, 42.86');
verifyMarks([{ difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }, { difficulty: 'HIGH' }], [25, 37.5, 37.5], '1 MEDIUM + 2 HIGH = 25, 37.5, 37.5');
verifyMarks([{ difficulty: 'HIGH' }, { difficulty: 'HIGH' }, { difficulty: 'HIGH' }], [33.33, 33.33, 33.34], '3 HIGH = 33.33, 33.33, 33.34');

// ─── 4. FOUR QUESTION TESTS ───────────────────────────────
console.log('\n--- 4 Questions Tests ---');
verifyMarks(
    [{ difficulty: 'HIGH' }, { difficulty: 'HIGH' }, { difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }],
    [30, 30, 20, 20],
    '2 HIGH + 2 MEDIUM = 30, 30, 20, 20'
);
verifyMarks(
    [{ difficulty: 'LOW' }, { difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }],
    [12.5, 25, 25, 37.5],
    '1 LOW + 2 MEDIUM + 1 HIGH = 12.5, 25, 25, 37.5'
);
verifyMarks(
    [{ difficulty: 'LOW' }, { difficulty: 'LOW' }, { difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }],
    [14.29, 14.29, 28.57, 42.85],
    '2 LOW + 1 MEDIUM + 1 HIGH = 14.29, 14.29, 28.57, 42.85 (Rounding adjusted)'
);

// ─── 5. FIVE QUESTION TESTS ───────────────────────────────
console.log('\n--- 5 Questions Tests ---');
verifyMarks(
    [{ difficulty: 'LOW' }, { difficulty: 'LOW' }, { difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }, { difficulty: 'HIGH' }],
    [11.11, 11.11, 22.22, 22.22, 33.34],
    '2 LOW + 2 MEDIUM + 1 HIGH = 11.11, 11.11, 22.22, 22.22, 33.34 (Rounding adjusted)'
);

// ─── 6. DYNAMIC OPERATIONS (ADD, REMOVE, UPDATE DIFFICULTY) ─
console.log('\n--- Dynamic Operations Tests ---');
runTest('Dynamic deletion recalculates all marks correctly', () => {
    // Before: 2 HIGH + 2 MEDIUM (Total 10, marks 30, 30, 20, 20)
    const initial = [{ difficulty: 'HIGH' }, { difficulty: 'HIGH' }, { difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }];
    const beforeResult = calculateDynamicMarks(initial);
    assert.deepStrictEqual(beforeResult.map(r => r.maximumMarks), [30, 30, 20, 20]);

    // After deleting 1 HIGH: 1 HIGH + 2 MEDIUM (Total 7, marks: 42.86, 28.57, 28.57)
    const afterDelete = [{ difficulty: 'HIGH' }, { difficulty: 'MEDIUM' }, { difficulty: 'MEDIUM' }];
    const afterResult = calculateDynamicMarks(afterDelete);
    assert.deepStrictEqual(afterResult.map(r => r.maximumMarks), [42.86, 28.57, 28.57]);
    const sum = round2(afterResult.reduce((s, r) => s + r.maximumMarks, 0));
    assert.strictEqual(sum, 100);
});

runTest('Dynamic difficulty change recalculates all marks correctly', () => {
    // Initial: 1 LOW + 1 MEDIUM (33.33, 66.67)
    const initial = [{ difficulty: 'LOW' }, { difficulty: 'MEDIUM' }];
    assert.deepStrictEqual(calculateDynamicMarks(initial).map(r => r.maximumMarks), [33.33, 66.67]);

    // Change Q1 from LOW to HIGH: 1 HIGH + 1 MEDIUM (60, 40)
    const updated = [{ difficulty: 'HIGH' }, { difficulty: 'MEDIUM' }];
    assert.deepStrictEqual(calculateDynamicMarks(updated).map(r => r.maximumMarks), [60, 40]);
});

// ─── 7. CANDIDATE EVALUATION & TEST CASE SCORING ───────────
console.log('\n--- Candidate Performance & Test Case Evaluation Tests ---');
runTest('Question Evaluation: 8/10 test cases passed on 30 marks = 24 marks', () => {
    const evalResult = evaluateQuestionScore(30, 8, 10);
    assert.strictEqual(evalResult.obtainedMarks, 24);
    assert.strictEqual(evalResult.performancePercentage, 80);
});

runTest('Question Evaluation: 7/10 test cases passed on 30 marks = 21 marks', () => {
    const evalResult = evaluateQuestionScore(30, 7, 10);
    assert.strictEqual(evalResult.obtainedMarks, 21);
    assert.strictEqual(evalResult.performancePercentage, 70);
});

runTest('Question Evaluation: 0 test cases passed = 0 marks', () => {
    const evalResult = evaluateQuestionScore(25, 0, 10);
    assert.strictEqual(evalResult.obtainedMarks, 0);
    assert.strictEqual(evalResult.performancePercentage, 0);
});

runTest('Question Evaluation: all test cases passed = full marks', () => {
    const evalResult = evaluateQuestionScore(37.5, 10, 10);
    assert.strictEqual(evalResult.obtainedMarks, 37.5);
    assert.strictEqual(evalResult.performancePercentage, 100);
});

runTest('Final Assessment Total: Q1(24/30) + Q2(25/30) + Q3(15/20) + Q4(18/20) = 82/100', () => {
    const questionScores = [
        { obtainedMarks: 24, maximumMarks: 30 },
        { obtainedMarks: 25, maximumMarks: 30 },
        { obtainedMarks: 15, maximumMarks: 20 },
        { obtainedMarks: 18, maximumMarks: 20 }
    ];
    const finalResult = calculateAssessmentTotal(questionScores);
    assert.strictEqual(finalResult.totalObtainedMarks, 82);
    assert.strictEqual(finalResult.totalMaximumMarks, 100);
    assert.strictEqual(finalResult.finalPercentage, 82);
});

runTest('Final Assessment Total: Bounds check clamp to [0, 100]', () => {
    // Over 100 clamp
    const overflow = [{ obtainedMarks: 70, maximumMarks: 50 }, { obtainedMarks: 50, maximumMarks: 50 }];
    const overResult = calculateAssessmentTotal(overflow);
    assert.strictEqual(overResult.totalObtainedMarks, 100);

    // Negative clamp
    const negative = [{ obtainedMarks: -10, maximumMarks: 50 }, { obtainedMarks: 0, maximumMarks: 50 }];
    const underResult = calculateAssessmentTotal(negative);
    assert.strictEqual(underResult.totalObtainedMarks, 0);
});

// ─── 8. RECRUITER DISTRIBUTION SUMMARY TEST ───────────────
console.log('\n--- Recruiter Distribution Summary Tests ---');
runTest('Recruiter Summary generates accurate counts and marks', () => {
    const questions = [
        { title: 'Graph Traversal', difficulty: 'HIGH' },
        { title: 'Dynamic Programming', difficulty: 'HIGH' },
        { title: 'Binary Search', difficulty: 'MEDIUM' },
        { title: 'Array Rotation', difficulty: 'MEDIUM' }
    ];
    const summary = getRecruiterDistributionSummary(questions);
    assert.strictEqual(summary.totalQuestions, 4);
    assert.strictEqual(summary.high, 2);
    assert.strictEqual(summary.medium, 2);
    assert.strictEqual(summary.low, 0);
    assert.strictEqual(summary.totalMarks, 100);
    assert.strictEqual(summary.questionMarks[0].marks, 30);
    assert.strictEqual(summary.questionMarks[1].marks, 30);
    assert.strictEqual(summary.questionMarks[2].marks, 20);
    assert.strictEqual(summary.questionMarks[3].marks, 20);
});

// ─── 9. BACKWARD COMPATIBILITY WITH EASY/MEDIUM/HARD ──────
console.log('\n--- Legacy Difficulty Compatibility Tests ---');
verifyMarks(
    [{ difficulty: 'Easy' }, { difficulty: 'Medium' }, { difficulty: 'Hard' }],
    [16.67, 33.33, 50],
    'Legacy Easy + Medium + Hard maps to 16.67, 33.33, 50'
);

console.log('\n====================================================');
console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log('====================================================\n');

if (testsFailed > 0) {
    process.exit(1);
}
