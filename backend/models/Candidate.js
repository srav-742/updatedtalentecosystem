const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    location: String,
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
    createdAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('Candidate', candidateSchema);
