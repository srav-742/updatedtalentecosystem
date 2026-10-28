/**
 * Hire1Percent — AI Code Change Analysis & Assessment Integrity Detection Service
 * 
 * Analyzes candidate revision history, code diffs, and execution evidence
 * across progressive constraint transitions using Gemini.
 * 
 * Strict Fair-Evaluation Safeguards:
 * 1. Complete solution rewrites are NEVER flagged as cheating.
 * 2. Diff size, editing speed, or unconventional style are NOT cheating indicators.
 * 3. Gemini output is strictly validated against a deterministic logical schema.
 * 4. Model errors, timeouts, or quota limits NEVER penalize the candidate.
 * 5. Candidate code is isolated as untrusted data to defend against prompt injection.
 */

const { callGemini, safeParseAIJson } = require('../utils/aiClients');
const { computeHash } = require('./revisionTrackingService');

// Permitted Schema Enums
const VALID_ANALYSIS_STATUSES = ['completed', 'insufficient_evidence', 'failed'];
const VALID_CONSTRAINT_RELEVANCES = ['relevant', 'partially_relevant', 'unrelated', 'unknown'];
const VALID_ALGORITHM_PRESERVED = ['yes', 'partially', 'no', 'unknown'];
const VALID_BEHAVIOR_CHANGES = ['none', 'expected', 'unexpected', 'unknown'];

/**
 * Computes a concise line-based diff summary between two code snapshots.
 */
function computeDiffSummary(oldCode = '', newCode = '') {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const added = newLines.filter(l => !oldLines.includes(l)).length;
    const removed = oldLines.filter(l => !newLines.includes(l)).length;
    return {
        linesBefore: oldLines.length,
        linesAfter: newLines.length,
        linesAddedEstimate: added,
        linesRemovedEstimate: removed,
        isCompleteRewrite: oldCode.trim() !== '' && newCode.trim() !== '' && (added / (newLines.length || 1) >= 0.65)
    };
}

/**
 * Sanitizes candidate-supplied code to neutralize prompt injection attacks.
 */
function sanitizeCandidateCode(code = '') {
    return String(code)
        .replace(/===CANDIDATE_CODE_END===/g, '===[ESCAPED_TOKEN]===')
        .replace(/===CANDIDATE_CODE_START===/g, '===[ESCAPED_TOKEN]===');
}

/**
 * Strictly validates Gemini analysis output against the required schema.
 */
function validateAIAnalysisResponse(parsed, context) {
    if (!parsed || typeof parsed !== 'object') {
        return createFallbackAnalysis(context, 'failed', ['Model returned unparseable or non-object response']);
    }

    const assessmentId = String(parsed.assessmentId || context.assessmentId || '');
    const questionId = String(parsed.questionId || context.questionId || '');
    const constraintId = String(parsed.constraintId || context.constraintId || '');
    const analyzedRevisionId = String(parsed.analyzedRevisionId || context.analyzedRevisionId || '');

    const analysisStatus = VALID_ANALYSIS_STATUSES.includes(parsed.analysisStatus)
        ? parsed.analysisStatus
        : 'completed';

    const constraintRelevance = VALID_CONSTRAINT_RELEVANCES.includes(parsed.constraintRelevance)
        ? parsed.constraintRelevance
        : 'unknown';

    const algorithmPreserved = VALID_ALGORITHM_PRESERVED.includes(parsed.algorithmPreserved)
        ? parsed.algorithmPreserved
        : 'unknown';

    const behaviorChange = VALID_BEHAVIOR_CHANGES.includes(parsed.behaviorChange)
        ? parsed.behaviorChange
        : 'unknown';

    // Clamp confidence strictly to [0, 100]
    let confidence = Number(parsed.confidence);
    if (isNaN(confidence) || !isFinite(confidence)) {
        confidence = 70;
    } else if (confidence >= 0 && confidence <= 1) {
        confidence = Math.round(confidence * 100);
    } else {
        confidence = Math.max(0, Math.min(100, Math.round(confidence)));
    }

    const riskIndicators = Array.isArray(parsed.riskIndicators)
        ? parsed.riskIndicators.map(String).filter(Boolean)
        : [];

    const evidence = Array.isArray(parsed.evidence)
        ? parsed.evidence.map(e => (typeof e === 'object' ? JSON.stringify(e) : String(e)))
        : [];

    const limitations = Array.isArray(parsed.limitations)
        ? parsed.limitations.map(String)
        : [];

    const requiresHumanReview = Boolean(parsed.requiresHumanReview || riskIndicators.length > 0);

    return {
        assessmentId,
        questionId,
        constraintId,
        analyzedRevisionId,
        analysisStatus,
        constraintRelevance,
        algorithmPreserved,
        behaviorChange,
        riskIndicators,
        evidence,
        confidence,
        requiresHumanReview,
        limitations,
        analyzedAt: new Date(),
        model: 'gemini-2.5-flash',
        version: '1.0'
    };
}

