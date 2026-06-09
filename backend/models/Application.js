const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    userId: { type: String, index: true },
    applicantName: String,
    applicantEmail: String,
    applicantPic: String,
    resumeMatchPercent: Number,
    assessmentScore: Number,
    assessmentSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentSubmission' },
    interviewScore: Number,
    recordingSessionId: { type: String, index: true },
    recordingPublicId: String,
    recordingAssetId: String,
    recordingUrl: String,
    recordingPlaybackUrl: String,
    recordingFormat: String,
    recordingDuration: Number,
    recordingBytes: Number,
    recordingUploadedAt: Date,
    recordingStatus: {
        type: String,
        enum: ['pending', 'recording', 'uploaded', 'upload_failed'],
        default: 'pending'
    },
    proctoringResetCount: { type: Number, default: 0 },
    lastProctoringResetAt: Date,
    lastProctoringResetReason: String,
    lastProctoringResetStage: String,
    lastProctoringViolation: mongoose.Schema.Types.Mixed,
    finalScore: Number,
    metrics: {
        tradeOffs: { type: Number, default: 0 },
        thinkingLatency: { type: Number, default: 0 },
        bargeInResilience: { type: Number, default: 0 },
        communicationDelta: { type: Number, default: 0 },
        ownershipMindset: { type: Number, default: 0 }
    },
    interviewAnswers: [
        {
            question: String,
            answer: String,
            score: Number,
            marks: Number,
            feedback: String
        }
    ],
    videoIntroUrl: String,
    videoIntroPublicId: String,
    teamFit: {
        score: { type: Number, default: 0 },
        reason: { type: String, default: "" },
        lastCalculated: { type: Date }
    },
    status: { type: String, enum: ['APPLIED', 'SHORTLISTED', 'ELIGIBLE', 'REJECTED', 'HIRED', 'SAVED'], default: 'APPLIED' },
    resultsVisibleAt: { type: Date },
    appliedAt: { type: Date, default: Date.now },
    assessmentAnswers: [
        {
            question: String,
            questionType: String,
            skill: String,
            userAnswer: mongoose.Schema.Types.Mixed,
            correctAnswer: mongoose.Schema.Types.Mixed,
            isCorrect: Boolean,
            score: Number
        }
    ],
    recommendationSummary: {
        keyStrengths: [String],
        weaknesses: [String],
        areasToImprove: [String],
        communication: String,
        overallSummary: String,
        calculatedAt: Date
    }
});

applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });
applicationSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: 'uid',
    justOne: true
});

module.exports = mongoose.model('Application', applicationSchema);
