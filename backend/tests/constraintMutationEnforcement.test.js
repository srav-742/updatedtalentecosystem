/**
 * Hire1Percent — Constraint Mutation Adaptation Enforcement Verification Suite
 * 
 * Verifies that:
 * 1. Unadapted/unchanged code submitted under active mutation fails the scale constraint.
 * 2. Only adapted code can pass under the clamped memory limit.
 */

const assert = require('assert');
const mutationEngine = require('../services/dmce/mutationEngine');
const { initSession, getSession } = require('../services/dmce/sessionManager');
const { runDMCEMutation } = require('../controllers/codingAssessmentController');

async function runTests() {
    console.log('================================================================');
    console.log('STARTING CONSTRAINT MUTATION ADAPTATION ENFORCEMENT TEST SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`  ✓ PASSED: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✗ FAILED: ${name}`);
            console.error(err);
            failed++;
        }
    };

    const baselineCode = `
def maxCoins(nums):
    nums = [1] + [i for i in nums if i > 0] + [1]
    n = len(nums)
    dp = [[0]*n for _ in range(n)]
    for length in range(2, n):
        for left in range(0, n - length):
            right = left + length
            for i in range(left + 1, right):
                coins = nums[left] * nums[i] * nums[right] + dp[left][i] + dp[i][right]
                dp[left][right] = max(dp[left][right], coins)
    return dp[0][n - 1]

if __name__ == "__main__":
    n = int(input().strip())
    nums = list(map(int, input().split()))
    print(maxCoins(nums))
`.trim();

    await test('Unadapted Stage-1 code fails constraint verification with MEMORY_LIMIT_EXCEEDED', async () => {
        const sid = `test-unadapted-${Date.now()}`;
        const session = initSession({ sessionId: sid, language: 'python' });
        session.baselinePassed = true;
        session.snapshots.baselineCode = baselineCode;
        session.snapshots.preMutationCode = baselineCode;

        // Activate mutation
        mutationEngine.activateCandidateMutation(sid, baselineCode);

        // Simulate request to runDMCEMutation with identical code
        let responseJson = null;
        const req = {
            body: {
                sessionId: sid,
                code: baselineCode,
                language: 'python'
            },
            headers: {}
        };
        const res = {
            json: (data) => {
                responseJson = data;
                return res;
            },
            status: () => res
        };

        await runDMCEMutation(req, res);

        assert.ok(responseJson, 'Expected JSON response');
        assert.strictEqual(responseJson.mutationStatus, 'FAILED');
        assert.strictEqual(responseJson.status, 'MEMORY_LIMIT_EXCEEDED');
        assert.strictEqual(responseJson.passed, 0);
        assert.strictEqual(responseJson.failed, 2);
        assert.ok(responseJson.errorMessage.includes('Constraint Check Failed'));
        assert.strictEqual(responseJson.results.length, 2);
        assert.strictEqual(responseJson.results[0].status, 'MEMORY_LIMIT_EXCEEDED');

        mutationEngine.cleanupSession(sid);
    });

    await test('Superficial edits (comments / whitespace only) are detected and fail constraint verification', async () => {
        const sid = `test-superficial-${Date.now()}`;
        const session = initSession({ sessionId: sid, language: 'python' });
        session.baselinePassed = true;
        session.snapshots.baselineCode = baselineCode;
        session.snapshots.preMutationCode = baselineCode;

        mutationEngine.activateCandidateMutation(sid, baselineCode);

        // Add dummy comments/whitespace
        const dummyModifiedCode = `# Added a comment\n` + baselineCode + `\n\n# Another trailing comment`;

        let responseJson = null;
        const req = {
            body: {
                sessionId: sid,
                code: dummyModifiedCode,
                language: 'python'
            },
            headers: {}
        };
        const res = {
            json: (data) => {
                responseJson = data;
                return res;
            },
            status: () => res
        };

        await runDMCEMutation(req, res);

        assert.ok(responseJson, 'Expected JSON response');
        assert.strictEqual(responseJson.mutationStatus, 'FAILED');
        assert.strictEqual(responseJson.status, 'MEMORY_LIMIT_EXCEEDED');

        mutationEngine.cleanupSession(sid);
    });

    console.log(`\n================================================================`);
    console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed (Total: ${passed + failed})`);
    console.log(`================================================================`);

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Test suite runner error:', err);
    process.exit(1);
});
