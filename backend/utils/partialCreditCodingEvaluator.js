/**
 * Hire1Percent Partial-Credit Coding Evaluation Engine
 * 
 * Objective:
 * Provide fair, evidence-based partial credit for candidate coding submissions.
 * Distinguishes algorithmic correctness from functional execution defects.
 * 
 * Scoring Dimensions (Internal 100-Point Scale):
 * - Core Algorithm / Logic:       40 marks
 * - Functional Correctness:       30 marks
 * - Test-Case Coverage:           15 marks
 * - Edge-Case Handling:           10 marks
 * - Code Quality / Efficiency:     5 marks
 * ----------------------------------------
 * Total:                         100 marks
 */

const { callGemini, safeParseAIJson } = require('./aiClients');

// Configurable Scoring Dimension Weights (Total = 100)
const SCORING_WEIGHTS = Object.freeze({
    ALGORITHM: 40,
    FUNCTIONALITY: 30,
    TEST_COVERAGE: 15,
    EDGE_CASES: 10,
    QUALITY: 5
});

// 12 Standard Bug Classifications
const BUG_TYPES = Object.freeze([
    'SYNTAX_ERROR',
    'COMPILATION_ERROR',
    'RUNTIME_ERROR',
    'MINOR_IMPLEMENTATION_BUG',
    'MAJOR_IMPLEMENTATION_BUG',
    'EDGE_CASE_FAILURE',
    'OUTPUT_FORMAT_ERROR',
    'PERFORMANCE_ISSUE',
    'PARTIALLY_CORRECT_ALGORITHM',
    'WRONG_ALGORITHM',
    'INCOMPLETE_SOLUTION',
    'NO_MEANINGFUL_SOLUTION'
]);

const BUG_SEVERITIES = Object.freeze(['minor', 'major', 'critical']);

/**
 * Rounds a number to exactly 2 decimal places.
 */
function round2(num) {
    return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Normalizes a bug type string to one of the 12 standard bug categories.
 */
function normalizeBugType(rawType) {
    if (!rawType || typeof rawType !== 'string') return 'MINOR_IMPLEMENTATION_BUG';
    const clean = rawType.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (BUG_TYPES.includes(clean)) return clean;

    // Fuzzy matching fallbacks
    if (clean.includes('SYNTAX')) return 'SYNTAX_ERROR';
    if (clean.includes('COMPILE') || clean.includes('COMPILATION')) return 'COMPILATION_ERROR';
    if (clean.includes('RUNTIME') || clean.includes('EXCEPTION') || clean.includes('CRASH')) return 'RUNTIME_ERROR';
    if (clean.includes('EDGE') || clean.includes('BOUNDARY')) return 'EDGE_CASE_FAILURE';
    if (clean.includes('FORMAT') || clean.includes('OUTPUT')) return 'OUTPUT_FORMAT_ERROR';
    if (clean.includes('PERFORM') || clean.includes('TIME') || clean.includes('TIMEOUT') || clean.includes('COMPLEXITY')) return 'PERFORMANCE_ISSUE';
    if (clean.includes('WRONG_ALGO') || clean.includes('INCORRECT_ALGO')) return 'WRONG_ALGORITHM';
    if (clean.includes('PARTIAL')) return 'PARTIALLY_CORRECT_ALGORITHM';
    if (clean.includes('INCOMPLETE')) return 'INCOMPLETE_SOLUTION';
    if (clean.includes('EMPTY') || clean.includes('NO_SOLUTION')) return 'NO_MEANINGFUL_SOLUTION';
    if (clean.includes('MAJOR')) return 'MAJOR_IMPLEMENTATION_BUG';

    return 'MINOR_IMPLEMENTATION_BUG';
}

/**
 * Normalizes bug severity to 'minor', 'major', or 'critical'.
 */
function normalizeBugSeverity(rawSeverity) {
    if (!rawSeverity || typeof rawSeverity !== 'string') return 'minor';
    const clean = rawSeverity.trim().toLowerCase();
    if (BUG_SEVERITIES.includes(clean)) return clean;
    if (clean.includes('crit') || clean.includes('fatal') || clean.includes('block')) return 'critical';
    if (clean.includes('maj') || clean.includes('high') || clean.includes('severe')) return 'major';
    return 'minor';
}

/**
 * Checks if submitted code contains meaningful implementation beyond starter templates and empty comments.
 */
function isMeaningfulCode(code, language) {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    if (trimmed.length === 0) return false;

    // Strip comments and common starter boilerplate
    const stripped = trimmed
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
        .replace(/#.*/g, '')
        .replace(/--.*/g, '')
        .trim();

    if (stripped.length === 0) return false;

    // Common pure starter templates that have no real logic
    const starterSignatures = [
        /^def\s+solution\s*\([^)]*\)\s*:\s*(?:pass)?$/i,
        /^function\s+solution\s*\([^)]*\)\s*\{\s*\}$/i,
        /^public\s+class\s+Solution\s*\{\s*public\s+static\s+void\s+main\s*\([^)]*\)\s*\{\s*\}\s*\}$/i,
        /^#include\s*<iostream>[\s\S]*int\s+main\s*\([^)]*\)\s*\{\s*return\s+0;\s*\}$/i,
        /^SELECT\s+\*\s+FROM\s+users;?$/i
    ];

    for (const sig of starterSignatures) {
        if (sig.test(stripped)) return false;
    }

    // Check if stripped code has at least one statement or expression
    return stripped.length >= 10;
}

