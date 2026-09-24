/**
 * Proctoring Scoring Utility (v2)
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralised, authoritative scoring and risk classification helpers for all
 * proctoring controllers and background workers.
 *
 * Scoring Formula:
 *   integrityScore = max(0, min(100, 100 - round(totalPenaltyRating * 2.5)))
 *
 * Penalty Tiers:
 *   Critical / Red Mark (phone, multiple faces, objects, headphones) → rating 2
 *   Standard (gaze, head turns, tab switch, window blur, fullscreen) → rating 1
 *
 * Risk Classification:
 *   LOW RISK         (0–5 penalty, no high-confidence critical evidence)
 *   REVIEW REQUIRED  (6–12 penalty, or high-confidence critical signal with evidence)
 *   HIGH RISK        (>12 penalty, multiple critical signals, or high-risk combinations)
 * ──────────────────────────────────────────────────────────────────────────────
 */

const PROCTORING_SCORING_CONFIG = {
    standardPenalty: 1,
    criticalPenalty: 2,
    answeringMultiplier: 3.0,
    thresholds: {
        lowRiskMaxPenalty: 5,
        reviewRequiredMaxPenalty: 12,
    },
    // Configurable behavioral episode parameters for natural movements (eye gaze, head turns)
    behavioralScoring: {
        windowSeconds: 60,               // Rolling window to evaluate repeated natural movement clusters
        graceCount: 3,                   // 1–3 isolated events within window = natural grace zone (minimal/individual impact)
        episodeBasePenalty: 2,           // Base penalty rating points when an episode exceeds grace threshold
        excessMultiplier: 0.4,           // Incremental penalty rating per event beyond grace count in same episode
        maxEpisodePenalty: 5,            // Maximum penalty rating points an individual episode can produce
        behavioralPenaltyRatingCap: 10,  // Hard ceiling: max 10 penalty rating points (10 * 2.5 = 25% max deduction)
    },
    confidenceThresholds: {
        minConfidenceForEscalation: 0.70,
        subThresholdDuration: 1.5,
        subThresholdConfidence: 0.50,
    },
    criticalOverrides: {
        criticalEventsForHighRisk: 2,
        singleCriticalWithEvidenceIsHighRisk: true,
    },
    combinationRules: [
        {
            events: ['PHONE_DETECTED', 'MULTIPLE_PEOPLE'],
            escalateTo: 'HIGH RISK',
            reason: 'Phone detected alongside multiple people in camera frame.',
        },
        {
            events: ['PHONE_DETECTED', 'SCREEN_SHARE_STOPPED'],
            escalateTo: 'HIGH RISK',
            reason: 'Phone detected concurrently with screen share interruption.',
        },
        {
            events: ['PHONE_DETECTED', 'TAB_SWITCH'],
            escalateTo: 'HIGH RISK',
            reason: 'Phone detected alongside browser tab switching activity.',
        },
        {
            events: ['MULTIPLE_PEOPLE', 'SCREEN_SHARE_STOPPED'],
            escalateTo: 'HIGH RISK',
            reason: 'Multiple people present with screen share interruption.',
        },
        {
            events: ['NO_PEOPLE', 'MULTIPLE_PEOPLE'],
            escalateTo: 'HIGH RISK',
            reason: 'Candidate absence followed by second person detected.',
        },
    ],
};

const CANONICAL_CATEGORIES = {
    BEHAVIORAL: 'BEHAVIORAL',
    ENVIRONMENT: 'ENVIRONMENT',
    BROWSER: 'BROWSER',
    SCREEN: 'SCREEN',
};

