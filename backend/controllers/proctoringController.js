const ProctoringViolation = require('../models/ProctoringViolation');

/**
 * Log a proctoring violation
 * POST /api/proctoring/violation
 */
const logViolation = async (req, res) => {
    try {
        const { examId, userId, type, detail, count, timestamp } = req.body;

        if (!examId || !userId || !type || !detail) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const violation = await ProctoringViolation.create({
            examId,
            userId,
            type,
            detail,
            count,
            timestamp: timestamp || new Date()
        });

        console.log('[PROCTORING VIOLATION]', { examId, userId, type, detail, count });

        return res.status(200).json({ recorded: true, violationId: violation._id });
    } catch (error) {
        console.error('[LOG VIOLATION ERROR]', error);
        return res.status(500).json({ message: 'Failed to log violation', error: error.message });
    }
};

/**
 * Get violations for a specific exam
 * GET /api/proctoring/violations/exam/:examId
 */
const getViolationsByExam = async (req, res) => {
    try {
        const { examId } = req.params;

        const violations = await ProctoringViolation.find({ examId })
            .sort({ timestamp: 1 })
            .lean();

        return res.status(200).json({ violations, count: violations.length });
    } catch (error) {
        console.error('[GET VIOLATIONS BY EXAM ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch violations', error: error.message });
    }
};

/**
 * Get violations for a specific user
 * GET /api/proctoring/violations/user/:userId
 */
const getViolationsByUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const violations = await ProctoringViolation.find({ userId })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({ violations, count: violations.length });
    } catch (error) {
        console.error('[GET VIOLATIONS BY USER ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch violations', error: error.message });
    }
};

/**
 * Get violations summary for admin dashboard
 * GET /api/proctoring/summary
 */
const getViolationsSummary = async (req, res) => {
    try {
        const totalViolations = await ProctoringViolation.countDocuments();
        
        const violationsByType = await ProctoringViolation.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    type: '$_id',
                    count: 1,
                    _id: 0
                }
            }
        ]);

        const recentViolations = await ProctoringViolation.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();

        return res.status(200).json({
            totalViolations,
            violationsByType,
            recentViolations
        });
    } catch (error) {
        console.error('[GET VIOLATIONS SUMMARY ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
    }
};

module.exports = {
    logViolation,
    getViolationsByExam,
    getViolationsByUser,
    getViolationsSummary
};
