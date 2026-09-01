const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema({
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    explanation: { type: String, default: '' }
}, { _id: false });

const codingQuestionSchema = new mongoose.Schema({
    codingRoundId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingRound', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    inputFormat: { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    constraints: { type: String, default: '' },
    expectedApproach: { type: String, default: '' },
    examples: [exampleSchema],
    difficulty: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'Low', 'Medium', 'High', 'Easy', 'Hard'], default: 'MEDIUM' },
    difficultyWeight: { type: Number, default: 2 },
    marks: { type: Number, default: 10 },
    allowedLanguages: [{ type: String }],
    timer: { type: Number, default: 0 } // minutes; 0 = uses overall timer
}, { timestamps: true });

codingQuestionSchema.set('toJSON', { virtuals: true });
codingQuestionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);
