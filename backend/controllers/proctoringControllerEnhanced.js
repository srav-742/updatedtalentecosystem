const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');
const ProctoringViolation = require('../models/ProctoringViolation');
const ProctoringReport = require('../models/ProctoringReport');
const Application = require('../models/Application');
const {
    getViolationRating,
    sanitizeViolationDetail,
    getStatusAndVerdict,
    calculateProctoringScore,
    evaluateIntegrity,
    normalizeIncident,
    CANONICAL_EVENT_MAP,
    CANONICAL_CATEGORY_MAP,
} = require('../utils/proctoringScoring');
const mongoose = require('mongoose');


/**
 * Enhanced Proctoring Controller
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles logging, querying, and summarizing AI-proctoring violations.
 * This controller works with the ProctoringViolationEnhanced model and
 * does NOT touch the original proctoringController.js.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Severity mapping for proctoring violation types (Red Mark for Phone, Multiple Faces, and Objects)
const SEVERITY_MAP = {
    // Phone Detections (Red Mark)
    PHONE_DETECTED: 'critical',
    mobile_phone_detected: 'critical',
    phone_near_face: 'critical',
    phone_near_ear: 'critical',

    // Multiple Faces Detections (Red Mark)
    MULTIPLE_PEOPLE: 'critical',
    multiple_faces_detected: 'critical',
    person_count_violation: 'critical',

    // Object Detections (Red Mark)
    OBJECT_DETECTED: 'critical',
    HEADPHONES_DETECTED: 'critical',
    earphone_detected: 'critical',
    book_detected: 'critical',
    bottle_detected: 'critical',
    pen_detected: 'critical',
    pencil_detected: 'critical',
    tablet_detected: 'critical',
    secondary_laptop_detected: 'critical',
    suspicious_object_detected: 'critical',
    new_object_appeared: 'critical',

    // Other Telemetry & AI Flags
    TAB_SWITCH: 'medium',
    WINDOW_BLUR: 'medium',
    KEYBOARD_SHORTCUT: 'low',
    RIGHT_CLICK: 'low',
    SCREEN_SHARE_STOPPED: 'medium',
    FULLSCREEN_EXIT: 'medium',
    MULTIPLE_DEVICES: 'medium',
    EYE_LOOKING_AWAY: 'medium',
    EYE_LOOKING_AWAY_WHILE_ANSWERING: 'medium',
    HEAD_TURNED: 'medium',
    HEAD_TURNED_WHILE_ANSWERING: 'medium',
    NO_PEOPLE: 'medium',
    looking_away: 'medium',
    head_turned: 'medium',
    eyes_closed: 'medium',
    continuous_talking: 'medium',
    multiple_voices: 'medium',
    hand_near_lap: 'low',
    hand_leaving_frame: 'low',
    background_noise: 'low',
    environment_change: 'medium',
};


const updateProctoringReport = async (examId, userId) => {
    try {
        const baseQuery = { examId, userId };
        const baseViolations = await ProctoringViolation.find(baseQuery).lean();
        const enhancedViolations = await ProctoringViolationEnhanced.find(baseQuery).lean();
        
        const rawViolations = [
            ...baseViolations.map(v => ({
                _id: v._id,
                type: v.type,
                detail: sanitizeViolationDetail(v.type, v.detail, v.rating || 1),
                timestamp: v.timestamp,
                rating: v.rating || 1,
                metadata: v.metadata,
                startTime: v.timestamp,
                endTime: v.timestamp,
                duration: 0,
                confidence: null,
                maxConfidence: null,
                evidenceFrames: [],
                model: 'RuleEngine',
                isAnswering: false,
                reviewStatus: 'UNREVIEWED',
            })),
            ...enhancedViolations.map(v => ({
                _id: v._id,
                type: v.type,
                detail: sanitizeViolationDetail(v.type, v.detail, v.rating || 1),
                timestamp: v.timestamp,
                rating: v.rating || 1,
                metadata: v.metadata,
                startTime: v.startTime || v.timestamp,
                endTime: v.endTime || v.timestamp,
                duration: v.duration || 0,
                confidence: v.confidence !== undefined ? v.confidence : null,
                maxConfidence: v.maxConfidence || v.confidence || null,
                evidenceFrames: v.evidenceFrames || [],
                model: v.model || 'Unknown',
                isAnswering: v.isAnswering || false,
                questionId: v.questionId || null,
                answerId: v.answerId || null,
                reviewStatus: v.reviewStatus || 'UNREVIEWED',
                reviewReason: v.reviewReason || null,
            }))
        ];

        // Evaluate integrity using authoritative scoring engine v2
        const integrityEvaluation = evaluateIntegrity(rawViolations);
        const {
            integrityScore,
            totalPenaltyRating,
            riskLevel,
            scoreVersion,
            totalIncidents,
            standardIncidents,
            criticalIncidents,
            eventSummary,
            scoreFactors,
            status,
            verdict,
            summary,
            incidents,
        } = integrityEvaluation;

        // Build violationSummaryList for backward compatibility
        const violationSummaryList = Object.entries(eventSummary).map(([type, count]) => ({
            type,
            count,
            rating: count * getViolationRating(type),
        }));

        let applicationId = null;
        const parts = examId.split(':');
        const jobId = parts.length >= 2 ? parts[1] : null;

        if (parts.length >= 3) {
            const sessionId = parts[2];
            let app = null;
            if (sessionId && sessionId !== 'pending') {
                app = await Application.findOne({ recordingSessionId: sessionId }).select('_id').lean();
            }
            if (!app && jobId && mongoose.Types.ObjectId.isValid(jobId)) {
                app = await Application.findOne({ userId, jobId: new mongoose.Types.ObjectId(jobId) }).select('_id').lean();
            }
            if (app) applicationId = app._id;
        } else {
            let app = null;
            if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
                app = await Application.findOne({ userId, jobId: new mongoose.Types.ObjectId(jobId) }).select('_id').lean();
            }
            if (app) applicationId = app._id;
        }

        const report = await ProctoringReport.findOneAndUpdate(
            { examId },
            {
                examId,
                userId,
                applicationId,
                totalViolations: totalIncidents,
                totalPenaltyRating,
                proctoringScore: integrityScore,
                integrityScore,
                riskLevel,
                scoreVersion,
                totalIncidents,
                standardIncidents,
                criticalIncidents,
                eventSummary,
                scoreFactors,
                status,
                verdict,
                summary,
                violationSummaryList,
                timeline: incidents.map(inc => ({
                    _id: inc.incidentId,
                    type: inc.eventType,
                    canonicalEventType: inc.canonicalEventType,
                    category: inc.category,
                    detail: inc.detail,
                    timestamp: inc.timestamp,
                    rating: inc.basePenalty,
                    severity: inc.severity,
                    confidence: inc.confidence,
                    maxConfidence: inc.maxConfidence,
                    startTime: inc.startTime,
                    endTime: inc.endTime,
                    duration: inc.duration,
                    evidenceFrames: inc.evidenceFrames,
                    model: inc.source,
                    isAnswering: inc.isAnswering,
                    questionId: inc.questionId,
                    answerId: inc.answerId,
                    reviewStatus: inc.status,
                })),
            },
            { upsert: true, new: true }
        );

        if (applicationId) {
            await Application.findByIdAndUpdate(applicationId, {
                integrityPenalty: totalPenaltyRating,
                proctoringScore: integrityScore,
                integrityScore,
                riskLevel,
            });
        }

        // Cache the compiled report in Redis
        try {
            const redisService = require('../services/redisService');
            const cacheKey = `proctoring:report:${examId}`;
            await redisService.set(cacheKey, report, 600);
        } catch (cacheErr) {
            console.warn('[PROCTORING REPORT CACHE ERROR]', cacheErr.message);
        }

        console.log(`[PROCTORING REPORT UPDATED] examId: ${examId}, risk: ${riskLevel}, score: ${integrityScore}, rating: ${totalPenaltyRating}`);
        return report;
    } catch (err) {
        console.error('[PROCTORING REPORT UPDATE ERROR]', err);
    }
};

/**
 * Log a proctoring violation
 * POST /api/proctoring-enhanced/violation
 */
