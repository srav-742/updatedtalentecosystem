/**
 * Hire1Percent Shared Test-Case Resolution Pipeline
 * 
 * Reusable helper providing canonical test-case resolution, normalization,
 * and validation across baseline execution, mutation execution, and recruiter configuration.
 * 
 * Invariants:
 * 1. Prefers configured question.testCases when they contain valid test cases.
 * 2. Falls back to question.examples when testCases is empty, null, or has no valid scenarios.
 * 3. Preserves legitimate falsy values ("", 0, false) without discarding them via truthiness checks.
 * 4. Normalizes inputs and outputs into canonical execution format.
 * 5. Returns structured TEST_CONFIGURATION_ERROR on malformed or empty test suites.
 */

const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Checks whether a raw value is explicitly defined (distinguishing "" and 0 from null/undefined).
 */
function isDefined(val) {
    return val !== undefined && val !== null;
}

/**
 * Normalizes an input value into the exact string format expected by execution runners (stdin/function).
 * Preserves "" as empty string, 0 as "0", false as "false", and serializes arrays/objects safely.
 */
function normalizeInputValue(val) {
    if (!isDefined(val)) {
        return '';
    }
    if (typeof val === 'string') {
        return val;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
        return String(val);
    }
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val);
        } catch (_) {
            return String(val);
        }
    }
    return String(val);
}

/**
 * Normalizes an expected output value into a standard string representation.
 */
function normalizeExpectedOutputValue(val) {
    if (!isDefined(val)) {
        return '';
    }
    if (typeof val === 'string') {
        return val;
    }
    if (typeof val === 'number') {
        return String(val);
    }
    if (typeof val === 'boolean') {
        return String(val).toLowerCase();
    }
    if (typeof val === 'object') {
        try {
            return JSON.stringify(val);
        } catch (_) {
            return String(val);
        }
    }
    return String(val);
}

/**
 * Normalizes a single test case record into the canonical test case schema.
 * 
 * Canonical schema:
 * {
 *   id: string,
 *   input: string,
 *   expectedOutput: string,
 *   isHidden: boolean,
 *   category: 'NORMAL' | 'BOUNDARY' | 'EDGE_CASE' | 'PERFORMANCE' | 'MUTATION' | 'CUSTOM',
 *   explanation: string,
 *   timeoutMs: number
 * }
 */
function normalizeTestCase(rawCase, index = 0, source = 'testCases') {
    if (!rawCase || typeof rawCase !== 'object') {
        return {
            isValid: false,
            error: `Test case at index ${index} is not a valid object.`
        };
    }

    // Resolve raw input from known field names
    const hasRawInput = isDefined(rawCase.input) || isDefined(rawCase.stdin);
    const rawInput = isDefined(rawCase.input) ? rawCase.input : (isDefined(rawCase.stdin) ? rawCase.stdin : null);

    // Resolve raw expected output from known field names (testCases use expectedOutput, examples use output)
    const hasRawOutput = isDefined(rawCase.expectedOutput) || isDefined(rawCase.output) || isDefined(rawCase.stdout);
    const rawOutput = isDefined(rawCase.expectedOutput)
        ? rawCase.expectedOutput
        : (isDefined(rawCase.output) ? rawCase.output : (isDefined(rawCase.stdout) ? rawCase.stdout : null));

    if (!hasRawInput && !hasRawOutput) {
        return {
            isValid: false,
            error: `Test case at index ${index} is missing both input and expected output.`
        };
    }

    const normInput = normalizeInputValue(rawInput);
    const normOutput = normalizeExpectedOutputValue(rawOutput);

    let category = 'NORMAL';
    if (rawCase.isMutationSuite || String(rawCase.category).toUpperCase() === 'MUTATION') {
        category = 'MUTATION';
    } else {
        const categoryRaw = (rawCase.category || (source === 'examples' ? 'NORMAL' : 'NORMAL')).toUpperCase();
        if (['BOUNDARY', 'EDGE_CASE', 'PERFORMANCE', 'ALGORITHM', 'CUSTOM'].includes(categoryRaw)) {
            category = categoryRaw;
        } else if (categoryRaw === 'EDGE') {
            category = 'EDGE_CASE';
        }
    }

    const testId = rawCase._id ? String(rawCase._id) : `${source}-${index + 1}`;

    return {
        isValid: true,
        testCase: {
            id: testId,
            _id: rawCase._id || undefined,
            input: normInput,
            expectedOutput: normOutput,
            isHidden: Boolean(rawCase.isHidden),
            category,
            explanation: rawCase.explanation ? String(rawCase.explanation) : '',
            timeoutMs: Number(rawCase.timeoutMs) || DEFAULT_TIMEOUT_MS,
            source
        }
    };
}

/**
 * Resolves and normalizes all test cases for a question.
 * 
 * Rules:
 * 1. If question.testCases has valid items, use them.
 * 2. If question.testCases is empty/missing/invalid, fall back to question.examples.
 * 3. Returns { success: true, testCases: [...], source: 'testCases'|'examples' }
 *    OR { success: false, status: 'TEST_CONFIGURATION_ERROR', message: '...' }
 */
