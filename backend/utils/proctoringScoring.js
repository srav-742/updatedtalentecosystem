/**
 * Proctoring Scoring Utility
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralised scoring helpers for all proctoring controllers.
 *
 * Penalty tiers:
 *   Red Mark violations (phone, multiple faces, objects) → rating 2
 *   All other violations                                 → rating 1
 *
 * Score formula (used in proctoringControllerEnhanced.js and proctoringEventController.js):
 *   proctoringScore = max(0, 100 - round(totalPenaltyRating * 2.5))
 * ──────────────────────────────────────────────────────────────────────────────
 */

const REDMARK_VIOLATIONS = new Set([
    // Phone Detections
    'PHONE_DETECTED',
    'mobile_phone_detected',
    'phone_near_face',
    'phone_near_ear',

    // Multiple Faces / People Detections
    'MULTIPLE_PEOPLE',
    'multiple_faces_detected',
    'person_count_violation',

    // Object Detections
    'OBJECT_DETECTED',
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
]);

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
 * Formula: score = max(0, 100 - round(totalPenaltyRating * 2.5))
 * @param {number} totalPenaltyRating
 * @returns {number} Integer 0–100
 */
const calculateProctoringScore = (totalPenaltyRating) => {
    return Math.max(0, 100 - Math.round((totalPenaltyRating || 0) * 2.5));
};

/**
 * Derive a human-readable status, verdict, and summary from a total penalty rating.
 *
 * Used by proctoringControllerEnhanced.updateProctoringReport() and
 * proctoringEventController.logEvent() to keep cache status labels consistent.
 *
 * @param {number} totalPenaltyRating - Sum of all violation ratings for a session
 * @returns {{ status: string, verdict: string, summary: string }}
 */
const getStatusAndVerdict = (totalPenaltyRating) => {
    const rating = totalPenaltyRating || 0;

    if (rating <= 0) {
        return {
            status: 'clean',
            verdict: 'Seriousness Verified',
            summary: 'No anomalies detected. Candidate followed rules during the assessment.',
        };
    }
    if (rating <= 5) {
        return {
            status: 'low_risk',
            verdict: 'Pass with Minor Alerts',
            summary: 'A few minor alerts recorded. Candidate is likely serious.',
        };
    }
    if (rating <= 12) {
        return {
            status: 'suspicious',
            verdict: 'Review Recommended',
            summary: 'Multiple alerts recorded (e.g., eye movement or head turns). Review of proctoring evidence recommended.',
        };
    }
    return {
        status: 'critical',
        verdict: 'Critical Cheating Alert',
        summary: 'Critical violations detected (e.g., cell phone detected, screen share stop). Strong evidence of candidate cheating.',
    };
};

/**
 * Sanitize a violation detail string for consistent recruiter display.
 * Strips raw metric tokens (ratio, confidence) and ensures a Ranking tag is present.
 *
 * Mirrors the same function in transcriptController.js and interviewController.js
 * so all three controllers produce identically formatted strings.
 *
 * @param {string} type   - Violation type (unused here, kept for signature parity)
 * @param {string} detail - Raw detail string from the frontend or detection engine
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

module.exports = {
    getViolationRating,
    REDMARK_VIOLATIONS,
    calculateProctoringScore,
    getStatusAndVerdict,
    sanitizeViolationDetail,
};
