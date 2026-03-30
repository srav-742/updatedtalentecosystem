const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    type: { type: String, enum: ['mcq', 'coding'], required: true },
    skill: { type: String, required: true },
    question: { type: String, required: true },
    difficulty: { type: String, default: 'medium' },
    options: [String],
    correctAnswer: mongoose.Mixed,
    starterCode: String
});

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionLog' },
    question: { type: String, required: true },
    questionType: { type: String, enum: ['mcq', 'coding'], required: true },
    skill: String,
    userAnswer: mongoose.Mixed,
    correctAnswer: mongoose.Mixed,
    isCorrect: { type: Boolean, default: false },
    score: { type: Number, default: 0 }
});

const assessmentSubmissionSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    userId: { type: String, required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
    sessionId: { type: String, required: true },
    questions: [questionSchema],
    answers: [answerSchema],
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, default: 0 },
    score: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

assessmentSubmissionSchema.index({ jobId: 1, userId: 1 });

module.exports = mongoose.model('AssessmentSubmission', assessmentSubmissionSchema);