/**
 * Creates an immediate deterministic evaluation for empty or boilerplate-only submissions.
 */
function createDeterministicZeroEvaluation(reason = 'No meaningful solution submitted.') {
    return {
        algorithm: {
            score: 0,
            maxScore: SCORING_WEIGHTS.ALGORITHM,
            status: 'incorrect',
            reason: reason
        },
        functionality: {
            score: 0,
            maxScore: SCORING_WEIGHTS.FUNCTIONALITY,
            passedTests: 0,
            totalTests: 10,
            reason: 'Code was not submitted or contains only empty starter boilerplate.'
        },
        testCoverage: {
            score: 0,
            maxScore: SCORING_WEIGHTS.TEST_COVERAGE,
            reason: 'Zero test cases passed.'
        },
        edgeCases: {
            score: 0,
            maxScore: SCORING_WEIGHTS.EDGE_CASES,
            reason: 'No edge-case logic implemented.'
        },
        quality: {
            score: 0,
            maxScore: SCORING_WEIGHTS.QUALITY,
            reason: 'No functional code to evaluate.'
        },
        bugs: [
            {
                type: 'NO_MEANINGFUL_SOLUTION',
                severity: 'critical',
                description: reason,
                evidence: 'Submission is empty or contains only unedited starter boilerplate.',
                impact: 'No marks can be awarded.'
            }
        ],
        finalScore: 0,
        confidence: 100,
        summary: reason,
        correctnessVerdict: 'Incorrect',
        suggestedCode: ''
    };
}

/**
 * Formats a clean, constructive feedback report incorporating the structured 5-dimension breakdown,
 * identified issues, and specific suggestions.
 */
function buildStructuredFeedbackText({
    algorithm,
    functionality,
    testCoverage,
    edgeCases,
    quality,
    bugs,
    finalScore,
    summary,
    correctnessVerdict
}) {
    const lines = [];

    lines.push(`EVALUATION SUMMARY`);
    lines.push(`Verdict: ${correctnessVerdict} • Internal Score: ${finalScore}/100`);
    if (summary) {
        lines.push(`${summary.trim()}`);
    }
    lines.push('');

    lines.push(`DIMENSION BREAKDOWN:`);
    lines.push(`• Core Algorithm / Logic: ${algorithm.score}/${algorithm.maxScore} (${algorithm.status})`);
    if (algorithm.reason) lines.push(`  - ${algorithm.reason}`);

    lines.push(`• Functional Correctness: ${functionality.score}/${functionality.maxScore} (${functionality.passedTests}/${functionality.totalTests || 10} tests passed)`);
    if (functionality.reason) lines.push(`  - ${functionality.reason}`);

    lines.push(`• Test-Case Coverage: ${testCoverage.score}/${testCoverage.maxScore}`);
    if (testCoverage.reason) lines.push(`  - ${testCoverage.reason}`);

    lines.push(`• Edge-Case Handling: ${edgeCases.score}/${edgeCases.maxScore}`);
    if (edgeCases.reason) lines.push(`  - ${edgeCases.reason}`);

    lines.push(`• Code Quality & Efficiency: ${quality.score}/${quality.maxScore}`);
    if (quality.reason) lines.push(`  - ${quality.reason}`);

    if (Array.isArray(bugs) && bugs.length > 0) {
        lines.push('');
        lines.push(`IDENTIFIED ISSUES & ROOT CAUSES:`);
        bugs.forEach((b, idx) => {
            const typeStr = b.type || 'BUG';
            const sevStr = (b.severity || 'minor').toUpperCase();
            lines.push(`${idx + 1}. [${typeStr} | ${sevStr}] ${b.description || 'Issue detected'}`);
            if (b.evidence) lines.push(`   Evidence: ${b.evidence}`);
            if (b.impact) lines.push(`   Impact: ${b.impact}`);
        });
    }

    return lines.join('\n');
}

