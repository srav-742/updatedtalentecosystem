const mongoose = require('mongoose');

const resumeProfileSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
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
    experienceYears: Number,
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResumeProfile', resumeProfileSchema);
