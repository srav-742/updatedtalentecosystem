import mongoose from 'mongoose';

const { Schema } = mongoose;

const assessmentResultSchema = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      required: [true, 'Attempt ID is required'],
      unique: true,
      index: true,
    },
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Assessment ID is required'],
      index: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Candidate ID is required'],
      index: true,
    },
    totalScore: {
      type: Number,
      required: true,
    },
    maxScore: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['PASSED', 'FAILED', 'PENDING_MANUAL_EVALUATION'],
      index: true,
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
    },
    evaluatedBy: {
      type: Schema.Types.ObjectId,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const AssessmentResult = mongoose.model('AssessmentResult', assessmentResultSchema);
export default AssessmentResult;
