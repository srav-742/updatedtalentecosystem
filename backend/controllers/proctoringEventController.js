const ProctoringReport = require('../models/ProctoringReport');
const Application = require('../models/Application');
const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');
const mongoose = require('mongoose');
const redisService = require('../services/redisService');
const queueService = require('../services/queueService');

/**
 * Proctoring Event Controller (Single Collection & Cache-First Mode)
 * ──────────────────────────────────────────────────────────────────────────────
 * Logs proctoring violations, manages Redis caches for session scores,
 * and pushes heavy reports compiling to BullMQ background workers.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const EVENT_TYPE_MAP = {
    // Phone Detections (Red Mark: 2)
    mobile_phone_detected: { type: 'PHONE_DETECTED', rating: 2, severity: 'critical', detail: 'Mobile phone detected in camera frame.' },
    PHONE_DETECTED: { type: 'PHONE_DETECTED', rating: 2, severity: 'critical', detail: 'Mobile phone detected in camera frame.' },
    phone_near_face: { type: 'PHONE_DETECTED', rating: 2, severity: 'critical', detail: 'Mobile phone held near face.' },
    phone_near_ear: { type: 'PHONE_DETECTED', rating: 2, severity: 'critical', detail: 'Mobile phone held to ear.' },

    // Multiple Faces Detections (Red Mark: 2)
    multiple_faces_detected: { type: 'MULTIPLE_PEOPLE', rating: 2, severity: 'critical', detail: 'Multiple faces detected in camera frame.' },
    person_count_violation: { type: 'MULTIPLE_PEOPLE', rating: 2, severity: 'critical', detail: 'Extra person detected.' },
    MULTIPLE_PEOPLE: { type: 'MULTIPLE_PEOPLE', rating: 2, severity: 'critical', detail: 'Multiple faces detected in camera frame.' },

    // Object Detections (Red Mark: 2)
    secondary_laptop_detected: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'Secondary laptop or computer screen detected.' },
    book_detected: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'Book or reading material detected.' },
    bottle_detected: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'Bottle or container detected.' },
    pen_detected: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'Pen or writing instrument detected.' },
    tablet_detected: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'Tablet device detected.' },
    earphone_detected: { type: 'HEADPHONES_DETECTED', rating: 2, severity: 'critical', detail: 'Earphones or headphones detected.' },
    HEADPHONES_DETECTED: { type: 'HEADPHONES_DETECTED', rating: 2, severity: 'critical', detail: 'Earphones or headphones detected.' },
    suspicious_object_detected: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'Suspicious object detected.' },
    OBJECT_DETECTED: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'Unauthorized object detected in frame.' },
    new_object_appeared: { type: 'OBJECT_DETECTED', rating: 2, severity: 'critical', detail: 'New unauthorized object appeared after initial check.' },

    // Other Flags (Penalty: 1)
    no_face_detected: { type: 'NO_PEOPLE', rating: 1, severity: 'medium', detail: 'No face detected in camera frame.' },
    NO_PEOPLE: { type: 'NO_PEOPLE', rating: 1, severity: 'medium', detail: 'No face detected in camera frame.' },
    looking_away: { type: 'EYE_LOOKING_AWAY', rating: 1, severity: 'medium', detail: 'Gaze turned away from screen.' },
    EYE_LOOKING_AWAY: { type: 'EYE_LOOKING_AWAY', rating: 1, severity: 'medium', detail: 'Gaze turned away from screen.' },
    head_turned: { type: 'HEAD_TURNED', rating: 1, severity: 'medium', detail: 'Head turned excessively.' },
    HEAD_TURNED: { type: 'HEAD_TURNED', rating: 1, severity: 'medium', detail: 'Head turned excessively.' },
    eyes_closed: { type: 'EYE_LOOKING_AWAY', rating: 1, severity: 'medium', detail: 'Eyes closed for extended duration.' },
    rapid_gaze_movement: { type: 'EYE_LOOKING_AWAY', rating: 1, severity: 'medium', detail: 'Rapid eye reading pattern.' },
    hand_near_lap: { type: 'OBJECT_DETECTED', rating: 1, severity: 'medium', detail: 'Hand positioned near lap.' },
    hand_leaving_frame: { type: 'OBJECT_DETECTED', rating: 1, severity: 'low', detail: 'Hand left camera frame continuously.' },
    multiple_voices: { type: 'MULTIPLE_PEOPLE', rating: 1, severity: 'medium', detail: 'Multiple speech voices detected in audio stream.' },
    background_noise: { type: 'OBJECT_DETECTED', rating: 1, severity: 'low', detail: 'Loud background audio detected.' },
    continuous_talking: { type: 'EYE_LOOKING_AWAY', rating: 1, severity: 'medium', detail: 'Candidate talking continuously.' },
    environment_change: { type: 'OBJECT_DETECTED', rating: 1, severity: 'medium', detail: 'Environment change detected.' },
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

/**
 * Main report compiling logic (runs via BullMQ / Fallback async queue)
 */
