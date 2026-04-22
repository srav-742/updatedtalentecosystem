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
        passingScore: { type: Number, default: 70 }
    },
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

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });
jobSchema.virtual('recruiter', {
    ref: 'User',
    localField: 'recruiterId',
    foreignField: 'uid',
    justOne: true
});

module.exports = mongoose.model('Job', jobSchema);