const CANONICAL_EVENT_MAP = {
    // Phone Detections
    PHONE_DETECTED: 'PHONE_DETECTED',
    mobile_phone_detected: 'PHONE_DETECTED',
    phone_near_face: 'PHONE_DETECTED',
    phone_near_ear: 'PHONE_DETECTED',

    // Impersonation
    IMPERSONATION_DETECTED: 'IMPERSONATION_DETECTED',
    impersonation_detected: 'IMPERSONATION_DETECTED',
    face_mismatch: 'IMPERSONATION_DETECTED',

    // Multiple Faces / People Detections
    MULTIPLE_PEOPLE: 'MULTIPLE_PEOPLE',
    MULTIPLE_FACES_DETECTED: 'MULTIPLE_PEOPLE',
    multiple_faces_detected: 'MULTIPLE_PEOPLE',
    person_count_violation: 'MULTIPLE_PEOPLE',
    multiple_voices: 'MULTIPLE_PEOPLE',
    MULTIPLE_VOICES_DETECTED: 'MULTIPLE_PEOPLE',
    multiple_voices_detected: 'MULTIPLE_PEOPLE',
    NO_PEOPLE: 'NO_PEOPLE',
    NO_FACE_DETECTED: 'NO_PEOPLE',
    no_face_detected: 'NO_PEOPLE',

    // Headphones Detections
    HEADPHONES_DETECTED: 'HEADPHONES_DETECTED',
    earphone_detected: 'HEADPHONES_DETECTED',

    // Object Detections
    OBJECT_DETECTED: 'OBJECT_DETECTED',
    DEVICE_DETECTED: 'OBJECT_DETECTED',
    device_detected: 'OBJECT_DETECTED',
    LIGHTING_ANOMALY: 'LIGHTING_ANOMALY',
    lighting_anomaly: 'LIGHTING_ANOMALY',
    book_detected: 'OBJECT_DETECTED',
    bottle_detected: 'OBJECT_DETECTED',
    pen_detected: 'OBJECT_DETECTED',
    pencil_detected: 'OBJECT_DETECTED',
    tablet_detected: 'OBJECT_DETECTED',
    secondary_laptop_detected: 'OBJECT_DETECTED',
    suspicious_object_detected: 'OBJECT_DETECTED',
    new_object_appeared: 'OBJECT_DETECTED',
    hand_near_lap: 'OBJECT_DETECTED',
    hand_leaving_frame: 'OBJECT_DETECTED',
    background_noise: 'OBJECT_DETECTED',
    environment_change: 'OBJECT_DETECTED',

    // Gaze
    EYE_LOOKING_AWAY: 'EYE_LOOKING_AWAY',
    LOOKING_AWAY: 'EYE_LOOKING_AWAY',
    looking_away: 'EYE_LOOKING_AWAY',
    rapid_gaze_movement: 'EYE_LOOKING_AWAY',
    eyes_closed: 'EYE_LOOKING_AWAY',
    EYE_LOOKING_AWAY_WHILE_ANSWERING: 'EYE_LOOKING_AWAY_WHILE_ANSWERING',

    // Head
    HEAD_TURNED: 'HEAD_TURNED',
    head_turned: 'HEAD_TURNED',
    HEAD_TURNED_WHILE_ANSWERING: 'HEAD_TURNED_WHILE_ANSWERING',

    // Audio
    continuous_talking: 'TALKING',
    TALKING: 'TALKING',

    // Browser
    TAB_SWITCH: 'TAB_SWITCH',
    WINDOW_BLUR: 'WINDOW_BLUR',
    FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
    KEYBOARD_SHORTCUT: 'KEYBOARD_SHORTCUT',
    RIGHT_CLICK: 'KEYBOARD_SHORTCUT',

    // Screen
    SCREEN_SHARE_STOPPED: 'SCREEN_SHARE_STOPPED',
    MULTIPLE_DEVICES: 'MULTIPLE_DEVICES',
};