const updateProctoringReport = async (examId, userId) => {
    try {
        const baseQuery = { examId, userId };
        
        // Fetch all enhanced violations logged for this session
        const enhancedViolations = await ProctoringViolationEnhanced.find(baseQuery).sort({ timestamp: 1 }).lean();
        
        const timeline = enhancedViolations.map(v => ({
            type: v.type,
            detail: v.detail,
            timestamp: v.timestamp || v.createdAt || new Date(),
            rating: v.rating,
            startTime: v.startTime,
            endTime: v.endTime,
            duration: v.duration,
            maxConfidence: v.maxConfidence,
            evidenceFrames: v.evidenceFrames,
            model: v.model
        }));

        const totalViolations = timeline.length;
        const totalPenaltyRating = timeline.reduce((sum, v) => sum + (v.rating || 0), 0);

        const { status, verdict, summary } = getStatusAndVerdict(totalPenaltyRating);

        // Map counts
        const countsMap = {};
        timeline.forEach(v => {
            if (!countsMap[v.type]) {
                countsMap[v.type] = { type: v.type, count: 0, rating: 0 };
            }
            countsMap[v.type].count += 1;
            countsMap[v.type].rating += v.rating || 0;
        });
        const violationSummaryList = Object.values(countsMap);

        let applicationId = null;
        const parts = examId.split(':');
        const jobId = parts.length >= 2 ? parts[1] : null;
        if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
            const app = await Application.findOne({ userId, jobId: new mongoose.Types.ObjectId(jobId) }).select('_id').lean();
            if (app) applicationId = app._id;
        }

        const report = await ProctoringReport.findOneAndUpdate(
            { examId },
            {
                examId,
                userId,
                applicationId,
                totalViolations,
                totalPenaltyRating,
                status,
                verdict,
                summary,
                violationSummaryList,
                timeline
            },
            { upsert: true, new: true }
        );

        // Update application integrity state
        if (applicationId) {
            await Application.findByIdAndUpdate(applicationId, {
                integrityPenalty: totalPenaltyRating,
                proctoringScore: Math.max(0, 100 - Math.round(totalPenaltyRating * 2.5)),
            });
        }

        // Cache the compiled report in Redis
        const cacheKey = `proctoring:report:${examId}`;
        await redisService.set(cacheKey, report, 600); // 10 minutes cache

        console.log(`[PROCTORING REPORT DIRECT UPDATED] examId: ${examId}, rating: ${totalPenaltyRating}, status: ${status}`);
        return report;
    } catch (err) {
        console.error('[PROCTORING REPORT UPDATE ERROR]', err);
    }
};

/**
 * Log a single proctoring event directly into ProctoringReport
 * POST /api/proctoring-pipeline/event
 */
