/**
 * ─── Live Technical Interview Test Suite ─────────────────────────────────────
 * Tests problem generation, sandbox execution, approach scoring, and evaluation.
 * Run with: node tests/liveTechnicalInterview.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { generateTechnicalProblem, CURATED_PROBLEMS, sanitizeProblem } = require('../services/technicalProblemGenerator');
const { executeAgainstTestCases } = require('../services/codeExecutionService');
const {
    evaluateApproachExplanation,
    generateTechnicalFollowUp,
    evaluateCompleteTechnicalRound
} = require('../services/technicalEvaluator');

async function runTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING LIVE TECHNICAL INTERVIEW TEST SUITE');
    console.log('====================================================\n');

    let passedCount = 0;
    let totalTests = 0;

    function test(name, fn) {
        totalTests++;
        try {
            fn();
            console.log(`✅ PASS: ${name}`);
            passedCount++;
        } catch (err) {
            console.error(`❌ FAIL: ${name}`);
            console.error(err);
        }
    }

    async function asyncTest(name, fn) {
        totalTests++;
        try {
            await fn();
            console.log(`✅ PASS: ${name}`);
            passedCount++;
        } catch (err) {
            console.error(`❌ FAIL: ${name}`);
            console.error(err);
        }
    }

    // TEST 1: Sanitize Problem
    test('sanitizeProblem handles valid & partial objects', () => {
        const raw = {
            title: 'Sample Test Question',
            statement: 'Do XYZ',
            examples: [{ input: '1', output: '2' }]
        };
        const sanitized = sanitizeProblem(raw);
        assert.ok(sanitized, 'Sanitized problem should exist');
        assert.strictEqual(sanitized.title, 'Sample Test Question');
        assert.ok(sanitized.testCases.length > 0, 'Should synthesize test cases from examples');
        assert.ok(sanitized.starterCode.python, 'Should supply starter python code');
    });

    // TEST 2: Curated Catalog Validity
    test('Curated fallback problems are well-formed', () => {
        assert.ok(CURATED_PROBLEMS.length >= 3, 'Should have at least 3 curated problems');
        for (const prob of CURATED_PROBLEMS) {
            assert.ok(prob.id, 'Problem must have id');
            assert.ok(prob.title, 'Problem must have title');
            assert.ok(prob.statement, 'Problem must have statement');
            assert.ok(prob.testCases && prob.testCases.length >= 2, 'Problem must have >= 2 test cases');
            assert.ok(prob.starterCode.python, 'Problem must have python starter code');
            assert.ok(prob.starterCode.javascript, 'Problem must have javascript starter code');
            assert.ok(prob.rubric.expectedApproach, 'Problem must have rubric');
        }
    });

    // TEST 3: Dynamic or Curated Problem Generation
    await asyncTest('generateTechnicalProblem returns complete challenge object', async () => {
        const prob = await generateTechnicalProblem({
            jobTitle: 'Senior Full Stack Developer',
            jobDescription: 'Build scalable web applications and algorithms',
            jobSkills: ['JavaScript', 'Node.js', 'Python', 'Algorithms'],
            experienceLevel: 'Senior'
        });
        assert.ok(prob.title, 'Generated problem must have title');
        assert.ok(prob.statement, 'Generated problem must have statement');
        assert.ok(prob.testCases.length >= 2, 'Generated problem must have test cases');
        assert.ok(prob.followUpPrompts.length >= 1, 'Generated problem must have follow up prompts');
    });

    // TEST 4: Code Execution Sandbox - Correct Solution
    await asyncTest('executeAgainstTestCases verifies correct Two Sum python code', async () => {
        const twoSumProb = CURATED_PROBLEMS.find(p => p.id === 'tech_two_sum');
        const correctPythonCode = `
import json, sys

def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in lookup:
            return [lookup[comp], i]
        lookup[num] = i
    return []

if __name__ == '__main__':
    raw = sys.stdin.read().splitlines()
    if raw:
        nums = json.loads(raw[0].strip())
        target = int(raw[1].strip())
        print(json.dumps(two_sum(nums, target)))
`;
        const result = await executeAgainstTestCases({
            code: correctPythonCode,
            language: 'python',
            testCases: twoSumProb.testCases,
            maskHiddenDetails: false
        });

        assert.ok(result, 'Result should exist');
        assert.strictEqual(result.failed, 0, `All tests should pass. Got ${result.failed} failed.`);
        assert.strictEqual(result.passed, twoSumProb.testCases.length, 'All test cases passed');
    });

    // TEST 5: Code Execution Sandbox - Incorrect Solution
    await asyncTest('executeAgainstTestCases catches incorrect code', async () => {
        const twoSumProb = CURATED_PROBLEMS.find(p => p.id === 'tech_two_sum');
        const buggyPythonCode = `
import json, sys
if __name__ == '__main__':
    print(json.dumps([999, 999]))
`;
        const result = await executeAgainstTestCases({
            code: buggyPythonCode,
            language: 'python',
            testCases: twoSumProb.testCases,
            maskHiddenDetails: false
        });

        assert.ok(result, 'Result should exist');
        assert.ok(result.failed > 0, 'Buggy code should fail test cases');
    });

    // TEST 6: Approach Evaluation
    await asyncTest('evaluateApproachExplanation evaluates candidate reasoning', async () => {
        const prob = CURATED_PROBLEMS[0];
        const res = await evaluateApproachExplanation({
            problem: prob,
            approachText: 'I plan to use a hash map to store each number and its index. As I iterate through the array, I check if target minus current number is already in the map. This achieves O(N) time and O(N) space.'
        });

        assert.ok(res, 'Approach result should exist');
        assert.ok(res.score > 0, 'Approach score should be positive');
        assert.ok(res.aiReaction, 'AI reaction should be present');
    });

    // TEST 7: Complete Technical Round Evaluation
    await asyncTest('evaluateCompleteTechnicalRound produces multi-dimensional scorecard', async () => {
        const prob = CURATED_PROBLEMS[0];
        const workingCode = `
def two_sum(nums, target):
    lookup = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in lookup:
            return [lookup[comp], i]
        lookup[num] = i
    return []
`;
        const evalResult = await evaluateCompleteTechnicalRound({
            problem: prob,
            approachExplanation: 'Use hash map for O(N) lookup time, checking for complements on each iteration.',
            submittedCode: workingCode,
            language: 'python',
            testResults: { passed: 4, total: 4 },
            followUpQuestion: 'What is the time complexity?',
            followUpAnswer: 'The time complexity is O(N) because we perform a single pass with O(1) hash table lookups.'
        });

        assert.ok(evalResult, 'Evaluation result should exist');
        assert.ok(typeof evalResult.totalScore === 'number', 'Total score must be number');
        assert.ok(evalResult.totalScore >= 60, 'Complete good solution should score >= 60');
        assert.ok(evalResult.approachScore >= 0, 'Approach score must exist');
        assert.ok(evalResult.correctnessScore === 100, 'Correctness score should be 100% since 4/4 passed');
        assert.ok(evalResult.complexityScore >= 0, 'Complexity score must exist');
        assert.ok(evalResult.communicationScore >= 0, 'Communication score must exist');
    });

    console.log('\n====================================================');
    console.log(`📊 SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
    console.log('====================================================\n');

    if (passedCount === totalTests) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
