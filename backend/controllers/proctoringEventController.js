const ProctoringReport = require('../models/ProctoringReport');
const Application = require('../models/Application');
const ProctoringViolationEnhanced = require('../models/ProctoringViolationEnhanced');
const mongoose = require('mongoose');
const redisService = require('../services/redisService');
const queueService = require('../services/queueService');
const { updateProctoringReport } = require('./proctoringControllerEnhanced');
const {
    getViolationRating,
    getStatusAndVerdict,
    calculateProctoringScore,
    evaluateIntegrity,
    normalizeIncident,
    CANONICAL_EVENT_MAP,
    CANONICAL_CATEGORY_MAP,
} = require('../utils/proctoringScoring');

/**
 * Proctoring Event Controller (Single Collection & Cache-First Mode)
 * ──────────────────────────────────────────────────────────────────────────────
 * Logs proctoring violations, manages Redis caches for session scores,
 * and pushes heavy reports compiling to BullMQ background workers.
 * ──────────────────────────────────────────────────────────────────────────────
 */

/**
 * EVENT_TYPE_MAP
 * ──────────────────────────────────────────────────────────────────────────────
 * Maps every event type string emitted by the frontend detection engines
 * (behaviorEngine.js, useAIProctoring.js, useStrictProctoring.js) to the
 * canonical DB type stored in ProctoringViolationEnhanced plus its rating.
 *
 * Rating scale:
 *   2 = Red Mark  (phone / multiple faces / objects) — maps to REDMARK_VIOLATIONS
 *   1 = Standard flag (eye movement, head turns, tab switches, etc.)
 *
 * IMPORTANT: When adding new frontend event types, add an entry here.
 * ──────────────────────────────────────────────────────────────────────────────
 */
