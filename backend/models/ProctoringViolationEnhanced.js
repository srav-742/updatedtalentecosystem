const mongoose = require('mongoose');

/**
 * ProctoringViolationEnhanced
 * ──────────────────────────────────────────────────────────────────────────────
 * Extended violation model for the AI-proctoring engine.
 * Stores both the original browser-level violations and the new
 * camera-based AI detections with millisecond precision, including deduplicated
 * temporal metrics.
 * ──────────────────────────────────────────────────────────────────────────────
 */

const VIOLATION_TYPES = [
    // ── Original browser-level violations ────────────────────────────────────
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'KEYBOARD_SHORTCUT',
    'RIGHT_CLICK',
    'SCREEN_SHARE_STOPPED',
    'FULLSCREEN_EXIT',

    // ── Device / environment telemetry ───────────────────────────────────────
    'MULTIPLE_DEVICES',

    // ── AI gaze tracking ─────────────────────────────────────────────────────
    'EYE_LOOKING_AWAY',
    'EYE_LOOKING_AWAY_WHILE_ANSWERING',

    // ── AI head-pose estimation ──────────────────────────────────────────────
    'HEAD_TURNED',
    'HEAD_TURNED_WHILE_ANSWERING',

    // ── AI presence detection ────────────────────────────────────────────────
    'NO_PEOPLE',
    'MULTIPLE_PEOPLE',

    // ── AI object detection ──────────────────────────────────────────────────
    'PHONE_DETECTED',
    'HEADPHONES_DETECTED',
    'OBJECT_DETECTED',
];

const proctoringViolationEnhancedSchema = new mongoose.Schema({
    examId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        enum: VIOLATION_TYPES,
    },
    detail: {
        type: String,
        required: true,
    },
    count: {
        type: Number,
        required: true,
        default: 1,
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
    },
    isAnswering: {
        type: Boolean,
        default: false,
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
    },
    maxConfidence: {
        type: Number,
        min: 0,
        max: 1,
        default: null,
    },
    startTime: {
        type: Date,
        default: Date.now,
    },
    endTime: {
        type: Date,
        default: Date.now,
    },
    duration: {
        type: Number,
        default: 0, // duration in seconds
    },
    evidenceFrames: {
        type: [String], // Array of screenshot data URLs or Cloudinary URLs
        default: [],
    },
    model: {
        type: String,
        default: 'Unknown', // 'FaceMesh' | 'COCO-SSD' | 'MoveNet' | 'SpeechCommands' | 'Browser'
    },
    proctoringScore: {
        type: Number,
        default: 100,
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    rating: {
        type: Number,
        default: 0,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

// Compound indexes for efficient admin/recruiter queries
proctoringViolationEnhancedSchema.index({ examId: 1, userId: 1 });
proctoringViolationEnhancedSchema.index({ examId: 1, type: 1 });
proctoringViolationEnhancedSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ProctoringViolationEnhanced', proctoringViolationEnhancedSchema);