/**
 * Strictly validates, bounds, and normalizes AI evaluation output.
 * Guarantees that:
 * 1. All 5 dimensions exist and are clamped to their respective maxScores.
 * 2. `finalScore` equals the sum of the 5 dimension scores.
 * 3. `finalScore` is clamped between 0 and 100.
 * 4. `confidence` is clamped between 0 and 100 and never added to the score.
 * 5. Bugs are normalized to the 12 standard bug types.
 */
function validateAndNormalizeEvaluation(rawJson, originalCode = '', maxMarks = 10) {
    if (!rawJson || typeof rawJson !== 'object') {
        return createDeterministicZeroEvaluation('Invalid evaluation payload received.');
    }

    // 1. Core Algorithm / Logic (Max 40)
    const rawAlgo = rawJson.algorithm || {};
    const algoMax = SCORING_WEIGHTS.ALGORITHM;
    let algoScore = typeof rawAlgo.score === 'number' ? rawAlgo.score : (typeof rawJson.algorithmScore === 'number' ? rawJson.algorithmScore : 0);
    algoScore = Math.max(0, Math.min(algoMax, round2(algoScore)));
    const algoStatus = ['correct', 'partial', 'incorrect'].includes((rawAlgo.status || '').toLowerCase())
        ? rawAlgo.status.toLowerCase()
        : (algoScore >= 35 ? 'correct' : algoScore >= 15 ? 'partial' : 'incorrect');
    const algoReason = String(rawAlgo.reason || rawAlgo.description || '').trim();

    // 2. Functional Correctness (Max 30)
    const rawFunc = rawJson.functionality || {};
    const funcMax = SCORING_WEIGHTS.FUNCTIONALITY;
    let funcScore = typeof rawFunc.score === 'number' ? rawFunc.score : (typeof rawJson.functionalityScore === 'number' ? rawJson.functionalityScore : 0);
    funcScore = Math.max(0, Math.min(funcMax, round2(funcScore)));
    const passedTests = Math.max(0, Math.min(10, parseInt(rawFunc.passedTests ?? rawJson.testCasesPassed, 10) || 0));
    const totalTests = Math.max(1, parseInt(rawFunc.totalTests ?? rawJson.totalTestCases, 10) || 10);
    const funcReason = String(rawFunc.reason || rawFunc.description || '').trim();

    // 3. Test-Case Coverage (Max 15)
    const rawCov = rawJson.testCoverage || {};
    const covMax = SCORING_WEIGHTS.TEST_COVERAGE;
    let covScore = typeof rawCov.score === 'number' ? rawCov.score : (typeof rawJson.testCoverageScore === 'number' ? rawJson.testCoverageScore : 0);
    covScore = Math.max(0, Math.min(covMax, round2(covScore)));
    const covReason = String(rawCov.reason || rawCov.description || '').trim();

    // 4. Edge-Case Handling (Max 10)
    const rawEdge = rawJson.edgeCases || {};
    const edgeMax = SCORING_WEIGHTS.EDGE_CASES;
    let edgeScore = typeof rawEdge.score === 'number' ? rawEdge.score : (typeof rawJson.edgeCasesScore === 'number' ? rawJson.edgeCasesScore : 0);
    edgeScore = Math.max(0, Math.min(edgeMax, round2(edgeScore)));
    const edgeReason = String(rawEdge.reason || rawEdge.description || '').trim();

    // 5. Code Quality / Efficiency (Max 5)
    const rawQual = rawJson.quality || {};
    const qualMax = SCORING_WEIGHTS.QUALITY;
    let qualScore = typeof rawQual.score === 'number' ? rawQual.score : (typeof rawJson.qualityScore === 'number' ? rawJson.qualityScore : 0);
    qualScore = Math.max(0, Math.min(qualMax, round2(qualScore)));
    const qualReason = String(rawQual.reason || rawQual.description || '').trim();

    // Enforce exact sum invariant: finalScore = algo + func + cov + edge + qual
    const calculatedTotal = round2(algoScore + funcScore + covScore + edgeScore + qualScore);
    const finalScore = Math.max(0, Math.min(100, calculatedTotal));

    // Confidence: strictly 0 to 100, never added to score
    let confidence = typeof rawJson.confidence === 'number' ? rawJson.confidence : 85;
    confidence = Math.max(0, Math.min(100, round2(confidence)));

    // Normalize Bugs
    const rawBugs = Array.isArray(rawJson.bugs) ? rawJson.bugs : [];
    const bugs = rawBugs.map(b => ({
        type: normalizeBugType(b.type),
        severity: normalizeBugSeverity(b.severity),
        description: String(b.description || '').trim(),
        evidence: String(b.evidence || '').trim(),
        impact: String(b.impact || '').trim()
    })).filter(b => b.description.length > 0 || b.evidence.length > 0);

    // Derive Correctness Verdict
    let correctnessVerdict = 'Incorrect';
    if (finalScore >= 90) {
        correctnessVerdict = 'Correct';
    } else if (finalScore >= 35) {
        correctnessVerdict = 'Partially Correct';
    } else {
        correctnessVerdict = 'Incorrect';
    }

    const summary = String(rawJson.summary || rawJson.feedback || '').trim();
    const suggestedCode = String(rawJson.suggestedCode || '').trim();

    const normalizedEvaluation = {
        algorithm: {
            score: algoScore,
            maxScore: algoMax,
            status: algoStatus,
            reason: algoReason
        },
        functionality: {
            score: funcScore,
            maxScore: funcMax,
            passedTests,
            totalTests,
            reason: funcReason
        },
        testCoverage: {
            score: covScore,
            maxScore: covMax,
            reason: covReason
        },
        edgeCases: {
            score: edgeScore,
            maxScore: edgeMax,
            reason: edgeReason
        },
        quality: {
            score: qualScore,
            maxScore: qualMax,
            reason: qualReason
        },
        bugs,
        finalScore,
        confidence,
        summary,
        correctnessVerdict,
        suggestedCode
    };

    // Build the human-readable formatted feedback string
    const formattedFeedback = buildStructuredFeedbackText(normalizedEvaluation);

    return {
        ...normalizedEvaluation,
        feedback: formattedFeedback
    };
}

