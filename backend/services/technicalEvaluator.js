/**
 * ─── Technical Evaluator Service ─────────────────────────────────────────────
 *
 * Provides multi-dimensional evaluation for the live technical problem-solving round:
 *  1. Approach & Reasoning Quality
 *  2. Code Correctness & Sandbox Test Case Pass Rate
 *  3. Time & Space Complexity Analysis
 *  4. Communication & Responsiveness to AI Follow-ups
 *
 * Scoring strictly separates plausible talk from verified code execution:
 *  - Plausible approach does NOT grant automatic 100% correctness.
 *  - Single failed test does NOT wipe out a brilliant approach or explanation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { callInterviewAI, safeParseAIJson } = require('../utils/aiClients');

/**
 * Evaluates candidate's initial approach explanation (verbal or text).
 */
async function evaluateApproachExplanation({ problem, approachText }) {
    const cleanApproach = String(approachText || '').trim();
    if (!cleanApproach || cleanApproach.length < 10) {
        return {
            score: 0,
            feedback: "No substantive approach explanation provided.",
            aiReaction: "I see you're ready to start. Feel free to begin writing your solution in the code editor below.",
            isAcceptable: false
        };
    }

    const prompt = `
You are a senior technical interviewer on a live Google Meet technical interview.
The candidate just explained their approach for this problem:

=== PROBLEM ===
Title: ${problem.title}
Statement: ${problem.statement}
Expected Approach: ${problem.rubric?.expectedApproach || 'Optimal algorithmic solution'}

=== CANDIDATE APPROACH EXPLANATION ===
"${cleanApproach}"

=== TASK ===
1. Evaluate whether the approach is sound, partially correct, or flawed.
2. Provide a conversational, encouraging AI reaction (1-2 sentences, under 30 words) to speak back to the candidate and invite them to code.
3. Return JSON:
{
  "score": <number 0-100>,
  "aiReaction": "<Concise conversational speech acknowledging approach and inviting implementation>",
  "strengths": "<one sentence>",
  "weaknesses": "<one sentence or none>",
  "isAcceptable": <true | false>
}
`;

    try {
        const rawJson = await callInterviewAI(prompt, 600, true, "You are a constructive, encouraging senior interviewer.", 0.5);
        if (rawJson) {
            const parsed = safeParseAIJson(rawJson);
            if (parsed && typeof parsed.score === 'number') {
                return {
                    score: Math.min(100, Math.max(0, parsed.score)),
                    feedback: `${parsed.strengths || ''} ${parsed.weaknesses || ''}`.trim(),
                    aiReaction: parsed.aiReaction || "That sounds like a solid direction. Let's go ahead and implement it in the code editor.",
                    isAcceptable: parsed.isAcceptable !== false
                };
            }
        }
    } catch (err) {
        console.warn(`[TECH-EVAL] Approach evaluation fallback: ${err.message}`);
    }

    return {
        score: cleanApproach.length > 50 ? 75 : 55,
        feedback: "Approach received and acknowledged.",
        aiReaction: "Great, that gives a clear plan of action. Go ahead and write out the code in the workspace below.",
        isAcceptable: true
    };
}

/**
 * Generates an AI follow-up question based on candidate's code and problem.
 */
async function generateTechnicalFollowUp({ problem, submittedCode, language, testResults }) {
    const passed = testResults?.passed || 0;
    const total = testResults?.total || 1;
    const isAllPassed = passed === total;

    const prompt = `
You are a senior interviewer in a live technical interview.
The candidate just completed the code implementation for the problem below:

=== PROBLEM ===
Title: ${problem.title}
Statement: ${problem.statement}
Curated Follow-Ups: ${(problem.followUpPrompts || []).join(' | ')}

=== CANDIDATE CODE (${language}) ===
${String(submittedCode).slice(0, 1500)}

=== TEST RESULTS ===
Passed: ${passed}/${total} test cases (${isAllPassed ? 'All passed' : 'Some tests failed'})

=== TASK ===
Generate ONE insightful, contextual technical follow-up question tailored to their specific code and implementation:
- If all tests passed: ask about Big-O time/space complexity, production edge cases, scaling to 10M records, or memory trade-offs.
- If tests failed: ask how they would debug the failing edge case or handle boundary conditions.
- Keep the question concise, single complete sentence ending in a question mark (?). Under 35 words.

=== OUTPUT FORMAT (JSON ONLY) ===
{
  "followUpQuestion": "<Your follow-up question>"
}
`;

    try {
        const rawJson = await callInterviewAI(prompt, 400, true, "You are a concise, sharp technical interviewer.", 0.6);
        if (rawJson) {
            const parsed = safeParseAIJson(rawJson);
            if (parsed?.followUpQuestion) {
                return parsed.followUpQuestion.trim();
            }
        }
    } catch (err) {
        console.warn(`[TECH-EVAL] Follow-up question fallback: ${err.message}`);
    }

    // Default to problem's curated follow-ups
    if (problem.followUpPrompts && problem.followUpPrompts.length > 0) {
        return problem.followUpPrompts[0];
    }
    return "What is the time and space complexity of your solution, and how would it scale with large inputs?";
}

