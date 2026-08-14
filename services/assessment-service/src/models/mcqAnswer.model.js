import mongoose from 'mongoose';

const { Schema } = mongoose;

const mcqAnswerSchema = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: [true, 'Attempt ID is required'],
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID is required'],
    },
    selectedOptionId: {
      type: String,
      required: [true, 'Selected option ID is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compounding unique index to easily upsert candidate's answer choices
mcqAnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export const MCQAnswer = mongoose.model('MCQAnswer', mcqAnswerSchema);
export default MCQAnswer;
