const mongoose = require('mongoose');

const proctoringViolationSchema = new mongoose.Schema({
    examId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { 
        type: String, 
        required: true,
        enum: ['TAB_SWITCH', 'WINDOW_BLUR', 'KEYBOARD_SHORTCUT', 'RIGHT_CLICK', 'SCREEN_SHARE_STOPPED', 'FULLSCREEN_EXIT']
    },
    detail: { type: String, required: true },
    count: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for admin queries
proctoringViolationSchema.index({ examId: 1 });
proctoringViolationSchema.index({ userId: 1 });
proctoringViolationSchema.index({ examId: 1, userId: 1 });

module.exports = mongoose.model('ProctoringViolation', proctoringViolationSchema);