const logViolation = async (req, res) => {
    try {
        const {
            examId,
            userId,
            type,
            detail,
            count,
            timestamp,
            isAnswering,
            confidence,
            metadata,
        } = req.body;

        if (!examId || !userId || !type || !detail) {
            return res.status(400).json({ message: 'Missing required fields: examId, userId, type, detail' });
        }

        // Standard multi-camera hardware inputs (e.g. laptop webcam + IR/virtual camera) are not a violation
        if (type === 'MULTIPLE_DEVICES' && (/camera/i.test(detail) || metadata?.cameraCount)) {
            return res.status(200).json({ message: 'Ignored multi-camera hardware as non-violation', recorded: false });
        }

        const rating = getViolationRating(type, metadata);
        const canonicalEventType = CANONICAL_EVENT_MAP[type] || type;
        const category = CANONICAL_CATEGORY_MAP[canonicalEventType] || 'UNKNOWN';

        const violation = await ProctoringViolationEnhanced.create({
            examId,
            userId,
            type,
            canonicalEventType,
            category,
            detail,
            count: count || 1,
            severity: SEVERITY_MAP[type] || 'medium',
            rating,
            isAnswering: isAnswering || false,
            confidence: confidence || null,
            maxConfidence: confidence || null,
            duration: req.body.duration || 0,
            evidenceFrames: Array.isArray(req.body.evidenceFrames) ? req.body.evidenceFrames : [],
            model: req.body.model || 'Unknown',
            questionId: req.body.questionId || null,
            answerId: req.body.answerId || null,
            metadata: metadata || null,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
        });

        console.log('[PROCTORING-ENHANCED VIOLATION]', {
            examId,
            userId,
            type,
            detail,
            count: count || 1,
            severity: violation.severity,
            rating: violation.rating,
            ranking: violation.rating,
            isAnswering: violation.isAnswering,
        });

        // Trigger report update synchronously to guarantee saving in proctoringreports collection
        try {
            await updateProctoringReport(examId, userId);
        } catch (reportErr) {
            console.error('[PROCTORING REPORT UPDATE FAIL]', reportErr);
        }

        return res.status(200).json({
            recorded: true,
            violationId: violation._id,
            severity: violation.severity,
        });
    } catch (error) {
        console.error('[ENHANCED LOG VIOLATION ERROR]', error);
        return res.status(500).json({
            message: 'Failed to log enhanced violation',
            error: error.message,
        });
    }
};