const EVENT_TYPE_MAP = {
    // ── AI presence / face detection ─────────────────────────────────────────
    NO_PEOPLE:                      { type: 'NO_PEOPLE',              rating: 1, detail: 'No face detected in camera frame.' },
    no_face_detected:               { type: 'NO_PEOPLE',              rating: 1, detail: 'No face detected in camera frame.' },
    MULTIPLE_PEOPLE:                { type: 'MULTIPLE_PEOPLE',        rating: 2, detail: 'Multiple faces detected in camera frame.' },
    multiple_faces_detected:        { type: 'MULTIPLE_PEOPLE',        rating: 2, detail: 'Multiple faces detected in camera frame.' },
    person_count_violation:         { type: 'MULTIPLE_PEOPLE',        rating: 2, detail: 'Multiple people detected in camera frame.' },

    // ── AI gaze / eye movement ────────────────────────────────────────────────
    EYE_LOOKING_AWAY:               { type: 'EYE_LOOKING_AWAY',       rating: 1, detail: 'Candidate looked away from screen.' },
    EYE_LOOKING_AWAY_WHILE_ANSWERING: { type: 'EYE_LOOKING_AWAY_WHILE_ANSWERING', rating: 1, detail: 'Candidate looked away while answering.' },
    looking_away:                   { type: 'EYE_LOOKING_AWAY',       rating: 1, detail: 'Candidate looked away from screen.' },
    rapid_gaze_movement:            { type: 'EYE_LOOKING_AWAY',       rating: 1, detail: 'Rapid eye movement pattern detected.' },

    // ── AI head-pose ──────────────────────────────────────────────────────────
    HEAD_TURNED:                    { type: 'HEAD_TURNED',            rating: 1, detail: 'Candidate turned head away.' },
    HEAD_TURNED_WHILE_ANSWERING:    { type: 'HEAD_TURNED_WHILE_ANSWERING', rating: 1, detail: 'Candidate turned head while answering.' },
    head_turned:                    { type: 'HEAD_TURNED',            rating: 1, detail: 'Candidate turned head away.' },
    eyes_closed:                    { type: 'EYE_LOOKING_AWAY',       rating: 1, detail: 'Eyes closed for extended period.' },

    // ── AI phone / object detection ───────────────────────────────────────────
    PHONE_DETECTED:                 { type: 'PHONE_DETECTED',         rating: 2, detail: 'Phone detected in camera frame.' },
    mobile_phone_detected:          { type: 'PHONE_DETECTED',         rating: 2, detail: 'Mobile phone detected in camera frame.' },
    phone_near_face:                { type: 'PHONE_DETECTED',         rating: 2, detail: 'Phone detected near candidate face.' },
    phone_near_ear:                 { type: 'PHONE_DETECTED',         rating: 2, detail: 'Phone detected near candidate ear.' },
    OBJECT_DETECTED:                { type: 'OBJECT_DETECTED',        rating: 2, detail: 'Suspicious object detected in camera frame.' },
    HEADPHONES_DETECTED:            { type: 'HEADPHONES_DETECTED',    rating: 2, detail: 'Earphones/headphones detected.' },
    new_object_appeared:            { type: 'OBJECT_DETECTED',        rating: 2, detail: 'New object appeared in camera frame.' },
    secondary_laptop_detected:      { type: 'OBJECT_DETECTED',        rating: 2, detail: 'Secondary laptop detected.' },
    book_detected:                  { type: 'OBJECT_DETECTED',        rating: 2, detail: 'Book/notes detected in camera frame.' },
    tablet_detected:                { type: 'OBJECT_DETECTED',        rating: 2, detail: 'Tablet device detected.' },
    earphone_detected:              { type: 'HEADPHONES_DETECTED',    rating: 2, detail: 'Earphones detected.' },
    suspicious_object_detected:     { type: 'OBJECT_DETECTED',        rating: 2, detail: 'Suspicious object detected.' },

    // ── AI audio signals ──────────────────────────────────────────────────────
    continuous_talking:             { type: 'EYE_LOOKING_AWAY',       rating: 1, detail: 'Candidate talking continuously (possible prompting).' },
    multiple_voices:                { type: 'MULTIPLE_PEOPLE',        rating: 1, detail: 'Multiple voices detected in audio.' },
    background_noise:               { type: 'OBJECT_DETECTED',        rating: 1, detail: 'Significant background noise detected.' },

    // ── AI hand signals ───────────────────────────────────────────────────────
    hand_near_lap:                  { type: 'OBJECT_DETECTED',        rating: 1, detail: 'Hand detected near lap (possible hidden device).' },
    hand_leaving_frame:             { type: 'OBJECT_DETECTED',        rating: 1, detail: 'Hand leaving camera frame.' },
    environment_change:             { type: 'OBJECT_DETECTED',        rating: 1, detail: 'Environmental change detected.' },

    // ── Browser/tab-level violations ──────────────────────────────────────────
    TAB_SWITCH:                     { type: 'TAB_SWITCH',             rating: 1, detail: 'Candidate switched to another tab.' },
    WINDOW_BLUR:                    { type: 'WINDOW_BLUR',            rating: 1, detail: 'Candidate switched to another application.' },
    KEYBOARD_SHORTCUT:              { type: 'KEYBOARD_SHORTCUT',      rating: 1, detail: 'Blocked keyboard shortcut used.' },
    RIGHT_CLICK:                    { type: 'KEYBOARD_SHORTCUT',      rating: 1, detail: 'Right-click attempted.' },
    SCREEN_SHARE_STOPPED:           { type: 'SCREEN_SHARE_STOPPED',   rating: 1, detail: 'Screen sharing stopped.' },
    FULLSCREEN_EXIT:                { type: 'FULLSCREEN_EXIT',        rating: 1, detail: 'Candidate exited fullscreen mode.' },
    MULTIPLE_DEVICES:               { type: 'MULTIPLE_DEVICES',       rating: 1, detail: 'Multiple display devices detected.' },
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
            rating: 1,
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
                canonicalEventType: CANONICAL_EVENT_MAP[mapped.type] || mapped.type,
                category: CANONICAL_CATEGORY_MAP[CANONICAL_EVENT_MAP[mapped.type] || mapped.type] || 'UNKNOWN',
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
                isAnswering: !!req.body.isAnswering || !!signals?.isAnswering,
                questionId: req.body.questionId || signals?.questionId || null,
                answerId: req.body.answerId || signals?.answerId || null,
                // NOTE: proctoringScore per-violation is informational only.
                // The authoritative score lives in ProctoringReport, calculated from all events.
                proctoringScore: proctoringScore || null,
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
                canonicalEventType: violation.canonicalEventType || CANONICAL_EVENT_MAP[violation.type] || violation.type,
                category: violation.category || CANONICAL_CATEGORY_MAP[CANONICAL_EVENT_MAP[violation.type] || violation.type] || 'UNKNOWN',
                detail: violation.detail,
                timestamp: violation.updatedAt,
                rating: violation.rating,
                startTime: violation.startTime,
                endTime: violation.endTime,
                duration: violation.duration,
                confidence: violation.confidence,
                maxConfidence: violation.maxConfidence,
                evidenceFrames: violation.evidenceFrames,
                model: violation.model,
                isAnswering: violation.isAnswering,
                questionId: violation.questionId,
                answerId: violation.answerId,
                reviewStatus: violation.reviewStatus || 'UNREVIEWED',
            };

            if (index !== -1) {
                cachedReport.timeline[index] = timelineEntry;
            } else {
                cachedReport.timeline.push(timelineEntry);
            }

            const evalResult = evaluateIntegrity(cachedReport.timeline);
            cachedReport.totalViolations = evalResult.totalIncidents;
            cachedReport.totalIncidents = evalResult.totalIncidents;
            cachedReport.standardIncidents = evalResult.standardIncidents;
            cachedReport.criticalIncidents = evalResult.criticalIncidents;
            cachedReport.totalPenaltyRating = evalResult.totalPenaltyRating;
            cachedReport.proctoringScore = evalResult.integrityScore;
            cachedReport.integrityScore = evalResult.integrityScore;
            cachedReport.riskLevel = evalResult.riskLevel;
            cachedReport.scoreVersion = evalResult.scoreVersion;
            cachedReport.scoreFactors = evalResult.scoreFactors;
            cachedReport.eventSummary = evalResult.eventSummary;
            cachedReport.status = evalResult.status;
            cachedReport.verdict = evalResult.verdict;
            cachedReport.summary = evalResult.summary;

            await redisService.set(cacheKey, cachedReport, 600);
        }

        // ── BullMQ Background Job ────────────────────────────────────────────
        // Queue the MongoDB report compile worker so it doesn't block Express main thread
        await queueService.addJob('update-report', { examId: targetExamId, userId: targetUserId });

        // Use centralized formula. If cache not yet populated, the score will be
        // recalculated after the background job compiles the ProctoringReport.
        const calculatedScore = cachedReport ? cachedReport.integrityScore : null;

        return res.status(200).json({
            recorded: true,
            examId: targetExamId,
            score: calculatedScore,
            integrityScore: calculatedScore,
            riskLevel: cachedReport ? cachedReport.riskLevel : 'LOW_RISK',
            scoreVersion: 'v2',
            totalIncidents: cachedReport ? cachedReport.totalIncidents : 1,
            criticalIncidents: cachedReport ? cachedReport.criticalIncidents : (rating === 2 ? 1 : 0),
            standardIncidents: cachedReport ? cachedReport.standardIncidents : (rating === 1 ? 1 : 0),
            status: cachedReport ? cachedReport.status : 'clean',
            verdict: cachedReport ? cachedReport.verdict : 'Seriousness Verified',
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
                rating: 1,
                detail: evt.detail || 'Proctoring alert logged.',
            };

            await ProctoringViolationEnhanced.create({
                examId: targetExamId,
                userId: targetUserId,
                type: mapped.type,
                canonicalEventType: CANONICAL_EVENT_MAP[mapped.type] || mapped.type,
                category: CANONICAL_CATEGORY_MAP[CANONICAL_EVENT_MAP[mapped.type] || mapped.type] || 'UNKNOWN',
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
                isAnswering: !!evt.isAnswering,
                questionId: evt.questionId || null,
                answerId: evt.answerId || null,
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
            const score = cached.integrityScore !== undefined
                ? cached.integrityScore
                : (cached.proctoringScore !== undefined ? cached.proctoringScore : calculateProctoringScore(cached.totalPenaltyRating));
            return res.status(200).json({
                totalPenaltyRating: cached.totalPenaltyRating,
                score,
                integrityScore: score,
                riskLevel: cached.riskLevel || 'LOW_RISK',
                scoreVersion: cached.scoreVersion || 'v2',
                totalIncidents: cached.totalIncidents || cached.totalViolations || 0,
                standardIncidents: cached.standardIncidents || 0,
                criticalIncidents: cached.criticalIncidents || 0,
                eventSummary: cached.eventSummary || {},
                scoreFactors: cached.scoreFactors || [],
                status: cached.status,
                verdict: cached.verdict,
                analysisStatus: 'COMPLETED',
            });
        }

        const report = await ProctoringReport.findOne({ examId }).lean();

        if (!report) {
            // No violations logged yet — return null score so dashboard can distinguish
            return res.status(200).json({
                totalPenaltyRating: 0,
                score: null,
                integrityScore: null,
                riskLevel: 'LOW_RISK',
                scoreVersion: 'v2',
                totalIncidents: 0,
                standardIncidents: 0,
                criticalIncidents: 0,
                eventSummary: {},
                scoreFactors: ['No proctoring data recorded.'],
                status: 'clean',
                verdict: 'No proctoring data recorded.',
                analysisStatus: 'NOT_STARTED',
            });
        }

        // Cache report
        await redisService.set(cacheKey, report, 600);

        const score = report.integrityScore !== undefined
            ? report.integrityScore
            : (report.proctoringScore !== undefined ? report.proctoringScore : calculateProctoringScore(report.totalPenaltyRating));

        return res.status(200).json({
            totalPenaltyRating: report.totalPenaltyRating,
            score,
            integrityScore: score,
            riskLevel: report.riskLevel || 'LOW_RISK',
            scoreVersion: report.scoreVersion || 'v2',
            totalIncidents: report.totalIncidents || report.totalViolations || 0,
            standardIncidents: report.standardIncidents || 0,
            criticalIncidents: report.criticalIncidents || 0,
            eventSummary: report.eventSummary || {},
            scoreFactors: report.scoreFactors || [],
            status: report.status,
            verdict: report.verdict,
            analysisStatus: 'COMPLETED',
        });
    } catch (error) {
        console.error('[GET REPORT SCORE ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch proctoring report score', error: error.message });
    }
};

