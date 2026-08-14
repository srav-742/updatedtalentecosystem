import mongoose from 'mongoose';

const { Schema } = mongoose;

const evaluationLogSchema = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: [true, 'Attempt ID is required'],
      index: true,
    },
    evaluatorId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Evaluator User ID is required'],
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question ID is required'],
    },
    previousScore: {
      type: Number,
      default: 0,
    },
    newScore: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const EvaluationLog = mongoose.model('EvaluationLog', evaluationLogSchema);
export default EvaluationLog;
