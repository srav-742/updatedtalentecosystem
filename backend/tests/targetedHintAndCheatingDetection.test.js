/**
 * Hire1Percent — Targeted Hint & Cheating Detection Test Suite
 * 
 * Verifies:
 * 1. Targeted Bottleneck Line Detection:
 *    - Accurately flags 2D DP allocations, list buffering, large memory allocations
 *    - Returns line number, exact code snippet, and actionable hint text without solution code
 * 2. Authentic Adaptation Verification (Hint Followed):
 *    - When candidate modifies the targeted line/data structure while keeping original algorithm
 *    - AI analysis returns: cheatingDetected: false, integrityVerdict: 'AUTHENTIC_ADAPTATION', hintAdherence: 'followed'
 * 3. Cheating / External Substitution Detection (Hint Disregarded):
 *    - When candidate was provided a targeted line hint, but discarded all code (>65% lines changed)
 *    - AI analysis flags: cheatingDetected: true, integrityVerdict: 'CHEATING_SUSPECTED', hintAdherence: 'disregarded'
 * 4. Autonomous Adaptation Fairness (No Hint Given):
 *    - When no hint was requested or given, complete rewrites remain allowed autonomously
 *    - AI analysis returns: cheatingDetected: false, integrityVerdict: 'STANDARD_ADAPTATION'
 */

const assert = require('assert');
const { detectBottleneckLine } = require('../services/dmce/targetedHintService');
const {
    validateAIAnalysisResponse,
    createFallbackAnalysis,
    computeDiffSummary
} = require('../services/aiCodeChangeAnalysisService');

console.log('================================================================');
console.log('STARTING TARGETED HINT & CHEATING DETECTION TEST SUITE');
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

