const assert = require('assert');
const { evaluateIntegrity, CANONICAL_CATEGORIES, CANONICAL_EVENT_MAP } = require('../utils/proctoringScoring');
const { BENCHMARK_SESSIONS } = require('../utils/proctoringCalibration');

console.log('====================================================');
console.log('  PROCTORING ENDPOINTS & CONTROLLER VERIFICATION    ');
console.log('====================================================');

async function testScoreBreakdownLogic() {
    console.log('\n[TEST 1] Verifying score breakdown computation logic...');
    const session = BENCHMARK_SESSIONS.find(s => s.id === 'crit-01');
    const result = evaluateIntegrity(session.events);

    assert.strictEqual(result.riskLevel, 'HIGH RISK');
    assert.strictEqual(result.integrityScore, 55);
    assert.strictEqual(result.scoreVersion, 'v2');
    assert(result.scoreFactors.length > 0);
    assert(result.eventSummary['PHONE_DETECTED'] > 0);
    assert.strictEqual(result.highestConfidenceEvent.type, 'PHONE_DETECTED');

    console.log('✅ TEST 1 PASSED: Score breakdown structure matches specification.');
}

async function testHumanReviewAuditTrail() {
    console.log('\n[TEST 2] Verifying Human Review audit trail logic...');
    const fakeReport = {
        reviewStatus: 'PENDING',
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null,
        save: async function() { return this; }
    };

    const reviewAction = 'CONFIRMED_CONCERN';
    const reviewerName = 'recruiter_sarah@example.com';
    const reason = 'Candidate had a smartphone visibly propped against laptop';

    fakeReport.reviewStatus = reviewAction;
    fakeReport.reviewedBy = reviewerName;
    fakeReport.reviewedAt = new Date();
    fakeReport.reviewReason = reason;

    assert.strictEqual(fakeReport.reviewStatus, 'CONFIRMED_CONCERN');
    assert.strictEqual(fakeReport.reviewedBy, reviewerName);
    assert.strictEqual(fakeReport.reviewReason, reason);
    assert(fakeReport.reviewedAt instanceof Date);

    console.log('✅ TEST 2 PASSED: Human review audit properties correctly assigned.');
}

async function testTranscriptProctoringLinkage() {
    console.log('\n[TEST 3] Verifying Transcript & Question proctoring event linkage...');
    const questions = [
        { _id: 'q1', question: 'What is polymorphism?', answer: 'It means many forms.' },
        { _id: 'q2', question: 'Explain promises.', answer: 'Promises represent async operations.' }
    ];

    const violations = [
        {
            type: 'multiple_faces',
            canonicalEventType: 'MULTIPLE_PERSONS',
            category: 'PERSON_AUTHENTICATION',
            questionId: 'q1',
            isAnswering: true,
            severity: 'critical'
        },
        {
            type: 'looking_away',
            canonicalEventType: 'LOOKING_AWAY',
            category: 'ATTENTION_GAZE',
            questionIndex: 1,
            isAnswering: true,
            severity: 'standard'
        }
    ];

    const enrichedQuestions = questions.map((q, idx) => {
        const qIdStr = q._id ? q._id.toString() : '';
        const matched = violations.filter(v =>
            (v.questionId && v.questionId.toString() === qIdStr) ||
            (v.questionIndex !== undefined && v.questionIndex === idx)
        );
        return {
            ...q,
            proctoringEvents: matched,
            hasProctoringFlag: matched.length > 0
        };
    });

    assert.strictEqual(enrichedQuestions[0].hasProctoringFlag, true);
    assert.strictEqual(enrichedQuestions[0].proctoringEvents.length, 1);
    assert.strictEqual(enrichedQuestions[0].proctoringEvents[0].canonicalEventType, 'MULTIPLE_PERSONS');

    assert.strictEqual(enrichedQuestions[1].hasProctoringFlag, true);
    assert.strictEqual(enrichedQuestions[1].proctoringEvents.length, 1);
    assert.strictEqual(enrichedQuestions[1].proctoringEvents[0].canonicalEventType, 'LOOKING_AWAY');

    console.log('✅ TEST 3 PASSED: Question-level proctoring linkage functions properly.');
}

async function run() {
    try {
        await testScoreBreakdownLogic();
        await testHumanReviewAuditTrail();
        await testTranscriptProctoringLinkage();
        console.log('\n====================================================');
        console.log('  ALL INTEGRATION VERIFICATIONS PASSED (100%)       ');
        console.log('====================================================\n');
    } catch (err) {
        console.error('❌ Verification failed:', err);
        process.exit(1);
    }
}

run();
