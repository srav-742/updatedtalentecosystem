/**
 * ─── Technical Interview Endpoints Integration Test ─────────────────────────
 * Tests the full API lifecycle against MongoDB:
 * Init -> Explain Approach -> Run Code -> Submit Solution -> Follow-Up -> Complete & Resume.
 * Run with: node tests/technicalInterviewEndpoints.test.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const InterviewSession = require('../models/InterviewSession');
const Application = require('../models/Application');
const Job = require('../models/Job');
const technicalController = require('../controllers/technicalInterviewController');

function mockReqRes(body = {}, params = {}) {
    let statusCode = 200;
    let responseData = null;

    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        json: (data) => {
            responseData = data;
            return res;
        }
    };

    const req = {
        body,
        params,
        headers: {}
    };

    return {
        req,
        res,
        getStatus: () => statusCode,
        getData: () => responseData
    };
}

async function runEndpointTests() {
    console.log('====================================================');
    console.log('🧪 RUNNING TECHNICAL ENDPOINTS INTEGRATION TEST');
    console.log('====================================================\n');

    await connectDB();

    const testSessionId = `test_session_${Date.now()}`;
    const testUserId = `test_user_${Date.now()}`;
    const testJobId = new mongoose.Types.ObjectId();

    // 1. Create a dummy session and application in DB
    const session = await InterviewSession.create({
        sessionId: testSessionId,
        userId: testUserId,
        jobId: String(testJobId),
        jobTitle: 'Senior Python Engineer',
        jobDescription: 'Build high performance APIs and data pipelines with Python',
        jobSkills: ['Python', 'Data Structures', 'FastAPI', 'Algorithms'],
        experienceLevel: 'Senior',
        totalQuestions: 5,
        history: [
            { role: 'interviewer', content: 'Tell me about yourself.' },
            { role: 'candidate', content: 'I am a backend engineer.' },
            { role: 'interviewer', content: 'Explain REST principles.' },
            { role: 'candidate', content: 'REST uses standard HTTP methods.' }
        ],
        technicalStage: 'NONE'
    });

    const application = await Application.create({
        jobId: testJobId,
        userId: testUserId,
        applicantName: 'Test Candidate',
        applicantEmail: 'candidate@example.com',
        interviewAnswers: []
    });

    console.log(`Created test session: ${testSessionId}`);

    try {
        // STEP 1: Init Technical Problem
        console.log('\n--- Step 1: POST /api/interview/technical/init ---');
        const initMock = mockReqRes({ sessionId: testSessionId });
        await technicalController.initTechnicalProblem(initMock.req, initMock.res);
        assert.strictEqual(initMock.getStatus(), 200);
        const initData = initMock.getData();
        assert.ok(initData.success, 'init should succeed');
        assert.ok(initData.problem, 'problem must be returned');
        assert.strictEqual(initData.technicalStage, 'PROBLEM_PRESENTED');
        console.log(`✅ Init success: Problem "${initData.problem.title}"`);

        // STEP 2: Get State
        console.log('\n--- Step 2: GET /api/interview/technical/state/:sessionId ---');
        const stateMock = mockReqRes({}, { sessionId: testSessionId });
        await technicalController.getTechnicalState(stateMock.req, stateMock.res);
        assert.strictEqual(stateMock.getStatus(), 200);
        const stateData = stateMock.getData();
        assert.strictEqual(stateData.technicalStage, 'PROBLEM_PRESENTED');
        assert.strictEqual(stateData.problem.title, initData.problem.title);
        console.log('✅ State retrieved successfully');

        // STEP 3: Explain Approach
        console.log('\n--- Step 3: POST /api/interview/technical/explain-approach ---');
        const approachText = 'I will use a two-pointer technique or hash map to locate complements in O(N) time with O(N) space.';
        const approachMock = mockReqRes({ sessionId: testSessionId, approachText });
        await technicalController.explainApproach(approachMock.req, approachMock.res);
        assert.strictEqual(approachMock.getStatus(), 200);
        const approachData = approachMock.getData();
        assert.ok(approachData.success);
        assert.strictEqual(approachData.nextStage, 'CODING_IN_PROGRESS');
        assert.ok(approachData.aiReaction, 'Must return AI reaction speech');
        console.log(`✅ Approach explained. AI Reaction: "${approachData.aiReaction}"`);

        // STEP 4: Run Code (visible test cases)
        console.log('\n--- Step 4: POST /api/interview/technical/run-code ---');
        const testCode = initData.problem.starterCode?.python || 'def solution(): pass';
        const runMock = mockReqRes({ sessionId: testSessionId, code: testCode, language: 'python' });
        await technicalController.runCode(runMock.req, runMock.res);
        assert.strictEqual(runMock.getStatus(), 200);
        const runData = runMock.getData();
        assert.ok(runData.success);
        assert.ok(runData.results, 'Run results must exist');
        console.log(`✅ Run code completed: ${runData.results.passed}/${runData.results.total} passed`);

        // STEP 5: Submit Final Solution
        console.log('\n--- Step 5: POST /api/interview/technical/submit-solution ---');
        const submitMock = mockReqRes({ sessionId: testSessionId, code: testCode, language: 'python' });
        await technicalController.submitSolution(submitMock.req, submitMock.res);
        assert.strictEqual(submitMock.getStatus(), 200);
        const submitData = submitMock.getData();
        assert.ok(submitData.success);
        assert.strictEqual(submitData.nextStage, 'AI_FOLLOW_UP');
        assert.ok(submitData.followUpQuestion, 'Must return follow-up question');
        console.log(`✅ Solution submitted. Follow-up: "${submitData.followUpQuestion}"`);

        // STEP 6: Answer Follow-up
        console.log('\n--- Step 6: POST /api/interview/technical/answer-follow-up ---');
        const followUpAnswer = 'The time complexity is O(N) and space complexity is O(N) for storing visited elements in a dictionary.';
        const followUpMock = mockReqRes({ sessionId: testSessionId, followUpAnswer });
        await technicalController.answerFollowUp(followUpMock.req, followUpMock.res);
        assert.strictEqual(followUpMock.getStatus(), 200);
        const followUpData = followUpMock.getData();
        assert.ok(followUpData.success);
        assert.strictEqual(followUpData.nextStage, 'TECHNICAL_EVALUATION');
        console.log('✅ Follow-up answered');

        // STEP 7: Complete and Resume
        console.log('\n--- Step 7: POST /api/interview/technical/complete-and-resume ---');
        const completeMock = mockReqRes({ sessionId: testSessionId });
        await technicalController.completeAndResume(completeMock.req, completeMock.res);
        assert.strictEqual(completeMock.getStatus(), 200);
        const completeData = completeMock.getData();
        assert.ok(completeData.success);
        assert.ok(completeData.isResumed);
        assert.ok(completeData.evaluation, 'Evaluation must be returned');
        assert.ok(completeData.evaluation.totalScore >= 0, 'Total score must be valid number');
        console.log(`✅ Technical round completed! Total Score: ${completeData.evaluation.totalScore}/100`);

        // Verify Application was updated in MongoDB
        const updatedApp = await Application.findById(application._id);
        assert.ok(updatedApp.technicalEvaluation, 'Application must have technicalEvaluation');
        assert.strictEqual(updatedApp.technicalEvaluation.evaluation.totalScore, completeData.evaluation.totalScore);
        const techEntry = updatedApp.interviewAnswers.find(a => a.source === 'TECHNICAL_ROUND');
        assert.ok(techEntry, 'Application.interviewAnswers must have TECHNICAL_ROUND entry');
        console.log(`✅ Application backward-compatible persistence verified: interviewAnswers entry found with marks: ${techEntry.marks}/10`);

    } finally {
        // Cleanup test docs
        await InterviewSession.deleteOne({ sessionId: testSessionId });
        await Application.deleteOne({ _id: application._id });
        console.log('\nCleaned up test DB records.');
        await mongoose.disconnect();
    }

    console.log('\n====================================================');
    console.log('🎉 ALL TECHNICAL ENDPOINT INTEGRATION TESTS PASSED!');
    console.log('====================================================\n');
}

runEndpointTests().catch(err => {
    console.error('Fatal endpoint test error:', err);
    process.exit(1);
});