/**
 * Deterministic Fallback Engine:
 * Activated if AI call fails, times out, or returns unparseable output.
 * Performs safe heuristic source-code analysis to award reasonable partial credit
 * so candidate submissions never crash or fail silently.
 */
function createDeterministicFallbackEvaluation({
    code,
    language,
    question,
    maxMarks = 10,
    errorMessage = 'AI evaluation service unavailable. Deterministic fallback applied.'
}) {
    if (!isMeaningfulCode(code, language)) {
        return createDeterministicZeroEvaluation('No meaningful code found during deterministic fallback.');
    }

    const cleanCode = code.trim();

    // Heuristics for algorithmic structure
    let algoScore = 15; // Baseline for substantial code
    let funcScore = 10;
    let covScore = 5;
    let edgeScore = 2;
    let qualScore = 3;
    let passedTests = 4;
    const bugs = [];

    // Check for loops (iteration strategy)
    const hasLoop = /\b(for|while|forEach|map|filter|reduce)\b/.test(cleanCode);
    if (hasLoop) {
        algoScore += 8;
        covScore += 3;
    }

    // Check for conditionals (decision branching)
    const hasCondition = /\b(if|else|switch|case|\?)\b/.test(cleanCode);
    if (hasCondition) {
        algoScore += 7;
        edgeScore += 3;
    }

    // Check for return statement
    const hasReturn = /\breturn\b/.test(cleanCode);
    if (hasReturn) {
        funcScore += 5;
    } else {
        bugs.push({
            type: 'MINOR_IMPLEMENTATION_BUG',
            severity: 'minor',
            description: 'Solution does not contain an explicit return statement.',
            evidence: 'Missing return keyword.',
            impact: 'Function may return undefined or void.'
        });
    }

    // Check for function definition
    const hasFunction = /\b(def|function|class|public\s+static)\b/.test(cleanCode) || /=>/.test(cleanCode);
    if (hasFunction) {
        qualScore += 1;
    }

    // Clamp dimension scores
    algoScore = Math.min(SCORING_WEIGHTS.ALGORITHM, algoScore);
    funcScore = Math.min(SCORING_WEIGHTS.FUNCTIONALITY, funcScore);
    covScore = Math.min(SCORING_WEIGHTS.TEST_COVERAGE, covScore);
    edgeScore = Math.min(SCORING_WEIGHTS.EDGE_CASES, edgeScore);
    qualScore = Math.min(SCORING_WEIGHTS.QUALITY, qualScore);

    const finalScore = round2(algoScore + funcScore + covScore + edgeScore + qualScore);
    const correctnessVerdict = finalScore >= 90 ? 'Correct' : finalScore >= 35 ? 'Partially Correct' : 'Incorrect';

    const fallbackEval = {
        algorithm: {
            score: algoScore,
            maxScore: SCORING_WEIGHTS.ALGORITHM,
            status: 'partial',
            reason: 'Deterministic code analysis detected core program structure (iteration/conditionals).'
        },
        functionality: {
            score: funcScore,
            maxScore: SCORING_WEIGHTS.FUNCTIONALITY,
            passedTests,
            totalTests: 10,
            reason: 'Heuristic evaluation based on presence of returning execution logic.'
        },
        testCoverage: {
            score: covScore,
            maxScore: SCORING_WEIGHTS.TEST_COVERAGE,
            reason: 'Estimated baseline coverage based on code structure.'
        },
        edgeCases: {
            score: edgeScore,
            maxScore: SCORING_WEIGHTS.EDGE_CASES,
            reason: 'Basic boundary checks recognized in code.'
        },
        quality: {
            score: qualScore,
            maxScore: SCORING_WEIGHTS.QUALITY,
            reason: 'Clean syntax and identifiable structure.'
        },
        bugs,
        finalScore,
        confidence: 60,
        summary: `Deterministic fallback evaluation performed (${errorMessage}). Basic algorithmic reasoning credited based on code syntax.`,
        correctnessVerdict,
        suggestedCode: question?.expectedApproach ? `// Expected Approach:\n// ${question.expectedApproach}` : ''
    };

    const feedback = buildStructuredFeedbackText(fallbackEval);
    return {
        ...fallbackEval,
        feedback
    };
}

