/**
 * Proctoring Scoring Utility
 * Calculates the rating penalty for various proctoring violations.
 * Phone, Multiple Faces, and Objects = 2 (Red Mark)
 * All other violations = 1
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
    'new_object_appeared'
]);

const getViolationRating = (type, metadata) => {
    if (!type) return 1;
    if (REDMARK_VIOLATIONS.has(type)) {
        return 2;
    }
    return 1;
};

module.exports = {
    getViolationRating,
    REDMARK_VIOLATIONS,
};

