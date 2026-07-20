const ProctoringReport = require('../models/ProctoringReport');
const Application = require('../models/Application');
const mongoose = require('mongoose');

/**
 * Proctoring Event Controller (Single Collection Mode)
 * ──────────────────────────────────────────────────────────────────────────────
 * Directly logs, updates, and fetches proctoring flags into the central
 * ProctoringReport MongoDB collection.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const EVENT_TYPE_MAP = {
    mobile_phone_detected: { type: 'PHONE_DETECTED', rating: 6, detail: 'Mobile phone detected in camera frame.' },
    secondary_laptop_detected: { type: 'OBJECT_DETECTED', rating: 6, detail: 'Secondary laptop or computer screen detected.' },
    book_detected: { type: 'OBJECT_DETECTED', rating: 5, detail: 'Book or reading material detected.' },
    tablet_detected: { type: 'OBJECT_DETECTED', rating: 6, detail: 'Tablet device detected.' },
    earphone_detected: { type: 'HEADPHONES_DETECTED', rating: 5, detail: 'Earphones or headphones detected.' },
    suspicious_object_detected: { type: 'OBJECT_DETECTED', rating: 6, detail: 'Suspicious object detected.' },
    no_face_detected: { type: 'NO_PEOPLE', rating: 4, detail: 'No face detected in camera frame.' },
    multiple_faces_detected: { type: 'MULTIPLE_PEOPLE', rating: 7, detail: 'Multiple faces detected in camera frame.' },
    person_count_violation: { type: 'MULTIPLE_PEOPLE', rating: 7, detail: 'Extra person detected.' },
    looking_away: { type: 'EYE_LOOKING_AWAY', rating: 4, detail: 'Gaze turned away from screen.' },
    head_turned: { type: 'HEAD_TURNED', rating: 3, detail: 'Head turned excessively.' },
    eyes_closed: { type: 'EYE_LOOKING_AWAY', rating: 4, detail: 'Eyes closed for extended duration.' },
    rapid_gaze_movement: { type: 'EYE_LOOKING_AWAY', rating: 4, detail: 'Rapid eye reading pattern.' },
    phone_near_face: { type: 'PHONE_DETECTED', rating: 6, detail: 'Mobile phone held near face.' },
    phone_near_ear: { type: 'PHONE_DETECTED', rating: 8, detail: 'Mobile phone held to ear.' },
    hand_near_lap: { type: 'OBJECT_DETECTED', rating: 3, detail: 'Hand positioned near lap with suspicious device.' },
    hand_leaving_frame: { type: 'OBJECT_DETECTED', rating: 2, detail: 'Hand left camera frame continuously.' },
    multiple_voices: { type: 'MULTIPLE_PEOPLE', rating: 7, detail: 'Multiple speech voices detected in audio stream.' },
    background_noise: { type: 'OBJECT_DETECTED', rating: 2, detail: 'Loud background audio detected.' },
    continuous_talking: { type: 'EYE_LOOKING_AWAY', rating: 3, detail: 'Candidate talking continuously.' },
    new_object_appeared: { type: 'OBJECT_DETECTED', rating: 5, detail: 'New unauthorized object appeared after initial check.' },
    environment_change: { type: 'OBJECT_DETECTED', rating: 4, detail: 'Environment change detected.' },
};

const getStatusAndVerdict = (penaltyRating) => {
    if (penaltyRating <= 0) {
        return {
            status: 'clean',
            verdict: 'Seriousness Verified',
            summary: 'No anomalies detected. Candidate followed rules during the assessment.',
        };
    } else if (penaltyRating <= 5) {
        return {
            status: 'low_risk',
            verdict: 'Pass with Minor Alerts',
            summary: 'A few minor alerts recorded. Candidate is likely serious.',
        };
    } else if (penaltyRating <= 12) {
        return {
            status: 'suspicious',
            verdict: 'Review Recommended',
            summary: 'Multiple alerts recorded. Review of proctoring evidence recommended.',
        };
    } else {
        return {
            status: 'critical',
            verdict: 'Critical Cheating Alert',
            summary: 'Critical violations detected. Strong evidence of candidate cheating.',
        };
    }
};

const updateReportWithViolations = async (examId, userId, newTimelineEntries) => {
    const queryExamId = examId || `${userId}:default`;
    const queryUserId = userId || 'unknown';

    let report = await ProctoringReport.findOne({ examId: queryExamId });

    if (!report) {
        // Find applicationId
        let applicationId = null;
        const parts = queryExamId.split(':');
        const jobId = parts.length >= 2 ? parts[1] : null;
        if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
            const app = await Application.findOne({
                userId: queryUserId,
                jobId: new mongoose.Types.ObjectId(jobId),
            }).select('_id').lean();
            if (app) applicationId = app._id;
        }

        report = new ProctoringReport({
            examId: queryExamId,
            userId: queryUserId,
            applicationId,
            totalViolations: 0,
            totalPenaltyRating: 0,
            status: 'clean',
            verdict: 'Seriousness Verified',
            summary: 'No anomalies detected.',
            violationSummaryList: [],
            timeline: [],
        });
    }

    // Append new timeline entries
    for (const entry of newTimelineEntries) {
        report.timeline.push(entry);

        // Update violationSummaryList
        let summaryItem = report.violationSummaryList.find(s => s.type === entry.type);
        if (!summaryItem) {
            report.violationSummaryList.push({
                type: entry.type,
                count: 1,
                rating: entry.rating,
            });
        } else {
            summaryItem.count += 1;
            summaryItem.rating += entry.rating;
        }
    }

    report.totalViolations = report.timeline.length;
    report.totalPenaltyRating = report.timeline.reduce((sum, item) => sum + (item.rating || 0), 0);

    const { status, verdict, summary } = getStatusAndVerdict(report.totalPenaltyRating);
    report.status = status;
    report.verdict = verdict;
    report.summary = summary;

    await report.save();
    console.log(`[PROCTORING REPORT DIRECT UPDATED] examId: ${queryExamId}, totalViolations: ${report.totalViolations}, rating: ${report.totalPenaltyRating}, status: ${status}`);
    return report;
};

/**
 * Log a single proctoring event directly into ProctoringReport
 * POST /api/proctoring-pipeline/event
 */
