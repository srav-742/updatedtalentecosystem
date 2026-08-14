const mongoose = require('mongoose');

const resumeProfileSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    basics: {
        name: String,
        email: String,
        phone: String,
        location: String
    },
    summary: String,
    education: [
        {
            institution: String,
            country: String,
            degree: String,
            field: String,
            startYear: String,
            startMonth: String,
            endYear: String,
            endMonth: String,
            currentlyStudying: { type: Boolean, default: false },
            cgpa: String,
            scale: String
        }
    ],
    skills: {
        programming: [String],
        frameworks: [String],
        databases: [String],
        tools: [String],
        soft: [String]
    },
    languages: [String],
    workExperience: [
        {
            company: String,
            position: String,
            startYear: String,
            startMonth: String,
            endYear: String,
            endMonth: String,
            currentlyWorking: { type: Boolean, default: false },
            employmentType: String,
            description: String,
            projects: [
                {
                    name: String,
                    description: String
                }
            ]
        }
    ],
    projects: [
        {
            name: String,
            tech: [String],
            role: String,
            description: String
        }
    ],
    professionalProfiles: [
        {
            platform: String,
            url: String
        }
    ],
    publications: [
        {
            title: String,
            url: String,
            year: String,
            citations: String
        }
    ],
    experienceYears: Number,
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResumeProfile', resumeProfileSchema);
