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
        detail: { type: String },
        timestamp: { type: Date },
        rating: { type: Number },
        startTime: { type: Date },
        endTime: { type: Date },
        duration: { type: Number }, // in seconds
        maxConfidence: { type: Number },
        evidenceFrames: { type: [String] }, // Base64 or Cloudinary URL lists
        model: { type: String }
    }],
}, { timestamps: true });

module.exports = mongoose.model('ProctoringReport', proctoringReportSchema);
