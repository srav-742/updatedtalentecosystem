import mongoose from 'mongoose';

const { Schema } = mongoose;

const testCaseResultSchema = new Schema({
  testCaseId: {
    type: String,
    required: true,
  },
  passed: {
    type: Boolean,
    required: true,
  },
  input: {
    type: String,
  },
  expectedOutput: {
    type: String,
  },
  actualOutput: {
    type: String,
  },
  runtimeMs: {
    type: Number,
  },
  memoryKb: {
    type: Number,
  },
  errorMessage: {
    type: String,
  },
});

const codingSubmissionSchema = new Schema(
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
    language: {
      type: String,
      required: [true, 'Programming language is required'],
    },
    code: {
      type: String,
      required: [true, 'Code content is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPILING', 'RUNNING', 'SUCCESS', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'FAILED'],
      default: 'PENDING',
    },
    results: {
      type: [testCaseResultSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const CodingSubmission = mongoose.model('CodingSubmission', codingSubmissionSchema);
export default CodingSubmission;
