import mongoose from 'mongoose';

const { Schema } = mongoose;

const assessmentQuestionSchema = new Schema({
  questionId: {
    type: Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  pointsOverride: {
    type: Number,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
});

const assessmentSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration limit (in minutes) is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Organization ID is required'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    passPercent: {
      type: Number,
      required: true,
      default: 60,
      min: 0,
      max: 100,
    },
    randomize: {
      type: Boolean,
      required: true,
      default: false,
    },
    questions: {
      type: [assessmentQuestionSchema],
      default: [],
    },
    tags: {
      type: [String],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: [true, 'Creator User ID is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;