const CANONICAL_CATEGORY_MAP = {
    PHONE_DETECTED: CANONICAL_CATEGORIES.ENVIRONMENT,
    IMPERSONATION_DETECTED: CANONICAL_CATEGORIES.ENVIRONMENT,
    MULTIPLE_PEOPLE: CANONICAL_CATEGORIES.ENVIRONMENT,
    HEADPHONES_DETECTED: CANONICAL_CATEGORIES.ENVIRONMENT,
    OBJECT_DETECTED: CANONICAL_CATEGORIES.ENVIRONMENT,
    LIGHTING_ANOMALY: CANONICAL_CATEGORIES.ENVIRONMENT,

    EYE_LOOKING_AWAY: CANONICAL_CATEGORIES.BEHAVIORAL,
    EYE_LOOKING_AWAY_WHILE_ANSWERING: CANONICAL_CATEGORIES.BEHAVIORAL,
    HEAD_TURNED: CANONICAL_CATEGORIES.BEHAVIORAL,
    HEAD_TURNED_WHILE_ANSWERING: CANONICAL_CATEGORIES.BEHAVIORAL,
    NO_PEOPLE: CANONICAL_CATEGORIES.BEHAVIORAL,
    TALKING: CANONICAL_CATEGORIES.BEHAVIORAL,

    TAB_SWITCH: CANONICAL_CATEGORIES.BROWSER,
    WINDOW_BLUR: CANONICAL_CATEGORIES.BROWSER,
    FULLSCREEN_EXIT: CANONICAL_CATEGORIES.BROWSER,
    KEYBOARD_SHORTCUT: CANONICAL_CATEGORIES.BROWSER,

    SCREEN_SHARE_STOPPED: CANONICAL_CATEGORIES.SCREEN,
    MULTIPLE_DEVICES: CANONICAL_CATEGORIES.SCREEN,
};

const REDMARK_VIOLATIONS = new Set([
    // Phone Detections
    'PHONE_DETECTED',
    'mobile_phone_detected',
    'phone_near_face',
    'phone_near_ear',

    // Impersonation
    'IMPERSONATION_DETECTED',
    'impersonation_detected',
    'face_mismatch',

    // Multiple Faces / People Detections
    'MULTIPLE_PEOPLE',
    'MULTIPLE_FACES_DETECTED',
    'multiple_faces_detected',
    'person_count_violation',
    'multiple_voices',
    'MULTIPLE_VOICES_DETECTED',
    'multiple_voices_detected',

    // Object Detections
    'OBJECT_DETECTED',
    'DEVICE_DETECTED',
    'device_detected',
    'HEADPHONES_DETECTED',
    'earphone_detected',
    'book_detected',
    'bottle_detected',
    'pen_detected',
    'pencil_detected',
    'tablet_detected',
    'secondary_laptop_detected',
    'suspicious_object_detected',
    'new_object_appeared',
    'SECONDARY_SCREEN_DETECTED',
    'SCREEN_SHARE_STOPPED',
]);

/**
 * Natural behavioral movement events (eye gaze & head position) that can repeat
 * naturally during normal assessment activities (reading, typing, thinking).
 * These are grouped into temporal episodes during Integrity Score calculation.
 */
const NATURAL_BEHAVIORAL_EVENTS = new Set([
    'EYE_LOOKING_AWAY',
    'EYE_LOOKING_AWAY_WHILE_ANSWERING',
    'LOOKING_AWAY',
    'looking_away',
    'rapid_gaze_movement',
    'eyes_closed',
    'HEAD_TURNED',
    'head_turned',
    'HEAD_TURNED_WHILE_ANSWERING',
]);

/**
 * Group repetitive natural behavioral incidents (gaze deviations, head turns)
 * into coherent temporal episodes in-memory for integrity scoring.
 *
 * This prevents repeated 3-second camera sampling flags from causing artificial
 * score collapse (e.g. 131 raw events reducing score to 0), while ensuring
 * genuine patterns are penalized in a controlled, capped manner.
 *
 * @param {Array<Object>} naturalIncidents - Normalized natural behavioral incidents
 * @param {Object} behavioralConfig - Config parameters
 * @param {number} answeringMultiplier - Context multiplier for active answering
 * @returns {{ effectivePenaltyRating: number, totalRawPenaltyRating: number, episodeCount: number, episodes: Array<Object> }}
 */
