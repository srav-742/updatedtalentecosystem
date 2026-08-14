import './setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { AssessmentController } from '../src/controllers/assessment.controller.js';
import { AttemptController } from '../src/controllers/attempt.controller.js';
import assessmentService from '../src/services/assessment.service.js';
import evaluationService from '../src/services/evaluation.service.js';

test('AssessmentController: create draft assessment successfully', async (t) => {
  t.mock.method(assessmentService, 'createAssessment', async (data, user) => {
    return {
      _id: 'assess_111',
      title: data.title,
      duration: data.duration,
      passPercent: data.passPercent || 60,
      organizationId: user.organizationId,
      status: 'DRAFT',
      createdBy: user.userId,
    };
  });

  const req = {
    body: {
      title: 'Senior Node Developer Assessment',
      duration: 60,
      passPercent: 70,
    },
    user: {
      userId: 'user_recruiter_1',
      role: 'recruiter',
      organizationId: 'org_123',
    },
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  const controller = new AssessmentController();
  await controller.create(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.statusCode, 201);
  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data._id, 'assess_111');
  assert.strictEqual(mockRes.body.data.status, 'DRAFT');
  assert.strictEqual(mockRes.body.data.organizationId, 'org_123');
});

test('AssessmentController: get retrieves assessment and handles role redaction', async (t) => {
  t.mock.method(assessmentService, 'getAssessment', async (id, user) => {
    // Return redacted structure if candidate
    if (user.role === 'candidate') {
      return {
        _id: id,
        title: 'NodeJS Test',
        questions: [
          {
            questionId: {
              _id: 'q_1',
              type: 'MCQ',
              mcqOptions: [{ id: '1', text: 'Option A' }, { id: '2', text: 'Option B' }],
            },
          },
        ],
      };
    }
    // Full recruiter structure
    return {
      _id: id,
      title: 'NodeJS Test',
      questions: [
        {
          questionId: {
            _id: 'q_1',
            type: 'MCQ',
            mcqOptions: [
              { id: '1', text: 'Option A', isCorrect: true },
              { id: '2', text: 'Option B', isCorrect: false },
            ],
          },
        },
      ],
    };
  });

  const reqRecruiter = {
    params: { id: 'assess_111' },
    user: { userId: 'user_recruiter_1', role: 'recruiter', organizationId: 'org_123' },
  };

  const reqCandidate = {
    params: { id: 'assess_111' },
    user: { userId: 'user_candidate_1', role: 'candidate' },
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  const controller = new AssessmentController();

  // Test Recruiter - Gets full data
  await controller.get(reqRecruiter, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });
  assert.strictEqual(mockRes.body.data.questions[0].questionId.mcqOptions[0].isCorrect, true);

  // Test Candidate - Gets redacted options (no isCorrect property)
  await controller.get(reqCandidate, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });
  assert.strictEqual(mockRes.body.data.questions[0].questionId.mcqOptions[0].isCorrect, undefined);
});

test('AttemptController: start assessment attempt successfully', async (t) => {
  t.mock.method(assessmentService, 'startAttempt', async (assessmentId, user) => {
    return {
      _id: 'attempt_abc',
      assessmentId,
      candidateId: user.userId,
      status: 'STARTED',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      answers: [],
    };
  });

  const req = {
    params: { id: 'assess_111' },
    user: { userId: 'user_candidate_1', role: 'candidate' },
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  const controller = new AttemptController();
  await controller.start(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data._id, 'attempt_abc');
  assert.strictEqual(mockRes.body.data.status, 'STARTED');
});

test('AttemptController: submit attempt successfully and auto-evaluate MCQ', async (t) => {
  t.mock.method(assessmentService, 'submitAttempt', async (assessmentId, data, user) => {
    return {
      attemptId: 'attempt_abc',
      status: 'EVALUATED',
      result: {
        totalScore: 10,
        maxScore: 10,
        percentage: 100,
        passed: true,
        status: 'PASSED',
      },
    };
  });

  const req = {
    params: { id: 'assess_111' },
    body: {
      answers: [{ questionId: 'q_1', mcqAnswerId: '1' }],
    },
    user: { userId: 'user_candidate_1', role: 'candidate' },
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  const controller = new AttemptController();
  await controller.submit(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data.status, 'EVALUATED');
  assert.strictEqual(mockRes.body.data.result.passed, true);
  assert.strictEqual(mockRes.body.data.result.percentage, 100);
});
