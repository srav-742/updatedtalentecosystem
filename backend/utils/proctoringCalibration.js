/**
 * Proctoring Calibration & Benchmarking Framework
 * 
 * Provides a standardized benchmark test suite of simulated proctoring sessions
 * across 5 key test cohorts:
 * 1. NORMAL: Clean environment, no or negligible transient events. Expected: LOW RISK (Score >= 95).
 * 2. MINOR_BEHAVIOR: Minor natural movements (brief look away, minor lighting shift). Expected: LOW RISK (Score >= 80).
 * 3. SUSPICIOUS: Repeated tab switching, frequent absence during answering. Expected: REVIEW REQUIRED (60 <= Score < 80).
 * 4. CRITICAL: Hard redmark events (impersonation, mobile phone, secondary person). Expected: HIGH RISK (Score < 60).
 * 5. MIXED: Complex multi-signal behavior. Expected: HIGH RISK (Critical overrides minor noise).
 */

const { evaluateIntegrity, PROCTORING_SCORING_CONFIG } = require('./proctoringScoring');

const BENCHMARK_SESSIONS = [
    // ── Cohort 1: Normal / Clean Sessions ──
    {
        id: 'norm-01',
        cohort: 'NORMAL',
        expectedRiskLevel: 'LOW RISK',
        minIntegrityScore: 95,
        description: 'Clean session with 0 violations',
        events: []
    },
    {
        id: 'norm-02',
        cohort: 'NORMAL',
        expectedRiskLevel: 'LOW RISK',
        minIntegrityScore: 90,
        description: 'Clean session with single benign peripheral device (multi-camera hardware info)',
        events: [
            { type: 'MULTIPLE_DEVICES', detail: 'External USB Camera and Integrated Webcam detected', count: 1, metadata: { cameraCount: 2 } }
        ]
    },
    {
        id: 'norm-03',
        cohort: 'NORMAL',
        expectedRiskLevel: 'LOW RISK',
        minIntegrityScore: 90,
        description: 'Clean session with low-confidence transient look away (under threshold)',
        events: [
            { type: 'LOOKING_AWAY', detail: 'Gaze deviation', count: 1, confidence: 0.45, duration: 1.2 }
        ]
    },

    // ── Cohort 2: Minor Behavioral Variance ──
    {
        id: 'minor-01',
        cohort: 'MINOR_BEHAVIOR',
        expectedRiskLevel: 'LOW RISK',
        minIntegrityScore: 80,
        maxIntegrityScore: 95,
        description: 'Natural candidate behavior: 1 head turn + 1 brief lookaway while thinking',
        events: [
            { type: 'HEAD_TURNED', detail: 'Head turned slightly', count: 1, confidence: 0.72, duration: 2.5, isAnswering: false },
            { type: 'LOOKING_AWAY', detail: 'Candidate looked away briefly', count: 1, confidence: 0.75, duration: 2.1, isAnswering: true }
        ]
    },
    {
        id: 'minor-02',
        cohort: 'MINOR_BEHAVIOR',
        expectedRiskLevel: 'LOW RISK',
        minIntegrityScore: 80,
        description: 'Transient ambient lighting variation',
        events: [
            { type: 'LIGHTING_ANOMALY', detail: 'Subtle contrast shift', count: 1, confidence: 0.65, duration: 1.0 }
        ]
    },

    // ── Cohort 3: Suspicious Behavior (Review Required) ──
    {
        id: 'susp-01',
        cohort: 'SUSPICIOUS',
        expectedRiskLevel: 'REVIEW REQUIRED',
        minIntegrityScore: 60,
        maxIntegrityScore: 79,
        description: 'Repeated tab switches during answering phase (3 tab switches)',
        events: [
            { type: 'TAB_SWITCH', detail: 'Tab switched while answering question 2', count: 1, confidence: 0.95, isAnswering: true, questionId: 'q_2' },
            { type: 'TAB_SWITCH', detail: 'Tab switched while answering question 2', count: 1, confidence: 0.95, isAnswering: true, questionId: 'q_2' },
            { type: 'TAB_SWITCH', detail: 'Tab switched while answering question 3', count: 1, confidence: 0.95, isAnswering: true, questionId: 'q_3' }
        ]
    },
    {
        id: 'susp-02',
        cohort: 'SUSPICIOUS',
        expectedRiskLevel: 'REVIEW REQUIRED',
        minIntegrityScore: 60,
        maxIntegrityScore: 79,
        description: 'Candidate repeatedly leaves camera view during interview questions',
        events: [
            { type: 'NO_FACE_DETECTED', detail: 'No face detected for 6 seconds', count: 1, confidence: 0.88, duration: 6, isAnswering: true },
            { type: 'NO_FACE_DETECTED', detail: 'No face detected for 5 seconds', count: 1, confidence: 0.85, duration: 5, isAnswering: true },
            { type: 'HEAD_TURNED', detail: 'Prolonged head tilt away from screen', count: 1, confidence: 0.80, duration: 4, isAnswering: true }
        ]
    },

    // ── Cohort 4: Critical High-Risk Cheating Indicators ──
    {
        id: 'crit-01',
        cohort: 'CRITICAL',
        expectedRiskLevel: 'HIGH RISK',
        maxIntegrityScore: 59,
        description: 'Mobile phone detected with visual evidence during answering',
        events: [
            { 
                type: 'PHONE_DETECTED', 
                detail: 'Mobile phone visible in frame', 
                count: 1, 
                confidence: 0.94, 
                severity: 'critical', 
                isAnswering: true,
                evidenceFrames: ['data:image/jpeg;base64,...mockFrame...']
            }
        ]
    },
    {
        id: 'crit-02',
        cohort: 'CRITICAL',
        expectedRiskLevel: 'HIGH RISK',
        maxIntegrityScore: 59,
        description: 'Impersonation detected by biometric face-match detector',
        events: [
            { 
                type: 'IMPERSONATION_DETECTED', 
                detail: 'Candidate face mismatch with profile snapshot', 
                count: 1, 
                confidence: 0.96, 
                severity: 'critical',
                evidenceFrames: ['data:image/jpeg;base64,...impersonationMock...']
            }
        ]
    },
    {
        id: 'crit-03',
        cohort: 'CRITICAL',
        expectedRiskLevel: 'HIGH RISK',
        maxIntegrityScore: 59,
        description: 'Multiple faces / secondary person detected in room assisting candidate',
        events: [
            { 
                type: 'MULTIPLE_FACES_DETECTED', 
                detail: '2 distinct faces detected in frame', 
                count: 1, 
                confidence: 0.91, 
                severity: 'critical', 
                isAnswering: true,
                evidenceFrames: ['data:image/jpeg;base64,...twoFaces...']
            }
        ]
    },

    // ── Cohort 5: Mixed Noise + Critical Infraction ──
    {
        id: 'mix-01',
        cohort: 'MIXED',
        expectedRiskLevel: 'HIGH RISK',
        maxIntegrityScore: 59,
        description: 'Minor head turn and lighting shift + unauthorized secondary device in view',
        events: [
            { type: 'HEAD_TURNED', detail: 'Minor lookaway', count: 1, confidence: 0.70, duration: 1.5 },
            { type: 'LIGHTING_ANOMALY', detail: 'Dim light', count: 1, confidence: 0.60, duration: 1.0 },
            { 
                type: 'DEVICE_DETECTED', 
                detail: 'Secondary tablet detected beside screen', 
                count: 1, 
                confidence: 0.92, 
                severity: 'critical', 
                isAnswering: true,
                evidenceFrames: ['data:image/jpeg;base64,...device...']
            }
        ]
    },
    {
        id: 'mix-02',
        cohort: 'MIXED',
        expectedRiskLevel: 'HIGH RISK',
        maxIntegrityScore: 59,
        description: 'Candidate absent followed by voice from second speaker detected',
        events: [
            { type: 'NO_FACE_DETECTED', detail: 'Absence from webcam', count: 1, confidence: 0.85, duration: 7, isAnswering: true },
            { type: 'MULTIPLE_VOICES_DETECTED', detail: 'Second distinct speaker detected', count: 1, confidence: 0.89, severity: 'critical', isAnswering: true }
        ]
    }
];

