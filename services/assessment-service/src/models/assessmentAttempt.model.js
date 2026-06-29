import mongoose from 'mongoose';

const { Schema } = mongoose;

const attemptAnswerSchema = new Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  mcqAnswerId: {
    type: String, // option ID selected
  },
  codingSubmissionId: {
    type: Schema.Types.ObjectId,
    ref: 'CodingSubmission',
  },
  subjectiveAnswer: {
    type: String,
  },
  score: {
    type: Number,
    default: 0,
  },
  evaluationNotes: {
    type: String,
  },
});

const cheatingEventSchema = new Schema({
  type: {
    type: String,
    enum: ['TAB_SWITCH', 'FOCUS_LOST', 'PASTE', 'WINDOW_RESIZE'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: String,
  },
});

const antiCheatingMetadataSchema = new Schema({
  tabSwitchesCount: {
    type: Number,
    default: 0,
  },
  fullscreenExitsCount: {
    type: Number,
    default: 0,
  },
  copyPasteCount: {
    type: Number,
    default: 0,
  },
  events: {
    type: [cheatingEventSchema],
    default: [],
  },
});

const assessmentAttemptSchema = new Schema(
  {
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
    status: {
      type: String,
      required: true,
      enum: ['STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'EVALUATED'],
      default: 'STARTED',
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    answers: {
      type: [attemptAnswerSchema],
      default: [],
    },
    antiCheatingMetadata: {
      type: antiCheatingMetadataSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

export const AssessmentAttempt = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
export default AssessmentAttempt;