const logEvent = async (req, res) => {
    try {
        const { candidateId, assessmentId, examId, eventType, detail, confidence, userId } = req.body;

        if (!eventType) {
            return res.status(400).json({ message: 'Missing required field: eventType' });
        }

        const mapped = EVENT_TYPE_MAP[eventType] || {
            type: eventType.toUpperCase(),
            rating: 4,
            detail: detail || 'Proctoring alert logged.',
        };

        const timelineEntry = {
            type: mapped.type,
            detail: detail || mapped.detail,
            timestamp: new Date(),
            rating: mapped.rating,
        };

        const targetExamId = examId || `${candidateId || userId}:${assessmentId || 'default'}`;
        const targetUserId = userId || candidateId || 'unknown';

        const report = await updateReportWithViolations(targetExamId, targetUserId, [timelineEntry]);

        return res.status(200).json({
            recorded: true,
            examId: report.examId,
            totalViolations: report.totalViolations,
            totalPenaltyRating: report.totalPenaltyRating,
            status: report.status,
        });
    } catch (error) {
        console.error('[PROCTORING REPORT LOG EVENT ERROR]', error);
        return res.status(500).json({ message: 'Failed to log event to ProctoringReport', error: error.message });
    }
};

/**
 * Log multiple events in batch directly into ProctoringReport
 * POST /api/proctoring-pipeline/batch-events
 */
const logBatchEvents = async (req, res) => {
    try {
        const { events, examId, userId, candidateId, assessmentId } = req.body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ message: 'Missing or empty events array' });
        }

        const targetExamId = examId || `${candidateId || userId}:${assessmentId || 'default'}`;
        const targetUserId = userId || candidateId || 'unknown';

        const timelineEntries = events.map(evt => {
            const mapped = EVENT_TYPE_MAP[evt.eventType] || {
                type: (evt.eventType || 'OBJECT_DETECTED').toUpperCase(),
                rating: 4,
                detail: evt.detail || 'Proctoring alert logged.',
            };

            return {
                type: mapped.type,
                detail: evt.detail || mapped.detail,
                timestamp: evt.timestamp ? new Date(evt.timestamp) : new Date(),
                rating: mapped.rating,
            };
        });

        const report = await updateReportWithViolations(targetExamId, targetUserId, timelineEntries);

        return res.status(200).json({
            recorded: true,
            count: events.length,
            totalViolations: report.totalViolations,
            totalPenaltyRating: report.totalPenaltyRating,
            status: report.status,
        });
    } catch (error) {
        console.error('[PROCTORING REPORT BATCH ERROR]', error);
        return res.status(500).json({ message: 'Failed to log batch to ProctoringReport', error: error.message });
    }
};