function resolveTestCasesForQuestion(question, options = {}) {
    if (!question || typeof question !== 'object') {
        return {
            success: false,
            status: 'TEST_CONFIGURATION_ERROR',
            message: 'Invalid question object provided for test case resolution.',
            testCases: []
        };
    }

    let resolvedCases = [];
    let source = 'none';

    // 1. Try question.testCases
    if (Array.isArray(question.testCases) && question.testCases.length > 0) {
        const validNormCases = [];
        let hasMalformed = false;
        let malformedError = '';

        for (let i = 0; i < question.testCases.length; i++) {
            const res = normalizeTestCase(question.testCases[i], i, 'testCases');
            if (res.isValid) {
                validNormCases.push(res.testCase);
            } else {
                hasMalformed = true;
                malformedError = res.error;
            }
        }

        if (validNormCases.length > 0) {
            resolvedCases = validNormCases;
            source = 'testCases';
        } else if (hasMalformed && (!Array.isArray(question.examples) || question.examples.length === 0)) {
            return {
                success: false,
                status: 'TEST_CONFIGURATION_ERROR',
                message: `Malformed test cases configured on question: ${malformedError}`,
                testCases: []
            };
        }
    }

    // 2. Fall back to question.examples if no valid testCases found
    if (resolvedCases.length === 0 && Array.isArray(question.examples) && question.examples.length > 0) {
        const validExampleCases = [];
        let hasMalformed = false;
        let malformedError = '';

        for (let i = 0; i < question.examples.length; i++) {
            const res = normalizeTestCase(question.examples[i], i, 'examples');
            if (res.isValid) {
                // Examples are always public normal tests
                res.testCase.isHidden = false;
                res.testCase.category = 'NORMAL';
                validExampleCases.push(res.testCase);
            } else {
                hasMalformed = true;
                malformedError = res.error;
            }
        }

        if (validExampleCases.length > 0) {
            resolvedCases = validExampleCases;
            source = 'examples';
        } else if (hasMalformed) {
            return {
                success: false,
                status: 'TEST_CONFIGURATION_ERROR',
                message: `Malformed question examples: ${malformedError}`,
                testCases: []
            };
        }
    }

    // 3. If still empty, return structured configuration error
    if (resolvedCases.length === 0) {
        return {
            success: false,
            status: 'TEST_CONFIGURATION_ERROR',
            message: 'No validated test cases or examples configured for this question.',
            testCases: []
        };
    }

    // Optional filtering (e.g. excludeHidden)
    if (options.publicOnly) {
        resolvedCases = resolvedCases.filter(t => !t.isHidden);
    }

    return {
        success: true,
        testCases: resolvedCases,
        source
    };
}

/**
 * Selects 3-4 appropriate test cases for Stage-1 DMCE Baseline execution.
 * Prioritizes basic NORMAL and BOUNDARY/EDGE_CASE tests, and strictly excludes MUTATION tests.
 */
function getBaselineTestCases(testCases = []) {
    if (!Array.isArray(testCases) || testCases.length === 0) {
        return [];
    }

    // Filter out MUTATION-specific tests
    const candidates = testCases.filter(tc => tc.category !== 'MUTATION');
    if (candidates.length === 0) {
        return [];
    }

    const normalTests = candidates.filter(tc => !tc.isHidden || tc.category === 'NORMAL');
    const edgeTests = candidates.filter(tc => tc.category === 'BOUNDARY' || tc.category === 'EDGE_CASE');

    const selected = [];

    // Up to 3 normal tests
    normalTests.slice(0, 3).forEach(tc => selected.push(tc));

    // Add 1 edge test if available and room exists
    if (edgeTests.length > 0 && selected.length < 4) {
        const candidateEdge = edgeTests.find(e => !selected.some(s => String(s.id) === String(e.id)));
        if (candidateEdge) {
            selected.push(candidateEdge);
        }
    }

    // If still fewer than 3, backfill from remaining candidates
    if (selected.length < 3) {
        for (const tc of candidates) {
            if (selected.length >= 4) break;
            if (!selected.some(s => String(s.id) === String(tc.id))) {
                selected.push(tc);
            }
        }
    }

    return selected.length > 0 ? selected : candidates.slice(0, 4);
}

/**
 * Selects test cases for Stage-2 DMCE Mutated execution.
 * Prioritizes tests tagged with category === 'MUTATION'.
 * If none exist, falls back to performance/boundary/hidden tests or full candidate test suite.
 */
function getMutationTestCases(testCases = []) {
    if (!Array.isArray(testCases) || testCases.length === 0) {
        return [];
    }

    const mutationCases = testCases.filter(tc => tc.category === 'MUTATION');
    if (mutationCases.length > 0) {
        return mutationCases;
    }

    // Fallback: select performance, boundary, or hidden tests
    const fallbackCases = testCases.filter(tc => tc.isHidden || tc.category === 'PERFORMANCE' || tc.category === 'BOUNDARY');
    return fallbackCases.length > 0 ? fallbackCases : testCases;
}

/**
 * Masks hidden test cases for safe candidate-facing API responses.
 * Preserves metadata (id, category, isHidden) while hiding input, expectedOutput, and actual details.
 */
function maskHiddenTestCases(results = []) {
    if (!Array.isArray(results)) return [];
    return results.map(r => {
        if (r.isHidden) {
            return {
                id: r.id || r._id,
                category: r.category || 'EDGE_CASE',
                isHidden: true,
                passed: Boolean(r.passed),
                status: r.passed ? 'PASSED' : (r.status || 'FAILED'),
                executionTime: r.executionTime,
                actualOutput: r.passed ? 'Passed' : 'Failed'
                // input, expectedOutput, stderr are strictly masked
            };
        }
        return r;
    });
}

module.exports = {
    isDefined,
    normalizeInputValue,
    normalizeExpectedOutputValue,
    normalizeTestCase,
    resolveTestCasesForQuestion,
    getBaselineTestCases,
    getMutationTestCases,
    maskHiddenTestCases,
    DEFAULT_TIMEOUT_MS
};
