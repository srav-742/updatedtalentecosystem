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
        ]
    },
    { timestamps: true }
);

// Auto-clean abandoned interview sessions after 24 hours.
interviewSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