/**
 * Get detailed score breakdown (Requirement 44)
 * GET /api/proctoring-pipeline/score-breakdown/:examId
 */
const getScoreBreakdown = async (req, res) => {
    try {
        const { examId } = req.params;
        const report = await ProctoringReport.findOne({ examId }).lean();
        if (!report) {
            return res.status(200).json({
                integrityScore: 100,
                proctoringScore: 100,
                riskLevel: 'LOW_RISK',
                scoreVersion: 'v2',
                totalIncidents: 0,
                standardIncidents: 0,
                criticalIncidents: 0,
                eventSummary: {},
                criticalEvents: [],
                scoreFactors: ['No proctoring violations recorded for this session.'],
            });
        }

        const criticalEvents = (report.timeline || [])
            .filter(t => t.severity === 'CRITICAL' || t.rating === 2)
            .map(t => ({
                type: t.canonicalEventType || t.type,
                confidence: t.confidence || t.maxConfidence || null,
                duration: t.duration || 0,
                evidenceAvailable: !!(t.evidenceFrames && t.evidenceFrames.length > 0),
                timestamp: t.timestamp,
                detail: t.detail,
            }));

        return res.status(200).json({
            integrityScore: report.integrityScore !== undefined ? report.integrityScore : report.proctoringScore,
            proctoringScore: report.proctoringScore,
            riskLevel: report.riskLevel || 'LOW_RISK',
            scoreVersion: report.scoreVersion || 'v2',
            totalIncidents: report.totalIncidents || report.totalViolations || 0,
            standardIncidents: report.standardIncidents || 0,
            criticalIncidents: report.criticalIncidents || 0,
            eventSummary: report.eventSummary || {},
            criticalEvents,
            scoreFactors: report.scoreFactors || [],
            reviewStatus: report.reviewStatus || 'UNREVIEWED',
        });
    } catch (error) {
        console.error('[GET SCORE BREAKDOWN ERROR]', error);
        return res.status(500).json({ message: 'Failed to fetch score breakdown', error: error.message });
    }
};

