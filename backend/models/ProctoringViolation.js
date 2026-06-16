const mongoose = require('mongoose');

const proctoringViolationSchema = new mongoose.Schema({
    examId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { 
        type: String, 
        required: true
    },
    detail: { type: String, required: true },
    count: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for admin queries
proctoringViolationSchema.index({ examId: 1, userId: 1 });

module.exports = mongoose.model('ProctoringViolation', proctoringViolationSchema);
