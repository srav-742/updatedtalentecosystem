const mongoose = require('mongoose');

const codeRevisionSchema = new mongoose.Schema({
    assessmentId: {
        type: String,
        required: true,
        index: true
    },
    candidateId: {
        type: String,
        required: true,
        index: true
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CodingQuestion',
        required: true,
        index: true
    },
    originalSubmissionId: {
        type: String,
        default: null
    },
    baselineRevisionId: {
        type: String,
        default: null
    },
    revisionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    sequenceNumber: {
        type: Number,
        required: true
    },
    language: {
        type: String,
        default: 'python'
    },
    constraintId: {
        type: String,
        default: null
    },
    constraintVersion: {
        type: Number,
        default: 1
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    previousRevisionId: {
        type: String,
        default: null
    },
    codeSnapshot: {
        type: String,
        required: true
    },
    contentHash: {
        type: String,
        required: true,
        index: true
    },
    runAttemptId: {
        type: String,
        default: null
    },
    finalSubmissionRef: {
        type: String,
        default: null
    },
    revisionType: {
        type: String,
        enum: ['BASELINE', 'MUTATION_ACTIVE', 'INTERMEDIATE_RUN', 'CHECKPOINT', 'FINAL_SUBMISSION'],
        default: 'CHECKPOINT'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound index for sequence retrieval scoped to candidate + assessment + question
codeRevisionSchema.index({ assessmentId: 1, candidateId: 1, questionId: 1, sequenceNumber: 1 });
codeRevisionSchema.index({ candidateId: 1, contentHash: 1 });

module.exports = mongoose.model('CodeRevision', codeRevisionSchema);
