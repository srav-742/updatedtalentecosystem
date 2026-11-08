const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true, unique: true, index: true },
        userId: { type: String, required: true, index: true },
        jobId: { type: String, required: true, index: true },
        recordingSessionId: String,
        resumeProfile: mongoose.Schema.Types.Mixed,
        specialInstructions: String,
        roleInfo: mongoose.Schema.Types.Mixed,
        jobTitle: String,
        jobDescription: String,
        jobSkills: [String],
        experienceLevel: String,
        systemPrompt: String,
        interviewerVoice: String,
        questionSource: { type: String, default: 'AI_GENERATED' },
        selectedQuestions: [mongoose.Schema.Types.Mixed],
        currentQuestionIndex: { type: Number, default: 0 },
        totalQuestions: { type: Number, default: 10 },
        history: [
            {
                role: String,
                content: String
            }
        ],
        answerEvaluations: [
            {
                questionNumber: Number,
                question: String,
                answer: String,
                score: Number,
                marks: Number,
                feedback: String,
                isAttempted: Boolean
            }
        ],
        // ─── Live Technical Problem-Solving Round (Additive & Optional) ────
        technicalStage: {
            type: String,
            enum: [
                'NONE',
                'PENDING',
                'TECHNICAL_PROBLEM_INTRO',
                'PROBLEM_PRESENTED',
                'APPROACH_EXPLANATION',
                'CODING_IN_PROGRESS',
                'SOLUTION_SUBMITTED',
                'AI_FOLLOW_UP',
                'TECHNICAL_EVALUATION',
                'RESUME_NORMAL_INTERVIEW',
                'COMPLETED'
            ],
            default: 'NONE'
        },
        technicalProblem: mongoose.Schema.Types.Mixed,
        technicalAttempts: [mongoose.Schema.Types.Mixed],
        technicalFollowUps: [mongoose.Schema.Types.Mixed],
        technicalEvaluation: mongoose.Schema.Types.Mixed,
        technicalTriggerQuestionIndex: { type: Number, default: null }
    },
    { timestamps: true }
);

// Auto-clean abandoned interview sessions after 24 hours.
// interviewSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