/**
 * Get violations for a specific exam
 * GET /api/proctoring-enhanced/violations/exam/:examId
 */
const getViolationsByExam = async (req, res) => {
    try {
        const { examId } = req.params;

        const violations = await ProctoringViolationEnhanced.find({ examId })
            .sort({ timestamp: 1 })
            .lean();

        return res.status(200).json({
            violations,
            count: violations.length,
        });
    } catch (error) {
        console.error('[ENHANCED GET VIOLATIONS BY EXAM ERROR]', error);
        return res.status(500).json({
            message: 'Failed to fetch enhanced violations',
            error: error.message,
        });
    }
};

/**
 * Get violations for a specific user
 * GET /api/proctoring-enhanced/violations/user/:userId
 */
const getViolationsByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const violations = await ProctoringViolationEnhanced.find({ userId })
            .sort({ timestamp: -1 })
            .limit(200)
            .lean();

        return res.status(200).json({
            violations,
            count: violations.length,
        });
    } catch (error) {
        console.error('[ENHANCED GET VIOLATIONS BY USER ERROR]', error);
        return res.status(500).json({
            message: 'Failed to fetch enhanced violations',
            error: error.message,
        });
    }
};

/**
 * Get enhanced violations summary for admin/recruiter dashboard
 * GET /api/proctoring-enhanced/summary
 */
