const mongoose = require('mongoose');

const exampleSchema = new mongoose.Schema({
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    explanation: { type: String, default: '' }
}, { _id: false });

const testCaseSchema = new mongoose.Schema({
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    isHidden: { type: Boolean, default: false },
    category: {
        type: String,
        enum: ['NORMAL', 'BOUNDARY', 'EDGE_CASE', 'PERFORMANCE', 'ALGORITHM', 'MUTATION', 'Normal', 'Boundary', 'Edge', 'Performance', 'Algorithm', 'Mutation'],
        default: 'NORMAL'
    },
    explanation: { type: String, default: '' }
}, { _id: true });

const codingQuestionSchema = new mongoose.Schema({
    codingRoundId: { type: mongoose.Schema.Types.ObjectId, ref: 'CodingRound', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    inputFormat: { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    constraints: { type: String, default: '' },
    expectedApproach: { type: String, default: '' },
    examples: [exampleSchema],
    testCases: [testCaseSchema],
    difficulty: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'Low', 'Medium', 'High', 'Easy', 'Hard'], default: 'MEDIUM' },
    difficultyWeight: { type: Number, default: 2 },
    marks: { type: Number, default: 10 },
    allowedLanguages: [{ type: String }],
    timer: { type: Number, default: 0 }, // minutes; 0 = uses overall timer
    mutationContractId: { type: String, default: null } // DMCE mutation contract reference
}, { timestamps: true });

codingQuestionSchema.set('toJSON', { virtuals: true });
codingQuestionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CodingQuestion', codingQuestionSchema);
