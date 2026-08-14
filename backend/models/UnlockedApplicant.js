const mongoose = require('mongoose');

const unlockedApplicantSchema = new mongoose.Schema({
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    cost: { type: Number, required: true }, // Cost in Rupees
    unlockedItems: { type: [String], default: [] },
}, { timestamps: true });

// Prevent duplicate unlocks of the same applicant by the same recruiter
unlockedApplicantSchema.index({ recruiterId: 1, applicationId: 1 }, { unique: true });

module.exports = mongoose.model('UnlockedApplicant', unlockedApplicantSchema);