const logEvent = async (req, res) => {
    try {
        const {
            examId,
            userId,
            candidateId,
            assessmentId,
            eventType,
            detail,
            confidence,
            durationMs,
            severity,
            proctoringScore,
            signals,
        } = req.body;

        if (!eventType) {
            return res.status(400).json({ message: 'Missing required field: eventType' });
        }

        const targetExamId = examId || `${candidateId || userId}:${assessmentId || 'default'}`;
        const targetUserId = userId || candidateId || 'unknown';

        const mapped = EVENT_TYPE_MAP[eventType] || {
            type: eventType.toUpperCase(),
            rating: 4,
            detail: detail || 'Proctoring alert logged.',
        };

        const rating = mapped.rating;
        const durationSec = durationMs ? Math.round(durationMs / 1000) : (signals?.duration || 0);

        // ── Deduplication / Merging ──────────────────────────────────────────
        // Check if an active violation of this type already exists recently in DB (within 30 seconds)
        const recentTime = new Date(Date.now() - 30000);
        let violation = await ProctoringViolationEnhanced.findOne({
            examId: targetExamId,
            userId: targetUserId,
            type: mapped.type,
            updatedAt: { $gte: recentTime }
        });

        if (violation) {
            // Merge & update
            violation.endTime = new Date();
            violation.duration += durationSec;
            violation.count += 1;
            if (confidence) {
                violation.maxConfidence = Math.max(violation.maxConfidence || 0, confidence);
            }
            if (signals?.snapshot && !violation.evidenceFrames.includes(signals.snapshot)) {
                if (violation.evidenceFrames.length < 5) {
                    violation.evidenceFrames.push(signals.snapshot);
                }
            }
            violation.proctoringScore = proctoringScore || violation.proctoringScore;
            await violation.save();
            console.log(`[PROCTORING-DEDUPLICATED] Merged violation type ${mapped.type} for exam: ${targetExamId}`);
        } else {
            // Create new
            const evidence = [];
            if (signals?.snapshot) evidence.push(signals.snapshot);
            if (signals?.evidenceFrames && Array.isArray(signals.evidenceFrames)) {
                evidence.push(...signals.evidenceFrames.slice(0, 5));
            }

            violation = await ProctoringViolationEnhanced.create({
                examId: targetExamId,
                userId: targetUserId,
                type: mapped.type,
                detail: detail || mapped.detail,
                count: 1,
                severity: severity || 'medium',
                rating,
                confidence: confidence || null,
                maxConfidence: confidence || null,
                startTime: new Date(),
                endTime: new Date(),
                duration: durationSec,
                evidenceFrames: evidence,
                model: signals?.model || 'FaceMesh',
                proctoringScore: proctoringScore || 100,
                timestamp: new Date()
            });
            console.log(`[PROCTORING-ENHANCED] Logged new violation type ${mapped.type} for exam: ${targetExamId}`);
        }

        // ── Redis Cache-First Update ────────────────────────────────────────
        // Immediately fetch cached report (if exists) and update score locally for instant client retrieval
        const cacheKey = `proctoring:report:${targetExamId}`;
        let cachedReport = await redisService.get(cacheKey);
        
        if (cachedReport) {
            const index = cachedReport.timeline.findIndex(t => String(t._id) === String(violation._id));
            const timelineEntry = {
                _id: violation._id,
                type: violation.type,
                detail: violation.detail,
                timestamp: violation.updatedAt,
                rating: violation.rating,
                startTime: violation.startTime,
                endTime: violation.endTime,
                duration: violation.duration,
                maxConfidence: violation.maxConfidence,
                evidenceFrames: violation.evidenceFrames,
                model: violation.model
            };

            if (index !== -1) {
                cachedReport.timeline[index] = timelineEntry;
            } else {
                cachedReport.timeline.push(timelineEntry);
            }

            cachedReport.totalViolations = cachedReport.timeline.length;
            cachedReport.totalPenaltyRating = cachedReport.timeline.reduce((sum, item) => sum + (item.rating || 0), 0);

            const { status, verdict, summary } = getStatusAndVerdict(cachedReport.totalPenaltyRating);
            cachedReport.status = status;
            cachedReport.verdict = verdict;
            cachedReport.summary = summary;

            await redisService.set(cacheKey, cachedReport, 600);
        }

        // ── BullMQ Background Job ────────────────────────────────────────────
        // Queue the MongoDB report compile worker so it doesn't block Express main thread
        await queueService.addJob('update-report', { examId: targetExamId, userId: targetUserId });

        return res.status(200).json({
            recorded: true,
            examId: targetExamId,
            score: proctoringScore || 100,
            status: cachedReport ? cachedReport.status : 'clean',
        });
    } catch (error) {
        console.error('[PROCTORING REPORT LOG EVENT ERROR]', error);
        return res.status(500).json({ message: 'Failed to log event', error: error.message });
    }
};

/**
 * Log multiple events in batch directly into ProctoringReport
 */