const getViolationsSummary = async (req, res) => {
    try {
        const totalViolations = await ProctoringViolationEnhanced.countDocuments();

        const violationsByType = await ProctoringViolationEnhanced.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' },
                },
            },
            {
                $project: {
                    type: '$_id',
                    count: 1,
                    avgConfidence: { $round: ['$avgConfidence', 3] },
                    _id: 0,
                },
            },
            { $sort: { count: -1 } },
        ]);

        const violationsBySeverity = await ProctoringViolationEnhanced.aggregate([
            {
                $group: {
                    _id: '$severity',
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    severity: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
        ]);

        const answeringViolations = await ProctoringViolationEnhanced.countDocuments({
            isAnswering: true,
        });

        const recentViolations = await ProctoringViolationEnhanced.find()
            .sort({ timestamp: -1 })
            .limit(20)
            .lean();

        return res.status(200).json({
            totalViolations,
            violationsByType,
            violationsBySeverity,
            answeringViolations,
            recentViolations,
        });
    } catch (error) {
        console.error('[ENHANCED GET VIOLATIONS SUMMARY ERROR]', error);
        return res.status(500).json({
            message: 'Failed to fetch enhanced summary',
            error: error.message,
        });
    }
};

const getReportByExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const report = await ProctoringReport.findOne({ examId }).lean();
        if (!report) {
            // No report exists — this means no proctoring events were ever recorded.
            // Return null score so dashboards can distinguish "never analyzed" from "clean".
            return res.status(200).json({
                status: 'clean',
                verdict: 'No proctoring data recorded for this session.',
                summary: 'No proctoring events were captured during this assessment.',
                totalPenaltyRating: 0,
                proctoringScore: null,
                integrityScore: null,
                riskLevel: 'LOW_RISK',
                scoreVersion: 'v2',
                totalViolations: 0,
                totalIncidents: 0,
                standardIncidents: 0,
                criticalIncidents: 0,
                scoreFactors: ['No proctoring events were captured during this assessment.'],
                timeline: [],
                analysisStatus: 'PENDING',
            });
        }
        return res.status(200).json(report);
    } catch (error) {
        console.error('[GET PROCTORING REPORT ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch proctoring report', error: error.message });
    }
};

const getAllReports = async (req, res) => {
    try {
        // 🔒 Verify recruiter/admin session
        const recruiterId = req.headers ? req.headers['x-user-id'] : null;
        if (!recruiterId) {
            return res.status(403).json({ message: "Forbidden: Recruiter status required." });
        }
        const { findRecruiterUser } = require('../utils/userResolver');
        const recruiter = await findRecruiterUser(recruiterId);
        if (!recruiter || (recruiter.role !== 'recruiter' && recruiter.role !== 'admin')) {
            return res.status(403).json({ message: "Forbidden: Recruiter status required." });
        }

        const reports = await ProctoringReport.find()
            .populate({
                path: 'applicationId',
                populate: {
                    path: 'jobId',
                    select: 'title'
                }
            })
            .sort({ updatedAt: -1 })
            .lean();

        // Fallback for any reports that don't have applicationId or missing candidate names
        for (let i = 0; i < reports.length; i++) {
            const report = reports[i];
            if (!report.applicationId) {
                let app = null;
                let jobId = null;
                if (report.examId && typeof report.examId === 'string') {
                    const parts = report.examId.split(':');
                    if (parts.length >= 2) {
                        jobId = parts[1];
                    }
                }

                if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
                    app = await Application.findOne({ userId: report.userId, jobId: new mongoose.Types.ObjectId(jobId) })
                        .populate('jobId', 'title')
                        .lean();
                }

                if (!app) {
                    app = await Application.findOne({ userId: report.userId })
                        .populate('jobId', 'title')
                        .lean();
                }

                if (app) {
                    report.resolvedApplication = {
                        _id: app._id,
                        applicantName: app.applicantName,
                        applicantEmail: app.applicantEmail,
                        jobId: app.jobId
                    };
                }
            }
        }

        return res.status(200).json(reports);
    } catch (error) {
        console.error('[GET ALL REPORTS ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch proctoring reports', error: error.message });
    }
};

module.exports = {
    logViolation,
    getViolationsByExam,
    getViolationsByUser,
    getViolationsSummary,
    getReportByExam,
    updateProctoringReport,
    getAllReports,
};