const groupBehavioralIncidents = (naturalIncidents = [], behavioralConfig = {}, answeringMultiplier = 2.5) => {
    if (!Array.isArray(naturalIncidents) || naturalIncidents.length === 0) {
        return { effectivePenaltyRating: 0, totalRawPenaltyRating: 0, episodeCount: 0, episodes: [] };
    }

    const {
        windowSeconds = 60,
        graceCount = 3,
        episodeBasePenalty = 2,
        excessMultiplier = 0.4,
        maxEpisodePenalty = 5,
        behavioralPenaltyRatingCap = 10,
    } = behavioralConfig;

    // Sort chronologically by timestamp safely
    const sorted = [...naturalIncidents].sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (new Date(a.timestamp || 0)).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (new Date(b.timestamp || 0)).getTime();
        return timeA - timeB;
    });

    const windowMs = windowSeconds * 1000;
    const episodes = [];
    let currentEpisode = null;

    for (const inc of sorted) {
        const incTime = inc.timestamp instanceof Date ? inc.timestamp.getTime() : (new Date(inc.timestamp || 0)).getTime();

        if (!currentEpisode) {
            currentEpisode = {
                startTime: incTime,
                lastTime: incTime,
                incidents: [inc],
                isAnswering: Boolean(inc.isAnswering),
                types: new Set([inc.canonicalEventType || inc.eventType]),
            };
        } else {
            const timeDiff = Math.abs(incTime - currentEpisode.lastTime);
            const withinTimeWindow = timeDiff <= windowMs;
            const withinCountLimit = currentEpisode.incidents.length < 15;

            if (withinTimeWindow && withinCountLimit) {
                currentEpisode.incidents.push(inc);
                currentEpisode.lastTime = Math.max(currentEpisode.lastTime, incTime);
                if (inc.isAnswering) currentEpisode.isAnswering = true;
                currentEpisode.types.add(inc.canonicalEventType || inc.eventType);
            } else {
                episodes.push(currentEpisode);
                currentEpisode = {
                    startTime: incTime,
                    lastTime: incTime,
                    incidents: [inc],
                    isAnswering: Boolean(inc.isAnswering),
                    types: new Set([inc.canonicalEventType || inc.eventType]),
                };
            }
        }
    }

    if (currentEpisode) {
        episodes.push(currentEpisode);
    }

    let totalPenaltyRating = 0;

    for (const ep of episodes) {
        const count = ep.incidents.length;
        let epPenalty = 0;

        if (count <= graceCount) {
            // Grace zone: 1 to 3 isolated natural movements (e.g. brief glances, thinking)
            // Each event contributes its standard base penalty with answering context
            for (const inc of ep.incidents) {
                const w = inc.isAnswering ? answeringMultiplier : 1.0;
                epPenalty += (inc.basePenalty || 1) * w;
            }
        } else {
            // Exceeded grace count: active repeated behavioral pattern episode
            const excess = count - graceCount;
            const patternPenalty = episodeBasePenalty + Math.min(maxEpisodePenalty - episodeBasePenalty, excess * excessMultiplier);
            const w = ep.isAnswering ? answeringMultiplier : 1.0;
            epPenalty = patternPenalty * w;
        }

        ep.calculatedPenalty = epPenalty;
        totalPenaltyRating += epPenalty;
    }

    // Apply hard ceiling cap on behavioral penalty rating (max deduction = cap * 2.5)
    const effectivePenaltyRating = Math.min(behavioralPenaltyRatingCap, Math.round(totalPenaltyRating));

    return {
        effectivePenaltyRating,
        totalRawPenaltyRating: Math.round(totalPenaltyRating),
        episodeCount: episodes.length,
        episodes,
    };
};

/**
 * Return the rating penalty (1 or 2) for a given violation type.
 * @param {string} type  - Violation type string (e.g. 'PHONE_DETECTED')
 * @param {Object} [metadata]
 * @returns {number} 1 or 2
 */
const getViolationRating = (type, metadata) => {
    if (!type) return 1;
    return REDMARK_VIOLATIONS.has(type) ? 2 : 1;
};