/**
 * Builds the AI prompt for structured partial-credit evaluation.
 */
function buildEvaluationPrompts({ question, code, language, dynamicInfo }) {
    const questionMaxMarks = dynamicInfo?.maximumMarks || question?.marks || 10;
    const difficulty = dynamicInfo?.difficulty || question?.difficulty || 'MEDIUM';

    const systemPrompt = `You are an expert technical interviewer, senior algorithmic reviewer, and code evaluation engine.
Your task is to provide an objective, EVIDENCE-BASED, PARTIAL-CREDIT evaluation of candidate code for a programming challenge.

CRITICAL EVALUATION PRINCIPLE:
Execution correctness and algorithmic correctness are NOT the same thing.
A failed test case does NOT mean algorithm score is 0.
Distinguish root causes from symptom effects. If a candidate used the correct algorithm or data structure but had an off-by-one error, initialization bug, or syntax issue, award high logic marks while reducing functional/edge-case marks. Do NOT double-penalize.
NEVER hallucinate candidate intent ("the candidate probably meant to..."). Every logic score must cite explicit code structures.

You must evaluate exactly according to this 100-point internal framework:
1. CORE ALGORITHM / LOGIC (0-40 marks): Did the candidate choose the right algorithmic approach, data structure, traversal, or state management?
2. FUNCTIONAL CORRECTNESS (0-30 marks): Execution evidence, passed/failed test cases, runtime/syntax errors.
3. TEST-CASE COVERAGE (0-15 marks): How many test cases pass out of 10? Are failures isolated or systemic?
4. EDGE-CASE HANDLING (0-10 marks): Empty input, single element, boundary numbers, negative values, duplicates, etc.
5. CODE QUALITY & EFFICIENCY (0-5 marks): Clean structure, reasonable time/space complexity, appropriate naming.

You MUST classify every detected bug into one of these 12 EXACT types:
- SYNTAX_ERROR
- COMPILATION_ERROR
- RUNTIME_ERROR
- MINOR_IMPLEMENTATION_BUG
- MAJOR_IMPLEMENTATION_BUG
- EDGE_CASE_FAILURE
- OUTPUT_FORMAT_ERROR
- PERFORMANCE_ISSUE
- PARTIALLY_CORRECT_ALGORITHM
- WRONG_ALGORITHM
- INCOMPLETE_SOLUTION
- NO_MEANINGFUL_SOLUTION

Return ONLY a raw JSON object fitting this EXACT schema (no markdown blocks, no text outside JSON):
{
  "algorithm": {
    "score": <number 0 to 40>,
    "maxScore": 40,
    "status": "correct" | "partial" | "incorrect",
    "reason": "<Specific explanation citing candidate code lines/constructs>"
  },
  "functionality": {
    "score": <number 0 to 30>,
    "maxScore": 30,
    "passedTests": <integer 0 to 10>,
    "totalTests": 10,
    "reason": "<Explanation of test outcomes and runtime behavior>"
  },
  "testCoverage": {
    "score": <number 0 to 15>,
    "maxScore": 15,
    "reason": "<Analysis of test coverage scope>"
  },
  "edgeCases": {
    "score": <number 0 to 10>,
    "maxScore": 10,
    "reason": "<Analysis of edge case handling>"
  },
  "quality": {
    "score": <number 0 to 5>,
    "maxScore": 5,
    "reason": "<Readability and complexity assessment>"
  },
  "bugs": [
    {
      "type": "<one of the 12 types above>",
      "severity": "minor" | "major" | "critical",
      "description": "<What is the root cause bug>",
      "evidence": "<Exact snippet or line showing the bug>",
      "impact": "<Why it causes failures>"
    }
  ],
  "finalScore": <sum of all 5 dimension scores above, 0 to 100>,
  "confidence": <integer 0 to 100>,
  "summary": "<2-3 sentence executive summary of candidate solution>",
  "suggestedCode": "<Complete, runnable, optimal solution in the SAME language without markdown formatting>"
}

CRITICAL:
- Ensure algorithm.score + functionality.score + testCoverage.score + edgeCases.score + quality.score === finalScore.
- Always provide complete runnable optimal solution in suggestedCode in ${language}.`;

    const userPrompt = `
PROGRAMMING CHALLENGE:
Title: ${question?.title || 'Coding Challenge'}
Difficulty: ${difficulty}
Description: ${question?.description || ''}
${question?.inputFormat ? 'Input Format: ' + question.inputFormat : ''}
${question?.outputFormat ? 'Output Format: ' + question.outputFormat : ''}
Constraints: ${question?.constraints || 'Standard constraints'}
${question?.expectedApproach ? 'Expected Approach: ' + question.expectedApproach : ''}
${Array.isArray(question?.examples) && question.examples.length > 0 ? 'Examples:\n' + question.examples.map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}\nExplanation: ${ex.explanation}`).join('\n\n') : ''}
Target Question Max Marks: ${questionMaxMarks}

