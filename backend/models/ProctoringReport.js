const mongoose = require('mongoose');

const proctoringReportSchema = new mongoose.Schema({
    examId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application',
        default: null,
        index: true,
    },
    totalViolations: {
        type: Number,
        default: 0,
    },
    totalPenaltyRating: {
        type: Number,
        default: 0,
    },
    proctoringScore: {
        type: Number,
        default: 100,
    },
    integrityScore: {
        type: Number,
        default: 100,
    },
    riskLevel: {
        type: String,
        enum: ['LOW_RISK', 'REVIEW_REQUIRED', 'HIGH_RISK'],
        default: 'LOW_RISK',
    },
    scoreVersion: {
        type: String,
        default: 'v2',
    },
    totalIncidents: {
        type: Number,
        default: 0,
    },
    standardIncidents: {
        type: Number,
        default: 0,
    },
    criticalIncidents: {
        type: Number,
        default: 0,
    },
    eventSummary: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    scoreFactors: {
        type: [String],
        default: [],
    },
    detectorHealth: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    reviewStatus: {
        type: String,
        enum: ['UNREVIEWED', 'CONFIRMED_CONCERN', 'DISMISSED', 'REVIEWED'],
        default: 'UNREVIEWED',
    },
    reviewedBy: {
        type: String,
        default: null,
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
    reviewReason: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ['clean', 'low_risk', 'suspicious', 'critical'],
        default: 'clean',
    },
    verdict: {
        type: String,
        default: 'Seriousness Verified',
    },
    summary: {
        type: String,
        default: 'No rules violated. Session is clean.',
    },
    violationSummaryList: [{
        type: { type: String },
        count: { type: Number, default: 0 },
        rating: { type: Number, default: 0 }
    }],
    timeline: [{
        type: { type: String },
        canonicalEventType: { type: String },
        category: { type: String },
        detail: { type: String },
        timestamp: { type: Date },
        rating: { type: Number },
        severity: { type: String },
        confidence: { type: Number },
        startTime: { type: Date },
        endTime: { type: Date },
        duration: { type: Number }, // in seconds
        maxConfidence: { type: Number },
        evidenceFrames: { type: [String] }, // Base64 or Cloudinary URL lists
        model: { type: String },
        isAnswering: { type: Boolean, default: false },
        questionId: { type: String, default: null },
        answerId: { type: String, default: null },
        reviewStatus: { type: String, default: 'UNREVIEWED' },
        reviewReason: { type: String, default: null },
    }],
}, { timestamps: true });

module.exports = mongoose.model('ProctoringReport', proctoringReportSchema);