/**
 * Calculate the authoritative proctoring score from total penalty rating.
 * Formula: score = max(0, min(100, 100 - round(totalPenaltyRating * 2.5)))
 * @param {number} totalPenaltyRating
 * @returns {number} Integer 0–100
 */
const calculateProctoringScore = (totalPenaltyRating) => {
    return Math.max(0, Math.min(100, 100 - Math.round((totalPenaltyRating || 0) * 2.5)));
};

/**
 * Sanitize a violation detail string for consistent recruiter display.
 * Strips raw metric tokens (ratio, confidence) and ensures a Ranking tag is present.
 *
 * @param {string} type   - Violation type (unused here, kept for signature parity)
 * @param {string} detail - Raw detail string from frontend or detection engine
 * @param {number} rating - Penalty rating (1 or 2)
 * @returns {string}
 */
const sanitizeViolationDetail = (type, detail, rating) => {
    if (!detail) return '';
    let cleanDetail = String(detail)
        .replace(/\s*\(ratio:\s*[^)]+\)/gi, '')
        .replace(/\s*\(confidence:\s*[^)]+\)/gi, '');

    if (!cleanDetail.endsWith('.')) {
        cleanDetail += '.';
    }

    if (!cleanDetail.includes('(Ranking:')) {
        cleanDetail += ` (Ranking: ${rating || 1})`;
    }
    return cleanDetail;
};

/**
 * Derive a human-readable status, verdict, and summary from a total penalty rating.
 * Preserved for v1 backward compatibility.
 *
 * @param {number} totalPenaltyRating - Sum of all violation ratings for a session
 * @returns {{ status: string, verdict: string, summary: string }}
 */
const getStatusAndVerdict = (totalPenaltyRating) => {
    const rating = totalPenaltyRating || 0;

    if (rating <= 0) {
        return {
            status: 'clean',
            verdict: 'High Trust (Verified Honest)',
            summary: 'No anomalies detected. Candidate followed rules during the assessment.',
        };
    }
    if (rating <= 12) {
        return {
            status: 'low_risk',
            verdict: 'High Trust (Minor Alerts)',
            summary: 'A few minor alerts recorded. Candidate followed rules during all assessment rounds.',
        };
    }
    if (rating <= 16) {
        return {
            status: 'recommended',
            verdict: 'Recommended (Minor Alerts)',
            summary: 'Candidate took the test well with minor alerts recorded. Recommended to proceed.',
        };
    }
    if (rating <= 20) {
        return {
            status: 'suspicious',
            verdict: 'Review Recommended',
            summary: 'Multiple alerts recorded during session. Recruiter inspection of flagged timestamps advised.',
        };
    }
    return {
        status: 'critical',
        verdict: 'High Risk (Suspected Cheating)',
        summary: 'Critical violations or heavy anomaly aggregate detected. Detailed review strongly warranted.',
    };
};

/**
 * Normalize an individual violation/event into the canonical incident model.
 *
 * @param {Object} raw - Raw violation record or event payload
 * @returns {Object} Normalized canonical incident
 */
