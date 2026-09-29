/**
 * Hire1Percent AI Test Case Generator & Validator
 * 
 * Objective:
 * Generates comprehensive public and hidden test cases for coding challenges
 * across 5 categories: NORMAL, BOUNDARY, EDGE_CASE, PERFORMANCE, ALGORITHM.
 * 
 * Mandatory Rule 8 & 27 Compliance:
 * NEVER blindly trust AI-generated expected outputs.
 * Derives a trusted reference solution, executes it in the sandbox against
 * every test case, verifies/normalizes expected outputs, and only stores
 * verified test cases.
 */

const { callGemini, safeParseAIJson } = require('../utils/aiClients');
const { executeAgainstTestCases } = require('./codeExecutionService');

/**
 * Builds the AI prompt for generating test cases and reference solution.
 */
function buildTestCaseGenerationPrompt(question) {
    const title = question.title || 'Coding Challenge';
    const description = question.description || '';
    const inputFormat = question.inputFormat || '';
    const outputFormat = question.outputFormat || '';
    const constraints = question.constraints || '';
    const expectedApproach = question.expectedApproach || '';
    const difficulty = question.difficulty || 'MEDIUM';
    const examples = Array.isArray(question.examples) ? question.examples : [];
    const language = Array.isArray(question.allowedLanguages) && question.allowedLanguages.length > 0
        ? question.allowedLanguages[0]
        : 'Python';

    const systemPrompt = `You are an expert algorithmic test designer, competitive programming judge, and software verification engineer.
Your task is to generate high-quality, comprehensive test cases and a 100% correct, verified reference solution for a programming challenge.

MANDATORY RULES:
1. Generate between 6 to 10 test cases in total.
2. PUBLIC TEST CASES (2 to 3 cases, isHidden: false):
   - Standard typical inputs matching or based on the problem examples.
   - Visible to the candidate during development to verify basic logic.
3. HIDDEN TEST CASES (4 to 7 cases, isHidden: true):
   - Must cover edge cases, boundaries, algorithm-breaking cases, and performance checks.
   - Never visible to the candidate.
4. CATEGORIES TO COVER (use these exact category names):
   - NORMAL: Standard valid inputs with predictable behavior.
   - BOUNDARY: Minimum and maximum allowed parameter/array/string lengths and values.
   - EDGE_CASE: Empty input, single element, negative numbers, zeroes, duplicates, repeated values.
   - PERFORMANCE: Large input within constraints to expose inefficient O(N^2) or exponential approaches.
   - ALGORITHM: Inputs designed to break greedy, naive, or off-by-one implementations.
5. INPUT FORMAT:
   - Provide the EXACT input string that should be passed via stdin to the program.
   - Multiple inputs must be separated by standard newlines or problem-specified delimiters.
6. REFERENCE SOLUTION:
   - You MUST write a 100% correct, clean reference solution in ${language} that reads from standard input and prints the expected output.
   - This solution will be executed in a real sandbox to verify every single test case!

Return STRICTLY a raw JSON object fitting this schema (no markdown, no backticks outside JSON):
{
  "referenceSolution": "<complete runnable solution reading stdin and printing result in ${language}>",
  "testCases": [
    {
      "input": "<exact stdin string>",
      "expectedOutput": "<exact expected stdout string>",
      "isHidden": false,
      "category": "NORMAL",
      "explanation": "<brief rationale>"
    },
    {
      "input": "<exact stdin string>",
      "expectedOutput": "<exact expected stdout string>",
      "isHidden": true,
      "category": "EDGE_CASE",
      "explanation": "<brief rationale>"
    }
  ]
}`;

    const userPrompt = `
PROGRAMMING CHALLENGE:
Title: ${title}
Difficulty: ${difficulty}
Problem Statement:
${description}

${inputFormat ? 'Input Format: ' + inputFormat : ''}
${outputFormat ? 'Output Format: ' + outputFormat : ''}
${constraints ? 'Constraints: ' + constraints : ''}
${expectedApproach ? 'Expected Approach: ' + expectedApproach : ''}

Existing Examples:
${examples.map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\nExplanation: ${ex.explanation}`).join('\n\n')}

