/**
 * Hire1Percent Coding Question Bank — Test-Case Validation & Negative Testing Script
 * 
 * Validates seeded questions against their stored test cases using the existing
 * sandbox execution service (executeAgainstTestCases).
 * 
 * Also runs negative tests (wrong answer, syntax error, infinite loop/timeout)
 * to verify that the sandbox correctly rejects invalid submissions.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const { executeAgainstTestCases } = require('../services/codeExecutionService');
const QuestionBank = require('../models/QuestionBank');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/talent-ecosystem';

async function validateAllQuestions() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Hire1Percent — Question Bank Validation Service');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('[DB] Connected to MongoDB\n');

        const questions = await QuestionBank.find({});
        console.log(`[VALIDATION] Total questions in database: ${questions.length}\n`);

        let validatedCount = 0;
        let failedCount = 0;
        let totalTestCases = 0;
        let passedTestCases = 0;

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const refSolution = q.referenceSolution;
            let code = null;

            if (refSolution) {
                if (refSolution.get) {
                    code = refSolution.get('python') || refSolution.get('javascript');
                } else if (typeof refSolution === 'object') {
                    code = refSolution.python || refSolution.javascript;
                }
            }

            if (!code) {
                console.warn(`[SKIP] ${q.slug}: No reference solution available.`);
                continue;
            }

            const tcs = q.testCases.map(tc => ({
                _id: tc._id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden,
                category: tc.category
            }));

            totalTestCases += tcs.length;

            const result = await executeAgainstTestCases({
                code,
                language: 'python',
                testCases: tcs,
                maskHiddenDetails: false
            });

            let qPassed = true;
            for (const tcResult of result.results) {
                const tcDoc = q.testCases.id(tcResult.id);
                if (tcDoc) {
                    if (tcResult.passed) {
                        tcDoc.validationStatus = 'VALIDATED';
                        passedTestCases++;
                    } else {
                        tcDoc.validationStatus = 'FAILED_VALIDATION';
                        qPassed = false;
                    }
                }
            }

            q.testCasesValidatedAt = new Date();
            q.validationMetrics = {
                totalGenerated: tcs.length,
                validatedCount: result.passed,
                failedCount: result.failed,
                validationMethod: 'SANDBOX_REFERENCE_EXECUTION'
            };

            if (qPassed) {
                q.approvalStatus = 'APPROVED';
                q.approvedBy = 'system_validator';
                q.approvedAt = new Date();
                validatedCount++;
            } else {
                q.approvalStatus = 'REJECTED';
                q.rejectionReason = `Failed validation: ${result.failed}/${result.total} test cases failed.`;
                failedCount++;
            }

            await q.save();

            const statusSymbol = qPassed ? '✓' : '✗';
            console.log(`[${i + 1}/${questions.length}] ${statusSymbol} ${q.slug} — ${result.passed}/${result.total} test cases passed (${q.difficulty})`);
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  VALIDATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`  Questions Validated & Approved: ${validatedCount}`);
        console.log(`  Questions Failed:               ${failedCount}`);
        console.log(`  Total Test Cases Checked:       ${totalTestCases}`);
        console.log(`  Pass Rate:                      ${((passedTestCases / totalTestCases) * 100).toFixed(1)}%`);
        console.log('═══════════════════════════════════════════════════════\n');

        // ─── Negative Testing ──────────────────────────────────────────
        console.log('─── RUNNING NEGATIVE VALIDATION TESTS ───────────────');

        // Test 1: Intentional Wrong Answer
        const wrongAnswerResult = await executeAgainstTestCases({
            code: 'print("completely_wrong_output")',
            language: 'python',
            testCases: [{ input: '5\n1 2 3 4 5', expectedOutput: '15' }]
        });
        const negative1Passed = wrongAnswerResult.failed === 1 && (wrongAnswerResult.results[0]?.status === 'WRONG_ANSWER' || wrongAnswerResult.status === 'FAILED');
        console.log(`[NEGATIVE TEST 1] Wrong Answer Detection: ${negative1Passed ? 'PASSED ✓' : 'FAILED ✗'}`);

        // Test 2: Syntax / Compilation Error
        const syntaxErrorResult = await executeAgainstTestCases({
            code: 'def broken_syntax(:\n    print(1)',
            language: 'python',
            testCases: [{ input: '1', expectedOutput: '1' }]
        });
        const negative2Passed = syntaxErrorResult.failed === 1 && (syntaxErrorResult.status === 'COMPILATION_ERROR' || syntaxErrorResult.status === 'RUNTIME_ERROR');
        console.log(`[NEGATIVE TEST 2] Syntax Error Detection: ${negative2Passed ? 'PASSED ✓' : 'FAILED ✗'}`);

        // Test 3: Infinite Loop / Timeout
        const timeoutResult = await executeAgainstTestCases({
            code: 'while True: pass',
            language: 'python',
            testCases: [{ input: '1', expectedOutput: '1', timeoutMs: 2000 }]
        });
        const negative3Passed = timeoutResult.failed === 1 && (timeoutResult.status === 'TIME_LIMIT_EXCEEDED' || timeoutResult.results[0]?.status === 'TIME_LIMIT_EXCEEDED');
        console.log(`[NEGATIVE TEST 3] Timeout Detection: ${negative3Passed ? 'PASSED ✓' : 'FAILED ✗'}`);

        console.log('─────────────────────────────────────────────────────\n');

    } catch (err) {
        console.error('[FATAL] Validation failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('[DB] Disconnected from MongoDB');
    }
}

if (require.main === module) {
    validateAllQuestions();
}

module.exports = { validateAllQuestions };
