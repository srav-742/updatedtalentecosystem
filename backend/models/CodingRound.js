const mongoose = require('mongoose');

const codingRoundSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true, unique: true },
    totalTime: { type: Number, default: 60 }, // minutes
    normalTime: { type: Number, default: 15 },
    moderateTime: { type: Number, default: 30 },
    highTime: { type: Number, default: 45 },
    normalCount: { type: Number, default: 1 },
    moderateCount: { type: Number, default: 1 },
    highCount: { type: Number, default: 0 },
    constraintsConfig: {
        normal: { type: Boolean, default: true },
        moderate: { type: Boolean, default: true },
        high: { type: Boolean, default: true }
    },
    timerType: { type: String, enum: ['overall', 'individual'], default: 'overall' },
    languages: [{ type: String }],
    instructions: { type: String, default: '' },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CodingQuestion' }],
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    dynamicMutation: {
        enabled: { type: Boolean, default: true },
        minTriggerSec: { type: Number, default: 0 },
        maxTriggerSec: { type: Number, default: 1800 },
        minAstNodes: { type: Number, default: 12 },
        mutationTimeBufferSec: { type: Number, default: 0 },
        memoryLimitMb: { type: Number, default: 14 }
    }
}, { timestamps: true });

codingRoundSchema.set('toJSON', { virtuals: true });
codingRoundSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CodingRound', codingRoundSchema);
