const mongoose = require('mongoose');

const userResumeSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    source: { type: String, enum: ['upload', 'builder'], default: 'upload' },
    fileUrl: String,
    cloudinaryUrl: String,
    fileName: String,
    resumeData: mongoose.Schema.Types.Mixed,
    isDefault: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserResume', userResumeSchema);
