/**
 * ─── Technical Interview Controller ──────────────────────────────────────────
 *
 * Coordinates live technical problem-solving sessions inside AI interviews.
 *
 * Responsibilities:
 *  - State retrieval and session synchronization
 *  - Dynamic problem generation & caching
 *  - Approach explanation evaluation (voice or chat)
 *  - Isolated sandboxed code execution (Wandbox / container runner)
 *  - Final solution submission and test validation
 *  - Contextual AI follow-up questioning
 *  - Multi-dimensional technical scoring and seamless interview resumption
 * ─────────────────────────────────────────────────────────────────────────────
 */

const InterviewSession = require('../models/InterviewSession');
const Application = require('../models/Application');
const { generateTechnicalProblem } = require('../services/technicalProblemGenerator');
const { executeAgainstTestCases } = require('../services/codeExecutionService');
const {
    evaluateApproachExplanation,
    generateTechnicalFollowUp,
    evaluateCompleteTechnicalRound
} = require('../services/technicalEvaluator');

/**
 * Helper to fetch session with validation.
 */
async function getSessionOrThrow(sessionId) {
    if (!sessionId) {
        const err = new Error('sessionId is required');
        err.statusCode = 400;
        throw err;
    }
    const session = await InterviewSession.findOne({ sessionId });
    if (!session) {
        const err = new Error(`Interview session not found for sessionId: ${sessionId}`);
        err.statusCode = 404;
        throw err;
    }
    return session;
}

function cleanProblemStarterCode(problem) {
    if (!problem || !problem.starterCode) return problem;
    const cleaned = JSON.parse(JSON.stringify(problem));
    if (cleaned.starterCode.python && (cleaned.starterCode.python.includes('lookup =') || (cleaned.starterCode.python.includes('def two_sum') && cleaned.starterCode.python.includes('complement =')))) {
        cleaned.starterCode.python = `import json, sys

def two_sum(nums, target):
    # TODO: Write your algorithm here
    # Return [index1, index2] such that nums[index1] + nums[index2] == target
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().splitlines()
    if raw:
        nums = json.loads(raw[0].strip())
        target = int(raw[1].strip())
        res = two_sum(nums, target)
        print(json.dumps(res if res is not None else []))
`;
    }
    if (cleaned.starterCode.javascript && (cleaned.starterCode.javascript.includes('const map = new Map()') || (cleaned.starterCode.javascript.includes('twoSum') && cleaned.starterCode.javascript.includes('comp = target')))) {
        cleaned.starterCode.javascript = `const fs = require('fs');

function twoSum(nums, target) {
    // TODO: Write your algorithm here
    // Return [index1, index2]
    return [];
}

const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
    const nums = JSON.parse(lines[0].trim());
    const target = parseInt(lines[1].trim(), 10);
    console.log(JSON.stringify(twoSum(nums, target) || []));
}
`;
    }
    if (cleaned.starterCode.python && cleaned.starterCode.python.includes('filtered == filtered[::-1]')) {
        cleaned.starterCode.python = `import sys

def is_palindrome(s):
    # TODO: Write your algorithm here
    # Return True if s is a palindrome, False otherwise
    pass

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    result = is_palindrome(raw)
    print("true" if result else "false")
`;
    }
    if (cleaned.starterCode.javascript && cleaned.starterCode.javascript.includes('clean.split')) {
        cleaned.starterCode.javascript = `const fs = require('fs');

function isPalindrome(s) {
    // TODO: Write your algorithm here
    return false;
}

const input = fs.readFileSync(0, 'utf-8').trim();
console.log(isPalindrome(input) ? "true" : "false");
`;
    }
    if (cleaned.starterCode.python && cleaned.starterCode.python.includes('seen = set()')) {
        cleaned.starterCode.python = `import json, sys

def remove_duplicates(nums):
    # BUGGY CODE TO FIX:
    # Candidate: modify this function so it returns unique elements preserving first-seen order.
    unique = []
    for i in range(len(nums)):
        if i == len(nums) - 1 or nums[i] != nums[i + 1]:
            unique.append(nums[i])
    return unique

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    if raw:
        arr = json.loads(raw)
        print(json.dumps(remove_duplicates(arr)))
`;
    }
    if (cleaned.starterCode.javascript && cleaned.starterCode.javascript.includes('new Set()')) {
        cleaned.starterCode.javascript = `const fs = require('fs');

function removeDuplicates(nums) {
    // BUGGY CODE TO FIX:
    // Candidate: modify this function so it returns unique elements preserving first-seen order.
    const unique = [];
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== nums[i + 1]) {
            unique.push(nums[i]);
        }
    }
    return unique;
}

const line = fs.readFileSync(0, 'utf-8').trim();
if (line) {
    const arr = JSON.parse(line);
    console.log(JSON.stringify(removeDuplicates(arr)));
}
`;
    }
    return cleaned;
}