async function runTests() {
    // -------------------------------------------------------------
    // SECTION 1: Targeted Bottleneck Line Detection
    // -------------------------------------------------------------
    console.log('--- SECTION 1: Targeted Bottleneck Line Detection ---');

    await test('Detects 2D DP Matrix allocation line in Python', () => {
        const code = [
            'def findPaths(m, n, N, i, j):',
            '    MOD = 10**9 + 7',
            '    # Build DP matrix',
            '    dp = [[0] * n for _ in range(m)]',
            '    dp[i][j] = 1',
            '    for step in range(1, N + 1):',
            '        pass'
        ].join('\n');

        const bottleneck = detectBottleneckLine(code, 'python');
        assert.ok(bottleneck, 'Bottleneck should be detected');
        assert.strictEqual(bottleneck.targetLineNumber, 4, 'Line 4 should be identified');
        assert.ok(bottleneck.targetCodeSnippet.includes('[[0] * n for _ in range(m)]'));
        assert.ok(!bottleneck.hintText.includes('return'), 'Hint must not leak return statements');
        assert.ok(!bottleneck.hintText.includes('def '), 'Hint must not contain full function implementation');
    });

    await test('Detects full stream list buffering in Python', () => {
        const code = [
            'def processStream(records):',
            '    all_data = list(records)',
            '    return sum(x.val for x in all_data)'
        ].join('\n');

        const bottleneck = detectBottleneckLine(code, 'python');
        assert.ok(bottleneck);
        assert.strictEqual(bottleneck.targetLineNumber, 2);
        assert.ok(bottleneck.targetCodeSnippet.includes('list(records)'));
    });

    await test('Detects 2D Array allocation in JavaScript', () => {
        const code = [
            'function solve(m, n) {',
            '    const grid = Array.from({ length: m }, () => new Array(n).fill(0));',
            '    return grid[0][0];',
            '}'
        ].join('\n');

        const bottleneck = detectBottleneckLine(code, 'javascript');
        assert.ok(bottleneck);
        assert.strictEqual(bottleneck.targetLineNumber, 2);
        assert.ok(bottleneck.targetCodeSnippet.includes('Array.from'));
    });

    // -------------------------------------------------------------
    // SECTION 2: AI Code Change Analysis with Hint Adherence & Cheating Detection
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: Hint Adherence & Integrity Verification ---');

    const baseContext = {
        jobId: 'job_dmce_1',
        candidateId: 'cand_123',
        questionId: 'q_matrix_scale',
        constraint: 'Runtime heap clamped to 14MB. Auxiliary space must be O(1) in-place without buffering full matrices in memory.',
        analyzedRevisionId: 'rev_stage2',
        baselineCode: [
            'def minCostPath(grid):',
            '    m, n = len(grid), len(grid[0])',
            '    dp = [[0] * n for _ in range(m)]',
            '    for i in range(m):',
            '        for j in range(n):',
            '            dp[i][j] = grid[i][j]',
            '    return dp[m-1][n-1]'
        ].join('\n')
    };

    const deliveredHint = {
        targetLineNumber: 3,
        targetCodeSnippet: 'dp = [[0] * n for _ in range(m)]',
        hintTitle: 'Memory Allocation Bottleneck (Line 3)',
        hintText: 'Allocating full 2D matrix exceeds 14MB. Optimize line 3 to keep only current and previous rows.'
    };

    await test('Authentic Adaptation: Candidate followed line hint surgically (preserved codebase)', () => {
        // Candidate kept the function structure and surgically adapted line 3 to 1D array
        const surgicalCode = [
            'def minCostPath(grid):',
            '    m, n = len(grid), len(grid[0])',
            '    prev = [0] * n',
            '    curr = [0] * n',
            '    for i in range(m):',
            '        for j in range(n):',
            '            curr[j] = grid[i][j]',
            '        prev = list(curr)',
            '    return prev[n-1]'
        ].join('\n');

        const diffSummary = computeDiffSummary(baseContext.baselineCode, surgicalCode);

        // Simulated AI response for surgical adaptation
        const rawAiResult = {
            analysisStatus: 'completed',
            constraintRelevance: 'relevant',
            algorithmPreserved: 'yes',
            behaviorChange: 'expected',
            evidence: ['Candidate surgically replaced full 2D matrix on line 3 with 2 single-row arrays'],
            confidence: 94,
            requiresHumanReview: false
        };

        const validated = validateAIAnalysisResponse(rawAiResult, {
            ...baseContext,
            currentCode: surgicalCode,
            diffSummary,
            hintsDelivered: [deliveredHint]
        });

        assert.strictEqual(validated.hintGiven, true);
        assert.strictEqual(validated.hintAdherence, 'followed');
        assert.strictEqual(validated.cheatingDetected, false, 'Surgical adaptation must NOT be flagged as cheating');
        assert.strictEqual(validated.integrityVerdict, 'AUTHENTIC_ADAPTATION');
        assert.strictEqual(validated.requiresHumanReview, false);
    });

    await test('Cheating Suspected: Candidate discarded code after hint and pasted full rewrite', () => {
        // Candidate completely discarded their function and pasted entirely new solution
        const externalCode = [
            'import heapq',
            'class Solution:',
            '    def dijkstra_path(self, matrix):',
            '        pq = [(matrix[0][0], 0, 0)]',
            '        visited = set()',
            '        while pq:',
            '            cost, r, c = heapq.heappop(pq)',
            '            if (r, c) in visited: continue',
            '            visited.add((r, c))',
            '            if r == len(matrix)-1 and c == len(matrix[0])-1: return cost',
            '            for dr, dc in [(0, 1), (1, 0)]:',
            '                nr, nc = r + dr, c + dc',
            '                if 0 <= nr < len(matrix) and 0 <= nc < len(matrix[0]):',
            '                    heapq.heappush(pq, (cost + matrix[nr][nc], nr, nc))'
        ].join('\n');

        const diffSummary = computeDiffSummary(baseContext.baselineCode, externalCode);
        assert.ok(diffSummary.percentChanged > 65, 'Diff percent changed should exceed 65%');

        const rawAiResult = {
            analysisStatus: 'completed',
            constraintRelevance: 'relevant',
            algorithmPreserved: 'no',
            behaviorChange: 'none',
            evidence: ['Candidate replaced baseline with a completely different Dijkstra graph traversal'],
            confidence: 92,
            requiresHumanReview: false
        };

        const validated = validateAIAnalysisResponse(rawAiResult, {
            ...baseContext,
            currentCode: externalCode,
            diffSummary,
            hintsDelivered: [deliveredHint]
        });

        assert.strictEqual(validated.hintGiven, true);
        assert.strictEqual(validated.hintAdherence, 'disregarded');
        assert.strictEqual(validated.cheatingDetected, true, 'Discarding code after line hint MUST be flagged as cheating suspected');
        assert.strictEqual(validated.integrityVerdict, 'CHEATING_SUSPECTED');
        assert.strictEqual(validated.requiresHumanReview, true);
        assert.ok(validated.riskIndicators.includes('FULL_CODE_REPLACEMENT_AFTER_TARGETED_HINT'));
        assert.ok(validated.riskIndicators.includes('EXTERNAL_CODE_SUBSTITUTION_SUSPECTED'));
    });

    await test('Autonomous Fairness: Full rewrite WITHOUT hint is NOT treated as cheating', () => {
        // No hint was delivered. Candidate chose autonomously to rewrite algorithm.
        const externalCode = [
            'class Solution:',
            '    def solve(self, grid):',
            '        return 42'
        ].join('\n');

        const diffSummary = computeDiffSummary(baseContext.baselineCode, externalCode);

        const rawAiResult = {
            analysisStatus: 'completed',
            constraintRelevance: 'relevant',
            algorithmPreserved: 'no',
            behaviorChange: 'none',
            evidence: ['Candidate autonomously rewrote implementation'],
            confidence: 88,
            requiresHumanReview: false
        };

        const validated = validateAIAnalysisResponse(rawAiResult, {
            ...baseContext,
            currentCode: externalCode,
            diffSummary,
            hintsDelivered: [] // No hints delivered
        });

        assert.strictEqual(validated.hintGiven, false);
        assert.strictEqual(validated.hintAdherence, 'none');
        assert.strictEqual(validated.cheatingDetected, false, 'Without a hint, full rewrite must NOT be flagged as cheating');
        assert.strictEqual(validated.integrityVerdict, 'STANDARD_ADAPTATION');
        assert.strictEqual(validated.requiresHumanReview, false);
    });

    console.log('\n================================================================');
    console.log(`📊 TEST RESULTS: ${passedCount} Passed, ${failedCount} Failed (Total: ${passedCount + failedCount})`);
    console.log('🎉 ALL TARGETED HINT & CHEATING DETECTION SCENARIOS VERIFIED!');
    console.log('================================================================\n');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