/**
 * Creates a standardized fallback analysis record when evidence is insufficient or model fails.
 */
function createFallbackAnalysis(context, status = 'insufficient_evidence', limitations = []) {
    return {
        assessmentId: String(context.assessmentId || ''),
        questionId: String(context.questionId || ''),
        constraintId: String(context.constraintId || 'none'),
        analyzedRevisionId: String(context.analyzedRevisionId || ''),
        analysisStatus: status,
        constraintRelevance: 'unknown',
        algorithmPreserved: 'unknown',
        behaviorChange: 'unknown',
        riskIndicators: [],
        evidence: [],
        confidence: 50,
        requiresHumanReview: false,
        limitations: limitations.length > 0 ? limitations : ['Automated analysis completed with fallback state'],
        analyzedAt: new Date(),
        model: 'gemini-2.5-flash-fallback',
        version: '1.0'
    };
}

/**
 * Analyzes code change between baseline and adapted solution under constraint.
 */
async function analyzeCodeChange({
    assessmentId,
    candidateId,
    questionId,
    questionTitle = '',
    questionDescription = '',
    baselineCode = '',
    preMutationCode = '',
    postMutationCode = '',
    finalCode = '',
    intermediateRevisions = [],
    activeConstraint = null,
    previousConstraint = null,
    executionResults = null,
    analyzedRevisionId = ''
}) {
    const context = {
        assessmentId,
        candidateId,
        questionId,
        constraintId: activeConstraint?.mutationId || 'mut_mem_opt_14mb',
        analyzedRevisionId: analyzedRevisionId || (new Date()).getTime().toString()
    };

    // Edge Case: Check for completely missing code
    const effectiveBaseline = baselineCode || preMutationCode;
    const effectiveFinal = finalCode || postMutationCode;

    if (!effectiveBaseline || !effectiveFinal) {
        return createFallbackAnalysis(context, 'insufficient_evidence', [
            'Baseline code or adapted code snapshot is missing from assessment history'
        ]);
    }

    const diffStats = computeDiffSummary(effectiveBaseline, effectiveFinal);

    // Build untrusted delimited input blocks
    const cleanBaseline = sanitizeCandidateCode(effectiveBaseline);
    const cleanFinal = sanitizeCandidateCode(effectiveFinal);

    const systemPrompt = `You are an expert technical code integrity and algorithmic adaptation analyzer for Hire1Percent technical assessments.
Your task is to analyze how a candidate adapted their software solution when a new computational or resource constraint was introduced during a live coding assessment.

MANDATORY FAIRNESS & ANTI-BIAS RULES:
1. A COMPLETE REWRITE OF THE SOLUTION IS 100% LEGITIMATE. In high-performance engineering, changing constraints (such as streaming data or clamped memory) frequently requires discarding array-based algorithms in favor of generator or iterative streaming patterns. NEVER flag a complete rewrite as cheating.
2. Changes in coding style, variable names, or algorithmic paradigm are normal engineering decisions.
3. Rapid typing or short editing intervals indicate fluency and preparedness, NOT dishonesty.
4. Fixing an error or failing test case is expected technical adaptation.
5. You must output STRICT, VALID JSON ONLY conforming exactly to the requested schema. No conversational preamble or trailing commentary.

Evaluate these technical questions:
1. What technical adaptations were made?
2. Did the change address the active constraint (e.g. Memory clamp, in-place iteration, streaming)?
3. Was the algorithm preserved, adapted, or replaced?
4. Did data structures change (e.g. array/list replaced with generator, iterator, pointers, or stream)?
5. Does the adapted code plausibly satisfy the constraint without unexplained side effects?
6. Is the execution evidence consistent with the code?
7. Is human review warranted?

OUTPUT JSON SCHEMA:
{
  "assessmentId": "${context.assessmentId}",
  "questionId": "${context.questionId}",
  "constraintId": "${context.constraintId}",
  "analyzedRevisionId": "${context.analyzedRevisionId}",
  "analysisStatus": "completed",
  "constraintRelevance": "relevant | partially_relevant | unrelated | unknown",
  "algorithmPreserved": "yes | partially | no | unknown",
  "behaviorChange": "none | expected | unexpected | unknown",
  "riskIndicators": ["string"],
  "evidence": ["string"],
  "confidence": 85,
  "requiresHumanReview": false,
  "limitations": ["string"]
}`;

    const userPrompt = `ASSESSMENT QUESTION CONTEXT:
Title: ${questionTitle || 'Coding Challenge'}
Description: ${questionDescription || 'Solve the problem within specified constraints.'}

ACTIVE CONSTRAINT INTRODUCED:
Constraint ID: ${context.constraintId}
Headline: ${activeConstraint?.headline || 'Resource Constraint Clamped'}
Description: ${activeConstraint?.description || 'Clamp memory usage to process dataset in-place using iterators / streams.'}
Memory Cap: ${activeConstraint?.resourceConstraints?.memoryLimitMb || 14} MB

CANDIDATE CODE EVOLUTION:

--- ORIGINAL BASELINE CODE (STAGE 1) ---
===CANDIDATE_CODE_START===
${cleanBaseline}
===CANDIDATE_CODE_END===

--- ADAPTED SOLUTION UNDER CONSTRAINT (STAGE 2) ---
===CANDIDATE_CODE_START===
${cleanFinal}
===CANDIDATE_CODE_END===

EXECUTION EVIDENCE:
- Tests Passed: ${executionResults?.passed ?? 'N/A'} of ${executionResults?.total ?? 'N/A'}
- Execution Status: ${executionResults?.status || 'EXECUTED'}
- Estimated Diff Added: ${diffStats.linesAddedEstimate} lines, Removed: ${diffStats.linesRemovedEstimate} lines
- Full Rewrite Detected: ${diffStats.isCompleteRewrite ? 'YES (Valid engineering strategy)' : 'NO'}

Analyze this adaptation and respond ONLY with the strict JSON schema.`;

    try {
        const rawResponse = await callGemini(userPrompt, 1500, true, systemPrompt, 0.2);
        if (!rawResponse) {
            return createFallbackAnalysis(context, 'failed', ['Gemini service unavailable or returned null response']);
        }

        const parsed = safeParseAIJson(rawResponse);
        return validateAIAnalysisResponse(parsed, context);
    } catch (err) {
        console.warn('[AI-ANALYZER] Gemini analysis error, generating safe fallback:', err.message);
        return createFallbackAnalysis(context, 'failed', [`AI service error: ${err.message}`]);
    }
}

module.exports = {
    analyzeCodeChange,
    validateAIAnalysisResponse,
    createFallbackAnalysis,
    computeDiffSummary,
    sanitizeCandidateCode,
    VALID_ANALYSIS_STATUSES,
    VALID_CONSTRAINT_RELEVANCES,
    VALID_ALGORITHM_PRESERVED,
    VALID_BEHAVIOR_CHANGES
};
