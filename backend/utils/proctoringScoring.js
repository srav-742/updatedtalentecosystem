/**
 * Proctoring Scoring Utility
 * Calculates the rating penalty for various proctoring violations.
 */

const getViolationRating = (type, metadata) => {
    // If the candidate looked to the side for 4 seconds or more, assign rating 8
    if (
        (type === 'EYE_LOOKING_AWAY' || 
         type === 'EYE_LOOKING_AWAY_WHILE_ANSWERING' || 
         type === 'HEAD_TURNED' || 
         type === 'HEAD_TURNED_WHILE_ANSWERING') &&
        metadata && 
        (metadata.duration >= 4 || metadata.seesSide === true)
    ) {
        return 8;
    }

    // Default ratings for each violation type
    const ratingMap = {
        // AI Gaze & Head Turn
        HEAD_TURNED: 3,
        HEAD_TURNED_WHILE_ANSWERING: 3,
        EYE_LOOKING_AWAY: 4,
        EYE_LOOKING_AWAY_WHILE_ANSWERING: 4,

        // AI Object Detection
        PHONE_DETECTED: 6,
        HEADPHONES_DETECTED: 5,
        OBJECT_DETECTED: 6,

        // AI Presence
        NO_PEOPLE: 4,
        MULTIPLE_PEOPLE: 7,

        // Browser telemetry & focus
        TAB_SWITCH: 2,
        WINDOW_BLUR: 2,
        KEYBOARD_SHORTCUT: 1,
        RIGHT_CLICK: 1,
        SCREEN_SHARE_STOPPED: 10,
        FULLSCREEN_EXIT: 3,
        MULTIPLE_DEVICES: 5,
    };

    return ratingMap[type] !== undefined ? ratingMap[type] : 2;
};

module.exports = {
    getViolationRating,
};