/**
 * Submit human review decision for an incident or whole exam (Requirement 34)
 * POST /api/proctoring-pipeline/review/:examId
 */
const submitHumanReview = async (req, res) => {
    try {
        const { examId } = req.params;
        const { reviewStatus, reviewReason, violationId } = req.body;
        const reviewerId = req.headers ? (req.headers['x-user-id'] || req.headers['x-h1p-user-id']) : 'recruiter';

        if (!['UNREVIEWED', 'CONFIRMED_CONCERN', 'DISMISSED', 'REVIEWED'].includes(reviewStatus)) {
            return res.status(400).json({ message: 'Invalid reviewStatus value' });
        }

        const now = new Date();

        if (violationId) {
            await ProctoringViolationEnhanced.findByIdAndUpdate(violationId, {
                reviewStatus,
                reviewReason: reviewReason || '',
                reviewedBy: reviewerId,
                reviewedAt: now,
            });
        }

        const updatedReport = await ProctoringReport.findOneAndUpdate(
            { examId },
            {
                reviewStatus,
                reviewReason: reviewReason || '',
                reviewedBy: reviewerId,
                reviewedAt: now,
                ...(violationId ? { 'timeline.$[elem].reviewStatus': reviewStatus, 'timeline.$[elem].reviewReason': reviewReason || '' } : {})
            },
            {
                new: true,
                arrayFilters: violationId ? [{ 'elem._id': violationId }] : undefined
            }
        );

        // Invalidate Redis cache
        const cacheKey = `proctoring:report:${examId}`;
        await redisService.del(cacheKey);

        return res.status(200).json({
            success: true,
            reviewStatus,
            reviewReason,
            reviewedAt: now,
            report: updatedReport,
        });
    } catch (error) {
        console.error('[SUBMIT HUMAN REVIEW ERROR]', error);
        return res.status(500).json({ message: 'Failed to submit human review', error: error.message });
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
            severity: level === 'auto_submit' ? 'critical' : 'medium',
            rating: level === 'auto_submit' ? 2 : 1,
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
    getScoreBreakdown,
    submitHumanReview,
    logWarning,
    environmentCheck,
    getPipelineSummary,
    updateProctoringReport
};