const logBatchEvents = async (req, res) => {
    try {
        const { events, examId, userId, candidateId, assessmentId } = req.body;

        if (!events || !Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ message: 'Missing or empty events array' });
        }

        const targetExamId = examId || `${candidateId || userId}:${assessmentId || 'default'}`;
        const targetUserId = userId || candidateId || 'unknown';

        for (const evt of events) {
            const mapped = EVENT_TYPE_MAP[evt.eventType] || {
                type: (evt.eventType || 'OBJECT_DETECTED').toUpperCase(),
                rating: 4,
                detail: evt.detail || 'Proctoring alert logged.',
            };

            await ProctoringViolationEnhanced.create({
                examId: targetExamId,
                userId: targetUserId,
                type: mapped.type,
                detail: evt.detail || mapped.detail,
                count: 1,
                severity: evt.severity || 'medium',
                rating: mapped.rating,
                confidence: evt.confidence || null,
                maxConfidence: evt.confidence || null,
                startTime: evt.timestamp ? new Date(evt.timestamp) : new Date(),
                endTime: evt.timestamp ? new Date(evt.timestamp) : new Date(),
                duration: evt.duration || 0,
                evidenceFrames: evt.evidenceFrames || [],
                model: evt.model || 'Unknown',
                timestamp: evt.timestamp ? new Date(evt.timestamp) : new Date()
            });
        }

        // Queue report compiling
        await queueService.addJob('update-report', { examId: targetExamId, userId: targetUserId });

        return res.status(200).json({
            recorded: true,
            count: events.length
        });
    } catch (error) {
        console.error('[PROCTORING REPORT BATCH ERROR]', error);
        return res.status(500).json({ message: 'Failed to log batch events', error: error.message });
    }
};

/**
 * Get events timeline for an exam session
 */
const getEventsByExam = async (req, res) => {
    try {
        const { examId } = req.params;
        
        // Cache-First check
        const cacheKey = `proctoring:report:${examId}`;
        const cached = await redisService.get(cacheKey);
        if (cached) {
            return res.status(200).json({ events: cached.timeline || [], count: cached.timeline?.length || 0 });
        }

        const report = await ProctoringReport.findOne({ examId }).lean();

        if (!report) {
            return res.status(200).json({ events: [], count: 0 });
        }

        // Populate cache
        await redisService.set(cacheKey, report, 600);

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
 */
const getSession = async (req, res) => {
    try {
        const { examId } = req.params;

        // Cache-First check
        const cacheKey = `proctoring:report:${examId}`;
        const cached = await redisService.get(cacheKey);
        if (cached) return res.status(200).json(cached);

        const report = await ProctoringReport.findOne({ examId }).lean();

        if (!report) {
            return res.status(404).json({ message: 'Proctoring report not found for this exam.' });
        }

        await redisService.set(cacheKey, report, 600);
        return res.status(200).json(report);
    } catch (error) {
        console.error('[GET REPORT SESSION ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch proctoring report', error: error.message });
    }
};

/**
 * Get current score/status from ProctoringReport
 */
const getScore = async (req, res) => {
    try {
        const { examId } = req.params;

        // Cache-First check
        const cacheKey = `proctoring:report:${examId}`;
        const cached = await redisService.get(cacheKey);
        if (cached) {
            const score = Math.max(0, 100 - Math.round((cached.totalPenaltyRating || 0) * 2.5));
            return res.status(200).json({
                totalPenaltyRating: cached.totalPenaltyRating,
                score,
                status: cached.status,
                verdict: cached.verdict,
            });
        }

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
        
        // Cache report
        await redisService.set(cacheKey, report, 600);

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
 */
const logWarning = async (req, res) => {
    try {
        const { examId, userId, level, message } = req.body;
        const targetExamId = examId || `${userId}:default`;
        const targetUserId = userId || 'unknown';

        const entry = await ProctoringViolationEnhanced.create({
            examId: targetExamId,
            userId: targetUserId,
            type: level === 'auto_submit' ? 'SCREEN_SHARE_STOPPED' : 'OBJECT_DETECTED',
            detail: message || `Escalated warning: ${level}`,
            count: 1,
            severity: level === 'auto_submit' ? 'critical' : 'high',
            rating: level === 'auto_submit' ? 10 : 3,
            startTime: new Date(),
            endTime: new Date(),
            model: 'Browser',
            timestamp: new Date()
        });

        // Queue report compiling
        await queueService.addJob('update-report', { examId: targetExamId, userId: targetUserId });

        return res.status(200).json({ recorded: true, status: 'warning_logged' });
    } catch (error) {
        console.error('[LOG WARNING ERROR]', error);
        return res.status(500).json({ message: 'Failed to log warning', error: error.message });
    }
};

/**
 * Environment Check
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
    updateProctoringReport
};
