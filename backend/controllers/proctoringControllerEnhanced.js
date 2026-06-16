const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');
const { getViolationRating } = require('../utils/proctoringScoring');

/**
 * Enhanced Proctoring Controller
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles logging, querying, and summarizing AI-proctoring violations.
 * This controller works with the ProctoringViolationEnhanced model and
 * does NOT touch the original proctoringController.js.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Severity mapping for AI violation types
const SEVERITY_MAP = {
    TAB_SWITCH: 'medium',
    WINDOW_BLUR: 'medium',
    KEYBOARD_SHORTCUT: 'medium',
    RIGHT_CLICK: 'low',
    SCREEN_SHARE_STOPPED: 'high',
    FULLSCREEN_EXIT: 'medium',
    MULTIPLE_DEVICES: 'high',
    EYE_LOOKING_AWAY: 'medium',
    EYE_LOOKING_AWAY_WHILE_ANSWERING: 'high',
    HEAD_TURNED: 'medium',
    HEAD_TURNED_WHILE_ANSWERING: 'high',
    NO_PEOPLE: 'high',
    MULTIPLE_PEOPLE: 'critical',
    PHONE_DETECTED: 'critical',
    HEADPHONES_DETECTED: 'high',
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

        const rating = getViolationRating(type, metadata);

        const violation = await ProctoringViolationEnhanced.create({
            examId,
            userId,
            type,
            detail,
            count: count || 1,
            severity: SEVERITY_MAP[type] || 'medium',
            rating,
            isAnswering: isAnswering || false,
            confidence: confidence || null,
            metadata: metadata || null,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
        });

        console.log('[PROCTORING-ENHANCED VIOLATION]', {
            examId,
            userId,
            type,
            detail,
            count,
            severity: violation.severity,
            isAnswering: violation.isAnswering,
        });

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

module.exports = {
    logViolation,
    getViolationsByExam,
    getViolationsByUser,
    getViolationsSummary,
};
