/**
 * QuestionBank Model — Hire1Percent Central Coding Question Bank
 * 
 * This is a SEPARATE, ISOLATED model from the existing CodingQuestion model.
 * CodingQuestion is job-specific (tied to CodingRound → Job).
 * QuestionBank is a reusable library of coding problems that can be imported
 * into any job's coding round.
 * 
 * Test case schema is compatible with the existing codeExecutionService contract.
 */

const mongoose = require('mongoose');

const bankExampleSchema = new mongoose.Schema({
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    explanation: { type: String, default: '' }
}, { _id: false });

const bankTestCaseSchema = new mongoose.Schema({
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    isHidden: { type: Boolean, default: false },
    category: {
        type: String,
        enum: ['NORMAL', 'BOUNDARY', 'EDGE_CASE', 'PERFORMANCE', 'ALGORITHM', 'MUTATION', 'BASIC', 'EDGE',
               'Normal', 'Boundary', 'Edge', 'Performance', 'Algorithm', 'Mutation', 'Basic'],
        default: 'NORMAL'
    },
    weight: { type: Number, default: 1 },
    explanation: { type: String, default: '' },
    validationStatus: {
        type: String,
        enum: ['VALIDATED', 'UNVERIFIED', 'NEEDS_REVIEW', 'FAILED_VALIDATION'],
        default: 'UNVERIFIED'
    },
    source: { type: String, default: 'MANUAL' },
    timeoutMs: { type: Number, default: 6000 }
}, { _id: true });

const questionBankSchema = new mongoose.Schema({
    // ─── Identity ──────────────────────────────────────────────────
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    // ─── Classification ────────────────────────────────────────────
    difficulty: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        required: true,
        index: true
    },
    topics: { type: [String], default: [], index: true },
    tags: { type: [String], default: [] },
    skills: { type: [String], default: [] },

    // ─── Execution ─────────────────────────────────────────────────
    supportedLanguages: {
        type: [String],
        default: ['python', 'javascript', 'java', 'c++', 'go']
    },
    inputFormat: { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    constraints: { type: String, default: '' },
    executionMode: {
        type: String,
        enum: ['STDIN', 'FUNCTION'],
        default: 'STDIN'
    },
    functionSignature: { type: String, default: null },
    expectedApproach: { type: String, default: '' },

    // ─── Content ───────────────────────────────────────────────────
    examples: [bankExampleSchema],
    starterCode: { type: Map, of: String, default: {} },
    referenceSolution: { type: Map, of: String, default: {} },

    // ─── Test Cases ────────────────────────────────────────────────
    testCases: [bankTestCaseSchema],
    testCasesValidatedAt: { type: Date, default: null },
    validationMetrics: {
        totalGenerated: { type: Number, default: 0 },
        validatedCount: { type: Number, default: 0 },
        failedCount: { type: Number, default: 0 },
        validationMethod: { type: String, default: '' }
    },

    // ─── Approval Workflow ─────────────────────────────────────────
    approvalStatus: {
        type: String,
        enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
        default: 'DRAFT',
        index: true
    },
    createdBy: { type: String, default: 'system' },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    // ─── Access Control ────────────────────────────────────────────
    accessScope: {
        type: String,
        enum: ['PUBLIC', 'RESTRICTED'],
        default: 'PUBLIC'
    },
    allowedRecruiters: { type: [String], default: [] },

    // ─── Versioning & Usage ────────────────────────────────────────
    version: { type: Number, default: 1 },
    usageCount: { type: Number, default: 0 },

    // ─── Scoring ───────────────────────────────────────────────────
    marks: { type: Number, default: 10 },
    difficultyWeight: { type: Number, default: 2 }

}, { timestamps: true });

// ─── Indexes ───────────────────────────────────────────────────────
questionBankSchema.index({ approvalStatus: 1, difficulty: 1 });
questionBankSchema.index({ topics: 1, difficulty: 1 });
questionBankSchema.index({ createdAt: -1 });

questionBankSchema.set('toJSON', { virtuals: true });
questionBankSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('QuestionBank', questionBankSchema);