const normalizeIncident = (raw) => {
    if (!raw) return null;
    const rawType = raw.type || raw.eventType || 'OBJECT_DETECTED';
    const canonicalEventType = CANONICAL_EVENT_MAP[rawType] || rawType;
    const category = CANONICAL_CATEGORY_MAP[canonicalEventType] || 'ENVIRONMENT';
    const isCritical = (raw.severity && raw.severity.toLowerCase() === 'critical') ||
        REDMARK_VIOLATIONS.has(rawType) || 
        REDMARK_VIOLATIONS.has(canonicalEventType);
    const severity = isCritical ? 'CRITICAL' : 'STANDARD';

    // Confidence normalized strictly to 0.0 - 1.0 (null if unavailable)
    let confidence = null;
    if (typeof raw.confidence === 'number' && !isNaN(raw.confidence)) {
        confidence = raw.confidence > 1 ? Math.min(1, raw.confidence / 100) : Math.max(0, raw.confidence);
    } else if (typeof raw.maxConfidence === 'number' && !isNaN(raw.maxConfidence)) {
        confidence = raw.maxConfidence > 1 ? Math.min(1, raw.maxConfidence / 100) : Math.max(0, raw.maxConfidence);
    }

    const duration = typeof raw.duration === 'number' && !isNaN(raw.duration) ? raw.duration : 0;
    const evidenceFrames = Array.isArray(raw.evidenceFrames) ? raw.evidenceFrames : [];

    // Filter sub-threshold noise
    let isSignificant = true;
    if (!isCritical) {
        if (duration > 0 && duration < 1.5 && confidence !== null && confidence < 0.5) {
            isSignificant = false;
        }
    }

    let basePenalty = isCritical ? PROCTORING_SCORING_CONFIG.criticalPenalty : PROCTORING_SCORING_CONFIG.standardPenalty;
    let rating = isCritical ? 2 : 1;

    // Multi-camera benign peripheral is not a violation
    if (rawType === 'MULTIPLE_DEVICES' && (/camera/i.test(raw.detail) || raw.metadata?.cameraCount)) {
        isSignificant = false;
        basePenalty = 0;
        rating = 0;
    }

    if (!isSignificant) {
        basePenalty = 0;
        rating = 0;
    }

    return {
        incidentId: raw._id ? String(raw._id) : (raw.id ? String(raw.id) : null),
        sessionId: raw.examId || raw.sessionId || null,
        candidateId: raw.userId || raw.candidateId || null,
        eventType: rawType,
        canonicalEventType,
        category,
        timestamp: raw.timestamp ? new Date(raw.timestamp) : (raw.createdAt ? new Date(raw.createdAt) : new Date()),
        startTime: raw.startTime ? new Date(raw.startTime) : (raw.timestamp ? new Date(raw.timestamp) : new Date()),
        endTime: raw.endTime ? new Date(raw.endTime) : (raw.timestamp ? new Date(raw.timestamp) : new Date()),
        duration,
        severity,
        basePenalty,
        rating,
        isSignificant,
        confidence,
        maxConfidence: confidence,
        occurrenceCount: raw.count || 1,
        evidenceFrames,
        evidenceAvailable: evidenceFrames.length > 0,
        source: raw.model || 'Detector',
        context: raw.metadata || null,
        status: raw.reviewStatus || 'UNREVIEWED',
        isAnswering: !!raw.isAnswering,
        questionId: raw.questionId || null,
        answerId: raw.answerId || null,
        detail: sanitizeViolationDetail(rawType, raw.detail, basePenalty),
    };
};

/**
 * Authoritative Scoring Engine (v2)
 *
 * Evaluates an array of proctoring events/violations, normalizes them into
 * canonical incidents, computes the authoritative Proctoring Integrity Score (0–100),
 * aggregates critical/standard counts, resolves event combinations, applies controlled
 * critical signal escalations, and produces explainable score factors.
 *
 * @param {Array<Object>} violationsOrEvents
 * @param {Object} [options]
 * @returns {Object} Full integrity evaluation report
 */