/**
 * GET /api/interview/technical/state/:sessionId
 * Returns the current technical state of the interview session.
 */
exports.getTechnicalState = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await getSessionOrThrow(sessionId);
        const problem = cleanProblemStarterCode(session.technicalProblem || null);

        return res.json({
            success: true,
            sessionId: session.sessionId,
            technicalStage: session.technicalStage || 'NONE',
            problem,
            attempts: session.technicalAttempts || [],
            followUps: session.technicalFollowUps || [],
            evaluation: session.technicalEvaluation || null
        });
    } catch (err) {
        console.error('[TECH-CONTROLLER] getTechnicalState error:', err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/interview/technical/init
 * Initializes or retrieves the live technical challenge for this interview session.
 */
exports.initTechnicalProblem = async (req, res) => {
    try {
        const { sessionId, preferredCategory } = req.body;
        const session = await getSessionOrThrow(sessionId);

        // If problem already exists in session, return it
        if (session.technicalProblem && session.technicalProblem.title) {
            console.log(`[TECH-CONTROLLER] Reusing existing technical problem for session ${sessionId}: "${session.technicalProblem.title}"`);
            const cleaned = cleanProblemStarterCode(session.technicalProblem);
            session.technicalProblem = cleaned;
            session.markModified('technicalProblem');
            await session.save();

            return res.json({
                success: true,
                problem: cleaned,
                technicalStage: session.technicalStage || 'PROBLEM_PRESENTED',
                isExisting: true
            });
        }

        // Generate tailored problem
        const problem = await generateTechnicalProblem({
            jobTitle: session.jobTitle,
            jobDescription: session.jobDescription,
            jobSkills: session.jobSkills,
            experienceLevel: session.experienceLevel,
            preferredCategory
        });

        session.technicalProblem = problem;
        session.technicalStage = 'PROBLEM_PRESENTED';
        await session.save();

        console.log(`[TECH-CONTROLLER] Initialized technical problem: "${problem.title}" for session: ${sessionId}`);

        return res.json({
            success: true,
            problem,
            technicalStage: 'PROBLEM_PRESENTED',
            isExisting: false
        });
    } catch (err) {
        console.error('[TECH-CONTROLLER] initTechnicalProblem error:', err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/interview/technical/explain-approach
 * Candidate submits verbal or written explanation of their approach before coding.
 */
exports.explainApproach = async (req, res) => {
    try {
        const { sessionId, approachText } = req.body;
        const session = await getSessionOrThrow(sessionId);

        if (!session.technicalProblem) {
            return res.status(400).json({ success: false, message: 'No technical problem initialized for this session' });
        }

        const evaluation = await evaluateApproachExplanation({
            problem: session.technicalProblem,
            approachText
        });

        // Store candidate approach
        if (!session.technicalAttempts) session.technicalAttempts = [];
        session.technicalAttempts.push({
            type: 'APPROACH',
            content: approachText,
            timestamp: new Date(),
            evaluation
        });

        session.technicalStage = 'CODING_IN_PROGRESS';
        await session.save();

        return res.json({
            success: true,
            evaluation,
            aiReaction: evaluation.aiReaction,
            nextStage: 'CODING_IN_PROGRESS'
        });
    } catch (err) {
        console.error('[TECH-CONTROLLER] explainApproach error:', err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/interview/technical/run-code
 * Runs candidate code against visible sample test cases in the isolated sandbox.
 */
exports.runCode = async (req, res) => {
    try {
        const { sessionId, code, language = 'python' } = req.body;
        const session = await getSessionOrThrow(sessionId);

        if (!session.technicalProblem) {
            return res.status(400).json({ success: false, message: 'No technical problem initialized for this session' });
        }

        const allTestCases = session.technicalProblem.testCases || [];
        // When running tests iteratively, run visible tests (and at least 1 test)
        const visibleTests = allTestCases.filter(tc => !tc.isHidden);
        const testsToRun = visibleTests.length > 0 ? visibleTests : allTestCases.slice(0, 2);

        console.log(`[TECH-CONTROLLER] Running candidate code (${language}) against ${testsToRun.length} visible test cases...`);

        const execResult = await executeAgainstTestCases({
            code,
            language,
            testCases: testsToRun,
            maskHiddenDetails: false
        });

        return res.json({
            success: true,
            results: execResult
        });
    } catch (err) {
        console.error('[TECH-CONTROLLER] runCode error:', err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/interview/technical/submit-solution
 * Submits the final code solution, evaluates against all test cases, and asks an AI follow-up.
 */
exports.submitSolution = async (req, res) => {
    try {
        const { sessionId, code, language = 'python' } = req.body;
        const session = await getSessionOrThrow(sessionId);

        if (!session.technicalProblem) {
            return res.status(400).json({ success: false, message: 'No technical problem initialized for this session' });
        }

        const allTestCases = session.technicalProblem.testCases || [];

        console.log(`[TECH-CONTROLLER] Submitting final solution (${language}) against ${allTestCases.length} total test cases...`);

        // Execute against all test cases (masking hidden test inputs/outputs for security)
        const execResult = await executeAgainstTestCases({
            code,
            language,
            testCases: allTestCases,
            maskHiddenDetails: true
        });

        // Generate contextual follow-up question
        const followUpQuestion = await generateTechnicalFollowUp({
            problem: session.technicalProblem,
            submittedCode: code,
            language,
            testResults: execResult
        });

        if (!session.technicalAttempts) session.technicalAttempts = [];
        session.technicalAttempts.push({
            type: 'CODE_SUBMISSION',
            code,
            language,
            timestamp: new Date(),
            testResults: execResult
        });

        if (!session.technicalFollowUps) session.technicalFollowUps = [];
        session.technicalFollowUps.push({
            question: followUpQuestion,
            askedAt: new Date()
        });

        session.technicalStage = 'AI_FOLLOW_UP';
        await session.save();

        return res.json({
            success: true,
            testResults: execResult,
            followUpQuestion,
            nextStage: 'AI_FOLLOW_UP'
        });
    } catch (err) {
        console.error('[TECH-CONTROLLER] submitSolution error:', err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/interview/technical/answer-follow-up
 * Candidate answers the technical follow-up question (verbal or text).
 */
exports.answerFollowUp = async (req, res) => {
    try {
        const { sessionId, followUpAnswer } = req.body;
        const session = await getSessionOrThrow(sessionId);

        if (!session.technicalFollowUps || session.technicalFollowUps.length === 0) {
            return res.status(400).json({ success: false, message: 'No active follow-up question found' });
        }

        const lastFollowUp = session.technicalFollowUps[session.technicalFollowUps.length - 1];
        lastFollowUp.answer = String(followUpAnswer || '').trim();
        lastFollowUp.answeredAt = new Date();

        session.technicalStage = 'TECHNICAL_EVALUATION';
        await session.save();

        return res.json({
            success: true,
            nextStage: 'TECHNICAL_EVALUATION'
        });
    } catch (err) {
        console.error('[TECH-CONTROLLER] answerFollowUp error:', err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

/**
 * POST /api/interview/technical/complete-and-resume
 * Finalizes evaluation of the technical challenge, persists scores, and prepares resumption.
 */
exports.completeAndResume = async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await getSessionOrThrow(sessionId);

        const problem = session.technicalProblem;
        if (!problem) {
            return res.status(400).json({ success: false, message: 'No technical problem to complete' });
        }

        // Extract latest approach, code submission, and follow-up
        const approachAttempt = (session.technicalAttempts || []).find(a => a.type === 'APPROACH');
        const codeAttempt = (session.technicalAttempts || []).slice().reverse().find(a => a.type === 'CODE_SUBMISSION');
        const followUp = (session.technicalFollowUps || []).slice().reverse()[0];

        const evaluation = await evaluateCompleteTechnicalRound({
            problem,
            approachExplanation: approachAttempt?.content || '',
            submittedCode: codeAttempt?.code || '',
            language: codeAttempt?.language || 'python',
            testResults: codeAttempt?.testResults || null,
            followUpQuestion: followUp?.question || '',
            followUpAnswer: followUp?.answer || ''
        });

        // Persist evaluation in session
        session.technicalEvaluation = evaluation;
        session.technicalStage = 'COMPLETED';
        await session.save();

        // Persist backward-compatibly in Application document
        const application = await Application.findOne({ userId: session.userId, jobId: session.jobId });
        if (application) {
            application.technicalEvaluation = {
                problemTitle: problem.title,
                difficulty: problem.difficulty,
                category: problem.category,
                statement: problem.statement,
                approachExplanation: approachAttempt?.content || '',
                submittedCode: codeAttempt?.code || '',
                language: codeAttempt?.language || 'python',
                testResults: codeAttempt?.testResults || null,
                followUpQuestion: followUp?.question || '',
                followUpAnswer: followUp?.answer || '',
                evaluation
            };

            // Also append an entry in interviewAnswers so existing transcript readers display it seamlessly
            if (!Array.isArray(application.interviewAnswers)) {
                application.interviewAnswers = [];
            }

            const existingTechIdx = application.interviewAnswers.findIndex(a => a.source === 'TECHNICAL_ROUND' || a.questionId === 'live_technical_round');
            const techEntry = {
                questionId: 'live_technical_round',
                question: `[Live Technical Round] ${problem.title}: ${problem.statement.slice(0, 140)}...`,
                answer: `[Approach]: ${approachAttempt?.content || 'N/A'}\n\n[Code (${codeAttempt?.language || 'python'})]:\n${codeAttempt?.code || 'N/A'}\n\n[Follow-up Answer]: ${followUp?.answer || 'N/A'}`,
                score: evaluation.totalScore,
                marks: Math.round(evaluation.totalScore / 10),
                feedback: `${evaluation.summary} (Approach: ${evaluation.approachScore}%, Correctness: ${evaluation.correctnessScore}%, Complexity: ${evaluation.complexityScore}%, Comm: ${evaluation.communicationScore}%)`,
                source: 'TECHNICAL_ROUND'
            };

            if (existingTechIdx >= 0) {
                application.interviewAnswers[existingTechIdx] = techEntry;
            } else {
                application.interviewAnswers.push(techEntry);
            }

            await application.save();
            console.log(`[TECH-CONTROLLER] Saved technical evaluation to Application for candidate: ${session.userId}, Score: ${evaluation.totalScore}`);
        }

        const resumeSpeech = "Excellent work on that technical problem! We've recorded your implementation and approach. Let's return to the rest of our interview questions.";

        return res.json({
            success: true,
            evaluation,
            resumeSpeech,
            technicalStage: 'COMPLETED',
            isResumed: true
        });
    } catch (err) {
        console.error('[TECH-CONTROLLER] completeAndResume error:', err.message);
        return res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
};

exports.cleanProblemStarterCode = cleanProblemStarterCode;