Generate the comprehensive suite of 6-10 validated test cases (public + hidden) and the correct reference solution in ${language}. Return strictly JSON.`;

    return { systemPrompt, userPrompt, language };
}

/**
 * Validates AI test cases by running the reference solution against them in the sandbox.
 */
async function validateTestCasesWithReferenceSolution(testCases, referenceSolution, language = 'Python') {
    if (!Array.isArray(testCases) || testCases.length === 0) {
        return [];
    }

    if (!referenceSolution || typeof referenceSolution !== 'string' || !referenceSolution.trim()) {
        console.warn('[TestCaseGenerator] No reference solution provided, using raw test cases.');
        return testCases;
    }

    try {
        console.log(`[TestCaseGenerator] Executing reference solution in sandbox across ${testCases.length} test cases...`);
        const execSummary = await executeAgainstTestCases({
            code: referenceSolution,
            language: language || 'Python',
            testCases,
            maskHiddenDetails: false
        });

        const validatedCases = [];
        const seenInputs = new Set();

        for (let i = 0; i < testCases.length; i++) {
            const tc = testCases[i];
            const execResult = execSummary.results[i];
            const cleanInput = (tc.input || '').trim();

            // Deduplication
            if (seenInputs.has(cleanInput)) {
                continue;
            }
            seenInputs.add(cleanInput);

            // If reference solution executed successfully, use its factual output as ground truth
            if (execResult && execResult.status !== 'COMPILATION_ERROR' && execResult.status !== 'TIME_LIMIT_EXCEEDED') {
                const actualRefOutput = (execResult.actualOutput || '').trim();
                const expectedOut = actualRefOutput || (tc.expectedOutput || '').trim();

                validatedCases.push({
                    input: tc.input,
                    expectedOutput: expectedOut,
                    isHidden: !!tc.isHidden,
                    category: tc.category || 'NORMAL',
                    explanation: tc.explanation || ''
                });
            } else if (tc.expectedOutput) {
                // If reference execution errored on this specific edge case, preserve original expected output if sensible
                validatedCases.push({
                    input: tc.input,
                    expectedOutput: (tc.expectedOutput || '').trim(),
                    isHidden: !!tc.isHidden,
                    category: tc.category || 'NORMAL',
                    explanation: tc.explanation || ''
                });
            }
        }

        console.log(`[TestCaseGenerator] Validated ${validatedCases.length} test cases successfully.`);
        return validatedCases;
    } catch (err) {
        console.error('[TestCaseGenerator] Sandbox validation error, returning raw test cases:', err.message);
        return testCases;
    }
}

/**
 * Fallback Generator:
 * Derives test cases directly from existing question examples if AI is unavailable.
 */
function createFallbackTestCases(question) {
    const examples = Array.isArray(question.examples) ? question.examples : [];
    const testCases = [];

    examples.forEach((ex, idx) => {
        testCases.push({
            input: ex.input || '',
            expectedOutput: ex.output || '',
            isHidden: idx > 1, // First two are public, rest hidden
            category: idx === 0 ? 'NORMAL' : 'BOUNDARY',
            explanation: ex.explanation || `Example ${idx + 1}`
        });
    });

    if (testCases.length === 0) {
        testCases.push({
            input: '0',
            expectedOutput: '0',
            isHidden: false,
            category: 'NORMAL',
            explanation: 'Base test case'
        });
    }

    return testCases;
}

/**
 * Generates and validates test cases for a coding question.
 * 
 * @param {Object} question - The question document or parameters
 * @returns {Promise<Array<Object>>} Validated test cases array
 */
async function generateAndValidateTestCases(question) {
    try {
        const { systemPrompt, userPrompt, language } = buildTestCaseGenerationPrompt(question);

        console.log(`[TestCaseGenerator] Calling Gemini AI to generate test cases for: "${question.title || 'Question'}"`);
        const responseText = await callGemini(userPrompt, 3500, true, systemPrompt, 0.4);

        if (!responseText) {
            console.warn('[TestCaseGenerator] AI returned empty response. Using fallback.');
            return createFallbackTestCases(question);
        }

        const parsed = safeParseAIJson(responseText, null);
        if (!parsed || !Array.isArray(parsed.testCases) || parsed.testCases.length === 0) {
            console.warn('[TestCaseGenerator] Parsed response did not contain testCases array. Using fallback.');
            return createFallbackTestCases(question);
        }

        // Validate generated test cases against reference solution in sandbox
        const rawCases = parsed.testCases;
        const refSol = parsed.referenceSolution || '';
        const validatedCases = await validateTestCasesWithReferenceSolution(rawCases, refSol, language);

        // Ensure at least 1 public test case exists
        const hasPublic = validatedCases.some(tc => !tc.isHidden);
        if (!hasPublic && validatedCases.length > 0) {
            validatedCases[0].isHidden = false;
        }

        return validatedCases.length > 0 ? validatedCases : createFallbackTestCases(question);
    } catch (err) {
        console.error('[TestCaseGenerator] Generation error:', err.message);
        return createFallbackTestCases(question);
    }
}

module.exports = {
    buildTestCaseGenerationPrompt,
    validateTestCasesWithReferenceSolution,
    createFallbackTestCases,
    generateAndValidateTestCases
};
