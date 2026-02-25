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
    bio: String,
    resumeUrl: String,
    coins: { type: Number, default: 100 },
    coinHistory: [{
        amount: Number,
        type: { type: String, enum: ['CREDIT', 'DEBIT'] },
        reason: String,
        date: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('User', userSchema);
