const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, index: true },
    password: { type: String },
    uid: { type: String, unique: true, index: true },
    role: { type: String, enum: ['seeker', 'recruiter', 'admin'], default: 'seeker', index: true },
    profilePic: String,
    designation: String,
    phone: String,
    location: String,
    company: {
        name: String,
        website: String,
        industry: String,
        size: String,
        description: String
    },
    skills: [String],
    education: [{
        institution: String,
        degree: String,
        year: String
    }],
    experience: [{
        company: String,
        role: String,
        duration: String,
        description: String
    }],
    languages: [String],
    projects: [{
        name: String,
        tech: [String],
        role: String,
        description: String
    }],
    professionalProfiles: [{
        platform: String,
        url: String
    }],
    bio: String,
    resumeUrl: String,
    githubUrl: String,
    linkedinUrl: String,
    hiringPattern: { type: String, default: "" },
    isPro: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