/**
 * Runs the calibration benchmark on the test cohort dataset.
 * Evaluates accuracy, confusion matrix, precision, recall, and F1.
 */
function evaluateCalibration(dataset = BENCHMARK_SESSIONS) {
    const results = [];
    const confusionMatrix = {
        'LOW RISK': { 'LOW RISK': 0, 'REVIEW REQUIRED': 0, 'HIGH RISK': 0 },
        'REVIEW REQUIRED': { 'LOW RISK': 0, 'REVIEW REQUIRED': 0, 'HIGH RISK': 0 },
        'HIGH RISK': { 'LOW RISK': 0, 'REVIEW REQUIRED': 0, 'HIGH RISK': 0 }
    };

    let totalCorrect = 0;

    for (const session of dataset) {
        const evaluation = evaluateIntegrity(session.events);
        const actualRisk = evaluation.riskLevel;
        const expectedRisk = session.expectedRiskLevel;

        const isMatch = actualRisk === expectedRisk;
        let scoreValid = true;

        if (session.minIntegrityScore !== undefined && evaluation.integrityScore < session.minIntegrityScore) {
            scoreValid = false;
        }
        if (session.maxIntegrityScore !== undefined && evaluation.integrityScore > session.maxIntegrityScore) {
            scoreValid = false;
        }

        if (isMatch && scoreValid) {
            totalCorrect++;
        }

        if (confusionMatrix[expectedRisk] && confusionMatrix[expectedRisk][actualRisk] !== undefined) {
            confusionMatrix[expectedRisk][actualRisk]++;
        }

        results.push({
            id: session.id,
            cohort: session.cohort,
            expectedRisk,
            actualRisk,
            integrityScore: evaluation.integrityScore,
            totalPenaltyRating: evaluation.totalPenaltyRating,
            criticalIncidents: evaluation.criticalIncidents,
            standardIncidents: evaluation.standardIncidents,
            isMatch,
            scoreValid,
            pass: isMatch && scoreValid
        });
    }

    const accuracy = totalCorrect / dataset.length;

    // Calculate per-class Precision, Recall, F1 for HIGH RISK (most crucial class)
    const hrTP = confusionMatrix['HIGH RISK']['HIGH RISK'];
    const hrFP = confusionMatrix['LOW RISK']['HIGH RISK'] + confusionMatrix['REVIEW REQUIRED']['HIGH RISK'];
    const hrFN = confusionMatrix['HIGH RISK']['LOW RISK'] + confusionMatrix['HIGH RISK']['REVIEW REQUIRED'];

    const hrPrecision = (hrTP + hrFP) > 0 ? (hrTP / (hrTP + hrFP)) : 1.0;
    const hrRecall = (hrTP + hrFN) > 0 ? (hrTP / (hrTP + hrFN)) : 1.0;
    const hrF1 = (hrPrecision + hrRecall) > 0 ? (2 * (hrPrecision * hrRecall) / (hrPrecision + hrRecall)) : 0;

    return {
        totalSessions: dataset.length,
        totalCorrect,
        accuracy,
        highRiskMetrics: {
            precision: hrPrecision,
            recall: hrRecall,
            f1: hrF1
        },
        confusionMatrix,
        results
    };
}

module.exports = {
    BENCHMARK_SESSIONS,
    evaluateCalibration
};
