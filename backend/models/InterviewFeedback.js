const mongoose = require('mongoose');

const interviewFeedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    interviewId: { type: String, required: true, index: true },
    overallRating: { type: Number, required: true, min: 1, max: 5 },
    recommendationScore: { type: Number, min: 0, max: 10 },
    ratings: {
        uiDesign: { type: Number, min: 1, max: 5 },
        navigation: { type: Number, min: 1, max: 5 },
        interviewFlow: { type: Number, min: 1, max: 5 },
        responsiveness: { type: Number, min: 1, max: 5 },
        aiAccuracy: { type: Number, min: 1, max: 5 },
        processingSpeed: { type: Number, min: 1, max: 5 },
        scoreFairness: { type: Number, min: 1, max: 5 },
        feedbackClarity: { type: Number, min: 1, max: 5 }
    },
    likedMost: { type: String, maxlength: 1000 },
    improvements: { type: String, maxlength: 1000 },
    issuesFaced: { type: String, maxlength: 1000 },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Prevent duplicate feedback per interview
interviewFeedbackSchema.index({ userId: 1, interviewId: 1 }, { unique: true });

module.exports = mongoose.model('InterviewFeedback', interviewFeedbackSchema);
