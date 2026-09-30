const mongoose = require('mongoose');

const codingRoundSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true, unique: true },
    totalTime: { type: Number, default: 60 }, // minutes
    timerType: { type: String, enum: ['overall', 'individual'], default: 'overall' },
    languages: [{ type: String }],
    instructions: { type: String, default: '' },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CodingQuestion' }],
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    dynamicMutation: {
        enabled: { type: Boolean, default: true },
        minTriggerSec: { type: Number, default: 120 },
        maxTriggerSec: { type: Number, default: 1800 },
        minAstNodes: { type: Number, default: 12 },
        mutationTimeBufferSec: { type: Number, default: 600 }
    }
}, { timestamps: true });

codingRoundSchema.set('toJSON', { virtuals: true });
codingRoundSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CodingRound', codingRoundSchema);