const evaluateIntegrity = (violationsOrEvents = [], options = {}) => {
    const config = { ...PROCTORING_SCORING_CONFIG, ...options.config };
    const rawList = Array.isArray(violationsOrEvents) ? violationsOrEvents : [];

    const incidents = rawList.map(v => normalizeIncident(v)).filter(Boolean);

    // Filter out non-significant and false camera device violations
    const validIncidents = incidents.filter(inc => {
        if (!inc.isSignificant && inc.rating === 0) return false;
        if (inc.canonicalEventType === 'MULTIPLE_DEVICES' && (/camera/i.test(inc.detail) || inc.context?.cameraCount)) {
            return false;
        }
        return true;
    });

    // ── Separate Natural Behavioral Movements from Non-Behavioral / Critical Events ──
    const naturalIncidents = [];
    const nonBehavioralIncidents = [];

    for (const inc of validIncidents) {
        if (NATURAL_BEHAVIORAL_EVENTS.has(inc.canonicalEventType) || NATURAL_BEHAVIORAL_EVENTS.has(inc.eventType)) {
            naturalIncidents.push(inc);
        } else {
            nonBehavioralIncidents.push(inc);
        }
    }

    // 1. Evaluate natural behavioral events with in-memory temporal episode grouping & hard cap
    const behavioralResult = groupBehavioralIncidents(
        naturalIncidents,
        config.behavioralScoring,
        config.answeringMultiplier || 2.5
    );

    // 2. Evaluate non-behavioral & critical events directly (individual weights, not grouped as natural glances)
    let nonBehavioralPenaltyRating = 0;
    for (const inc of nonBehavioralIncidents) {
        const weight = inc.isAnswering ? (config.answeringMultiplier || 2.5) : 1.0;
        nonBehavioralPenaltyRating += Math.round((inc.basePenalty || 1) * weight);
    }

    // Combined effective penalty rating for integrity calculation
    const totalPenaltyRating = behavioralResult.effectivePenaltyRating + nonBehavioralPenaltyRating;

    // Authoritative Integrity Score calculated from controlled effective penalty rating
    let integrityScore = calculateProctoringScore(totalPenaltyRating);

    let criticalIncidents = 0;
    let standardIncidents = 0;
    const eventSummary = {};
    const presentCanonicalTypes = new Set();
    let hasHighConfidenceCriticalWithEvidence = false;
    let highestConfidenceEvent = null;

    for (const inc of validIncidents) {
        if (inc.severity === 'CRITICAL') {
            criticalIncidents += 1;
            if ((inc.confidence === null || inc.confidence >= config.confidenceThresholds.minConfidenceForEscalation) && (inc.evidenceAvailable || inc.isAnswering)) {
                hasHighConfidenceCriticalWithEvidence = true;
            }
        } else {
            standardIncidents += 1;
        }

        eventSummary[inc.canonicalEventType] = (eventSummary[inc.canonicalEventType] || 0) + 1;
        presentCanonicalTypes.add(inc.canonicalEventType);

        if (inc.confidence !== null) {
            if (!highestConfidenceEvent || inc.confidence > (highestConfidenceEvent.confidence || 0)) {
                highestConfidenceEvent = {
                    type: inc.canonicalEventType,
                    confidence: inc.confidence,
                    duration: inc.duration,
                    evidenceAvailable: inc.evidenceAvailable,
                };
            }
        }
    }

    // Build explainable score factors
    const scoreFactors = [];

    if (naturalIncidents.length > 0) {
        const cap = config.behavioralScoring?.behavioralPenaltyRatingCap || 10;
        if (behavioralResult.effectivePenaltyRating >= cap) {
            scoreFactors.push(`${naturalIncidents.length} natural movement(s) reached maximum behavioral deduction ceiling (-${behavioralResult.effectivePenaltyRating * 2.5}%)`);
        } else {
            scoreFactors.push(`${naturalIncidents.length} natural movement(s) grouped into ${behavioralResult.episodeCount} behavioral episode(s) (-${behavioralResult.effectivePenaltyRating * 2.5}%)`);
        }
    }

    if (nonBehavioralIncidents.length > 0) {
        const standardNonBehav = nonBehavioralIncidents.filter(i => i.severity !== 'CRITICAL').length;
        if (standardNonBehav > 0) {
            scoreFactors.push(`${standardNonBehav} standard browser/incident(s) recorded`);
        }
    }

    // Critical signal handling & escalation:
    // High-confidence critical events (phone, multiple people) cap score at 45% (strictly < 50% High Risk)
    if (hasHighConfidenceCriticalWithEvidence || criticalIncidents >= config.criticalOverrides.criticalEventsForHighRisk) {
        scoreFactors.push(`${criticalIncidents} critical incident(s) detected with verified evidence (escalated to HIGH RISK)`);
        integrityScore = Math.min(integrityScore, 45);
    } else if (criticalIncidents > 0) {
        scoreFactors.push(`${criticalIncidents} critical incident(s) detected`);
        integrityScore = Math.min(integrityScore, 58);
    }

    // Combination rules check (deterministic, non-double-counting)
    if (config.combinationRules && Array.isArray(config.combinationRules)) {
        for (const rule of config.combinationRules) {
            const matchesAll = rule.events.every(evt => presentCanonicalTypes.has(evt));
            if (matchesAll) {
                if (rule.escalateTo === 'HIGH RISK' || rule.escalateTo === 'HIGH_RISK') {
                    integrityScore = Math.min(integrityScore, 45);
                } else if ((rule.escalateTo === 'REVIEW REQUIRED' || rule.escalateTo === 'REVIEW_REQUIRED')) {
                    integrityScore = Math.min(integrityScore, 58);
                }
                scoreFactors.push(`Combined signal: ${rule.reason}`);
            }
        }
    }

    if (scoreFactors.length === 0) {
        scoreFactors.push('No significant integrity anomalies detected');
    }

    // Ensure strict 0 - 100 clamping
    integrityScore = Math.max(0, Math.min(100, integrityScore));

    // Map to human-readable riskLevel, verdicts, and summaries based on user tiers:
    // >= 70%: LOW RISK (High Trust)
    // 60% - 69%: RECOMMENDED (Recommended with Minor Alerts)
    // 50% - 59%: REVIEW REQUIRED (Review Recommended)
    // < 50%: HIGH RISK (High Risk / Suspected Cheating)
    let riskLevel = 'LOW RISK';
    let verdict = 'High Trust (Verified Honest)';
    let summary = 'No anomalies detected. Candidate followed rules cleanly during the assessment.';
    let legacyStatus = 'clean';

    if (integrityScore >= 70) {
        riskLevel = 'LOW RISK';
        legacyStatus = totalPenaltyRating > 0 ? 'low_risk' : 'clean';
        verdict = totalPenaltyRating > 0 ? 'High Trust (Minor Alerts)' : 'High Trust (Verified Honest)';
        summary = totalPenaltyRating > 0
            ? 'Candidate followed rules during all assessment rounds with only minor natural movements.'
            : 'No anomalies detected. Candidate followed rules cleanly during the assessment.';
    } else if (integrityScore >= 60) {
        riskLevel = 'RECOMMENDED';
        legacyStatus = 'recommended';
        verdict = 'Recommended (Minor Alerts)';
        summary = 'Candidate took the test well with minor alerts recorded. Recommended to proceed.';
    } else if (integrityScore >= 50) {
        riskLevel = 'REVIEW REQUIRED';
        legacyStatus = 'suspicious';
        verdict = 'Review Recommended';
        summary = 'Multiple alerts recorded during session. Recruiter inspection of flagged timestamps advised.';
    } else {
        riskLevel = 'HIGH RISK';
        legacyStatus = 'critical';
        verdict = 'High Risk (Suspected Cheating)';
        summary = 'Critical violations or heavy anomaly aggregate detected. Detailed review strongly warranted.';
    }

    return {
        integrityScore,
        proctoringScore: integrityScore, // Backward compatibility
        totalPenaltyRating,
        totalPenalty: totalPenaltyRating,
        riskLevel,
        scoreVersion: 'v2',
        totalIncidents: validIncidents.length,
        totalViolations: validIncidents.length,
        standardIncidents,
        criticalIncidents,
        eventSummary,
        scoreFactors,
        highestConfidenceEvent,
        status: legacyStatus,
        verdict,
        summary,
        incidents: validIncidents,
        behavioralEpisodes: behavioralResult.episodes,
    };
};

module.exports = {
    getViolationRating,
    REDMARK_VIOLATIONS,
    NATURAL_BEHAVIORAL_EVENTS,
    groupBehavioralIncidents,
    calculateProctoringScore,
    getStatusAndVerdict,
    sanitizeViolationDetail,
    PROCTORING_SCORING_CONFIG,
    CANONICAL_CATEGORIES,
    CANONICAL_EVENT_MAP,
    CANONICAL_CATEGORY_MAP,
    normalizeIncident,
    evaluateIntegrity,
};

