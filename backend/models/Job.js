const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    title: String,
    company: String,
    location: String,
    type: { type: String, default: 'Full-time' },
    salary: String,
    description: String,
    skills: [String],
    experienceLevel: { type: String, default: 'Fresher' },
    education: [{
        qualification: String,
        specialization: String
    }],
    recruiterId: { type: String, index: true },
    minPercentage: { type: Number, default: 60 },
    resumeAnalysis: {
        enabled: { type: Boolean, default: true }
    },
    assessment: {
        enabled: { type: Boolean, default: false },
        totalQuestions: { type: Number, default: 5 },
        type: { type: String, default: 'mcq' },
        passingScore: { type: Number, default: 70 }
    },
    mockInterview: {
        enabled: { type: Boolean, default: true },
        questionSource: {
            type: String,
            enum: ['AI_GENERATED', 'RECRUITER_PROVIDED'],
            default: 'AI_GENERATED'
        },
        questionCount: { type: Number, default: 5 },
        selectionMode: {
            type: String,
            enum: ['ORDERED', 'RANDOM'],
            default: 'ORDERED'
        },
        recruiterQuestions: [{
            questionId: { type: String },
            question: { type: String },
            text: { type: String },
            order: { type: Number },
            category: { type: String, default: 'General' },
            difficulty: { type: String, default: 'Medium' },
            questionType: { type: String, default: 'Conceptual' },
            timeLimit: { type: Number, default: 120 },
            source: { type: String, default: 'RECRUITER' }
        }],
        passingScore: { type: Number, default: 70 }
    },
    questionSource: {
        type: String,
        enum: ['AI_GENERATED', 'RECRUITER_PROVIDED'],
        default: 'AI_GENERATED'
    },
    questionCount: { type: Number, default: 5 },
    selectionMode: {
        type: String,
        enum: ['ORDERED', 'RANDOM'],
        default: 'ORDERED'
    },
    recruiterQuestions: [{
        questionId: { type: String },
        question: { type: String },
        text: { type: String },
        order: { type: Number },
        category: { type: String, default: 'General' },
        difficulty: { type: String, default: 'Medium' },
        questionType: { type: String, default: 'Conceptual' },
        timeLimit: { type: Number, default: 120 },
        source: { type: String, default: 'RECRUITER' }
    }],
    codingAssessment: {
        enabled: { type: Boolean, default: false },
        passingScore: { type: Number, default: 70 }
    },
    codingRoundId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingRound', default: null },
    specialInstructions: { type: String, default: "" },
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'rejected'],
        default: 'pending_approval'
    },
    adminFeedback: {
        reason: { type: String, default: '' },
        reviewedAt: { type: Date }
    },
    createdAt: { type: Date, default: Date.now }
});

// Compound index for fast retrieval of live jobs sorted by date
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ createdAt: -1 });

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });
jobSchema.virtual('recruiter', {
    ref: 'User',
    localField: 'recruiterId',
    foreignField: 'uid',
    justOne: true
});

module.exports = mongoose.model('Job', jobSchema);
