const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    userId: { type: String, index: true },
    applicantName: String,
    applicantEmail: String,
    applicantPic: String,
    resumeMatchPercent: Number,
    assessmentScore: Number,
    interviewScore: Number,
    recordingPublicId: String,
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
            feedback: String
        }
    ],
    status: { type: String, enum: ['APPLIED', 'SHORTLISTED', 'ELIGIBLE', 'REJECTED'], default: 'APPLIED' },
    resultsVisibleAt: { type: Date },
    appliedAt: { type: Date, default: Date.now }
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