/**
 * Comprehensive multi-dimensional evaluation of the entire technical round.
 */
async function evaluateCompleteTechnicalRound({
    problem,
    approachExplanation = '',
    submittedCode = '',
    language = 'python',
    testResults = null,
    followUpQuestion = '',
    followUpAnswer = ''
}) {
    // 1. Calculate deterministic correctness score from test cases
    let correctnessScore = 0;
    const totalTests = testResults?.total || 0;
    const passedTests = testResults?.passed || 0;

    if (totalTests > 0) {
        correctnessScore = Math.round((passedTests / totalTests) * 100);
    } else if (submittedCode && submittedCode.trim().length > 30) {
        correctnessScore = 50; // Code provided without automated tests
    }

    // 2. AI Multi-dimensional scoring prompt
    const prompt = `
You are an expert technical hiring bar-raiser evaluating a candidate's complete live technical round.

=== PROBLEM ===
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Statement: ${problem.statement}
Expected Approach: ${problem.rubric?.expectedApproach}
Expected Complexity: Time ${problem.rubric?.timeComplexity}, Space ${problem.rubric?.spaceComplexity}

=== CANDIDATE SUBMISSION ===
1. Approach Explanation: "${String(approachExplanation).slice(0, 800) || 'None'}"
2. Code Solution (${language}):
${String(submittedCode).slice(0, 1500) || 'None'}
3. Test Cases Execution: ${passedTests}/${totalTests} passed (Calculated correctness: ${correctnessScore}%)
4. Follow-up Question: "${followUpQuestion || 'None'}"
5. Follow-up Response: "${String(followUpAnswer).slice(0, 800) || 'None'}"

=== EVALUATION CRITERIA ===
Score each dimension independently (0 to 100):
- approachScore: Problem decomposition, algorithmic strategy, reasoning clarity before coding.
- correctnessScore: Keep aligned with test results (~${correctnessScore}), adjusting slightly for syntax or edge case awareness.
- complexityScore: Analysis of time/space complexity and optimization considerations.
- communicationScore: Verbal/written clarity, articulate explanation of trade-offs, responsiveness to follow-up.

=== OUTPUT FORMAT (JSON ONLY) ===
{
  "approachScore": <number 0-100>,
  "correctnessScore": <number 0-100>,
  "complexityScore": <number 0-100>,
  "communicationScore": <number 0-100>,
  "strengths": "<concise sentence highlighting top strength>",
  "areasForImprovement": "<concise sentence for improvement>",
  "summary": "<one sentence overall assessment>",
  "verdict": "Exemplary" | "Strong" | "Proficient" | "Needs Improvement" | "Incomplete"
}
`;

    let evaluation = null;
    try {
        const rawJson = await callInterviewAI(prompt, 1000, true, "You are a fair, objective technical hiring committee member.", 0.4);
        if (rawJson) {
            const parsed = safeParseAIJson(rawJson);
            if (parsed && typeof parsed.approachScore === 'number') {
                evaluation = parsed;
            }
        }
    } catch (err) {
        console.warn(`[TECH-EVAL] Complete round AI evaluation fallback: ${err.message}`);
    }

    // Fallback scoring if AI fails
    if (!evaluation) {
        const hasApproach = Boolean(approachExplanation && approachExplanation.trim().length > 15);
        const hasFollowUp = Boolean(followUpAnswer && followUpAnswer.trim().length > 15);

        evaluation = {
            approachScore: hasApproach ? 75 : 30,
            correctnessScore: correctnessScore,
            complexityScore: hasFollowUp ? 70 : 40,
            communicationScore: (hasApproach && hasFollowUp) ? 80 : 50,
            strengths: "Structured reasoning applied to the problem statement.",
            areasForImprovement: "Further edge case optimization and complexity validation.",
            summary: `Candidate solved ${passedTests}/${totalTests} test cases with a working implementation.`,
            verdict: correctnessScore >= 80 ? "Strong" : correctnessScore >= 50 ? "Proficient" : "Needs Improvement"
        };
    }

    // Compute composite weighted totalScore (0 - 100)
    // Weights: 30% Approach + 40% Correctness + 15% Complexity + 15% Communication
    const weightedScore = Math.round(
        (evaluation.approachScore * 0.30) +
        (evaluation.correctnessScore * 0.40) +
        (evaluation.complexityScore * 0.15) +
        (evaluation.communicationScore * 0.15)
    );

    return {
        totalScore: Math.min(100, Math.max(0, weightedScore)),
        approachScore: evaluation.approachScore,
        correctnessScore: evaluation.correctnessScore,
        complexityScore: evaluation.complexityScore,
        communicationScore: evaluation.communicationScore,
        strengths: evaluation.strengths || '',
        areasForImprovement: evaluation.areasForImprovement || '',
        summary: evaluation.summary || 'Technical challenge completed.',
        verdict: evaluation.verdict || (weightedScore >= 75 ? 'Strong' : 'Proficient'),
        testCasesPassed: passedTests,
        totalTestCases: totalTests,
        evaluatedAt: new Date()
    };
}

module.exports = {
    evaluateApproachExplanation,
    generateTechnicalFollowUp,
    evaluateCompleteTechnicalRound
};
