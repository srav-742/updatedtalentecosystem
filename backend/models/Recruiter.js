const mongoose = require('mongoose');

const recruiterSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    company: {
        name: String,
        website: String,
        industry: String,
        size: String,
        description: String
    },
    designation: String,
    isPro: Boolean,
    accountType: { type: String, enum: ['normal', 'pilot'], default: 'normal' },
    pilotExpiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.model('Recruiter', recruiterSchema);