/**
 * Get events timeline for an exam session
 * GET /api/proctoring-pipeline/events/:examId
 */
const getEventsByExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const report = await ProctoringReport.findOne({ examId }).lean();

        if (!report) {
            return res.status(200).json({ events: [], count: 0 });
        }

        return res.status(200).json({
            events: report.timeline || [],
            count: report.timeline ? report.timeline.length : 0,
        });
    } catch (error) {
        console.error('[GET REPORT EVENTS ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch report timeline', error: error.message });
    }
};

/**
 * Get session details from ProctoringReport
 * GET /api/proctoring-pipeline/session/:examId
 */
const getSession = async (req, res) => {
    try {
        const { examId } = req.params;
        const report = await ProctoringReport.findOne({ examId }).lean();

        if (!report) {
            return res.status(404).json({ message: 'Proctoring report not found for this exam.' });
        }

        return res.status(200).json(report);
    } catch (error) {
        console.error('[GET REPORT SESSION ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch proctoring report', error: error.message });
    }
};

/**
 * Get current score/status from ProctoringReport
 * GET /api/proctoring-pipeline/score/:examId
 */
const getScore = async (req, res) => {
    try {
        const { examId } = req.params;
        const report = await ProctoringReport.findOne({ examId }).lean();

        if (!report) {
            return res.status(200).json({
                totalPenaltyRating: 0,
                score: 100,
                status: 'clean',
                verdict: 'Seriousness Verified',
            });
        }

        const score = Math.max(0, 100 - Math.round((report.totalPenaltyRating || 0) * 2.5));

        return res.status(200).json({
            totalPenaltyRating: report.totalPenaltyRating,
            score,
            status: report.status,
            verdict: report.verdict,
        });
    } catch (error) {
        console.error('[GET REPORT SCORE ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch proctoring report score', error: error.message });
    }
};

/**
 * Log warning escalation to ProctoringReport
 * POST /api/proctoring-pipeline/warning
 */
const logWarning = async (req, res) => {
    try {
        const { examId, userId, level, message } = req.body;
        const targetExamId = examId || `${userId}:default`;
        const targetUserId = userId || 'unknown';

        const entry = {
            type: level === 'auto_submit' ? 'SCREEN_SHARE_STOPPED' : 'OBJECT_DETECTED',
            detail: message || `Escalated warning: ${level}`,
            timestamp: new Date(),
            rating: level === 'auto_submit' ? 10 : 3,
        };

        const report = await updateReportWithViolations(targetExamId, targetUserId, [entry]);
        return res.status(200).json({ recorded: true, status: report.status });
    } catch (error) {
        console.error('[LOG WARNING ERROR]', error);
        return res.status(500).json({ message: 'Failed to log warning', error: error.message });
    }
};

/**
 * Environment Check
 * POST /api/proctoring-pipeline/environment-check
 */
const environmentCheck = async (req, res) => {
    try {
        const { personCount } = req.body;
        const passed = (personCount || 1) === 1;
        return res.status(200).json({ passed, personCount: personCount || 1 });
    } catch (error) {
        console.error('[ENV CHECK ERROR]', error);
        return res.status(500).json({ message: 'Failed to process environment check', error: error.message });
    }
};

/**
 * Pipeline Summary from ProctoringReport
 * GET /api/proctoring-pipeline/summary
 */
const getPipelineSummary = async (req, res) => {
    try {
        const totalReports = await ProctoringReport.countDocuments();
        const reportsByStatus = await ProctoringReport.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 }, avgPenalty: { $avg: '$totalPenaltyRating' } } },
            { $project: { status: '$_id', count: 1, avgPenalty: { $round: ['$avgPenalty', 1] }, _id: 0 } },
        ]);

        const recentReports = await ProctoringReport.find()
            .sort({ updatedAt: -1 })
            .limit(20)
            .lean();

        return res.status(200).json({
            totalReports,
            reportsByStatus,
            recentReports,
        });
    } catch (error) {
        console.error('[GET SUMMARY ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch proctoring report summary', error: error.message });
    }
};

module.exports = {
    logEvent,
    logBatchEvents,
    getEventsByExam,
    getSession,
    getScore,
    logWarning,
    environmentCheck,
    getPipelineSummary,
};
