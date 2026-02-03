const mongoose = require('mongoose');

const resumeAnalysisSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, index: true },

    resumeText: String,

    matchPercentage: Number,
    skillsScore: Number,
    experienceScore: Number,

    skillsFeedback: String,
    experienceFeedback: String,
    explanation: String,

    structured: {
        skills: {
            programming: [String],
            frameworks: [String],
            databases: [String],
            tools: [String]
        },
        projects: [
            {
                name: String,
                tech: [String],
                role: String
            }
        ],
        experienceYears: Number
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