CANDIDATE'S SUBMISSION:
Language: ${language || 'python'}
Source Code:
\`\`\`${(language || 'python').toLowerCase()}
${code}
\`\`\`

Perform the comprehensive partial-credit evaluation now. Return strictly raw JSON.`;

    return { systemPrompt, userPrompt };
}

/**
 * Main Evaluation Service Function:
 * Evaluates a single candidate coding submission.
 * 
 * @param {Object} params
 * @param {Object} params.question - The CodingQuestion model document
 * @param {string} params.code - Candidate submitted source code
 * @param {string} params.language - Language of submission
 * @param {Object} [params.dynamicInfo] - Normalized difficulty and marks
 * @returns {Promise<Object>} Complete evaluation result including marks, verdict, feedback, breakdown
 */
async function evaluateCodingSubmission({ question, code, language, dynamicInfo }) {
    const questionMaxMarks = dynamicInfo?.maximumMarks || question?.marks || 10;
    const normLang = language || 'python';

    // 1. Deterministic check: Empty or pure boilerplate submission
    if (!isMeaningfulCode(code, normLang)) {
        console.log(`[EVALUATOR] Empty or boilerplate code detected for question: ${question?._id || question?.title}`);
        const zeroEval = createDeterministicZeroEvaluation('No meaningful code submitted.');
        const obtainedMarks = 0;
        return {
            ...zeroEval,
            obtainedMarks,
            score: obtainedMarks,
            maximumMarks: questionMaxMarks,
            performancePercentage: 0,
            testCasesPassed: 0,
            totalTestCases: 10,
            aiEvaluationStatus: 'success',
            correctnessVerdict: 'Incorrect'
        };
    }

    // 2. Build Prompts
    const { systemPrompt, userPrompt } = buildEvaluationPrompts({
        question,
        code,
        language: normLang,
        dynamicInfo
    });

    let evalResult = null;
    let aiEvaluationStatus = 'failed';

    // 3. Invoke Gemini with retry
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            console.log(`[EVALUATOR] Calling Gemini AI evaluation (attempt ${attempt}) for: "${question?.title || 'Question'}"`);
            const responseText = await callGemini(userPrompt, 4000, true, systemPrompt, 0.3);
            if (responseText) {
                const parsed = safeParseAIJson(responseText, null);
                if (parsed && (parsed.algorithm || parsed.finalScore !== undefined || parsed.performancePercentage !== undefined)) {
                    evalResult = validateAndNormalizeEvaluation(parsed, code, questionMaxMarks);
                    aiEvaluationStatus = 'success';
                    console.log(`[EVALUATOR] AI Evaluation succeeded on attempt ${attempt}. Final internal score: ${evalResult.finalScore}/100`);
                    break;
                }
            }
        } catch (err) {
            console.error(`[EVALUATOR] AI Evaluation attempt ${attempt} failed:`, err.message);
            if (attempt < 2) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    // 4. Fallback if AI was unavailable or output was malformed
    if (!evalResult || aiEvaluationStatus === 'failed') {
        console.warn(`[EVALUATOR] AI evaluation failed or timed out. Falling back to deterministic analysis.`);
        evalResult = createDeterministicFallbackEvaluation({
            code,
            language: normLang,
            question,
            maxMarks: questionMaxMarks,
            errorMessage: 'AI evaluation service temporarily unavailable.'
        });
        aiEvaluationStatus = 'failed';
    }

    // 5. Calculate final proportional marks scaled to question maximum marks
    const internalPercentage = evalResult.finalScore; // 0 to 100
    const obtainedMarks = round2((internalPercentage / 100) * questionMaxMarks);

    return {
        ...evalResult,
        obtainedMarks,
        score: obtainedMarks,
        maximumMarks: questionMaxMarks,
        performancePercentage: internalPercentage,
        testCasesPassed: evalResult.functionality?.passedTests ?? 0,
        totalTestCases: evalResult.functionality?.totalTests ?? 10,
        aiEvaluationStatus,
        correctnessVerdict: evalResult.correctnessVerdict || (internalPercentage >= 90 ? 'Correct' : internalPercentage >= 35 ? 'Partially Correct' : 'Incorrect')
    };
}

module.exports = {
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
    buildStructuredFeedbackText,
    evaluateCodingSubmission
};
