const mongoose = require('mongoose');

const interviewFeedbackSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    jobId: { type: String, required: true, index: true },
    interviewScore: { type: Number },                          // score from the interview
    experienceRating: { type: Number, min: 1, max: 5 },          // 1–5 stars
    difficultyLevel: { type: String, enum: ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'] },
    aiRelevance: { type: String, enum: ['Yes', 'Somewhat', 'No'] },
    technicalIssues: { type: String, enum: ['Audio issues', 'Mic issues', 'Delay', 'None'] },
    comments: { type: String, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
});

// Prevent duplicate feedback per interview (one per userId + jobId)
interviewFeedbackSchema.index({ userId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('InterviewFeedback', interviewFeedbackSchema);
