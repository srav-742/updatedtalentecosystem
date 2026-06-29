import mongoose from 'mongoose';

const { Schema } = mongoose;

const mcqOptionSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
});

const codingTestCaseSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  input: {
    type: String,
    default: '',
  },
  expectedOutput: {
    type: String,
    required: true,
  },
  isSample: {
    type: Boolean,
    default: false,
  },
  timeLimitMs: {
    type: Number,
    default: 2000,
  },
  memoryLimitKb: {
    type: Number,
    default: 51200, // 50MB
  },
});

const codingConfigSchema = new Schema({
  allowedLanguages: {
    type: [String],
    default: ['javascript', 'python', 'java', 'cpp'],
  },
  templates: {
    type: Map,
    of: String, // Map language key to starter code boilerplate
    default: new Map(),
  },
  testCases: {
    type: [codingTestCaseSchema],
    default: [],
  },
});

const questionSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Question title is required'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Question content is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Question type is required'],
      enum: ['MCQ', 'CODING', 'SUBJECTIVE'],
      index: true,
    },
    difficulty: {
      type: String,
      required: [true, 'Question difficulty is required'],
      enum: ['EASY', 'MEDIUM', 'HARD'],
      index: true,
    },
    points: {
      type: Number,
      required: [true, 'Points value is required'],
      default: 10,
    },
    questionBankId: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionBank',
      index: true,
    },
    tags: {
      type: [String],
      index: true,
    },
    mcqOptions: {
      type: [mcqOptionSchema],
      default: undefined, // only populated for MCQ
    },
    codingConfig: {
      type: codingConfigSchema,
      default: undefined, // only populated for CODING
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

// Validation check to ensure correct configurations exist for type
questionSchema.pre('validate', function (next) {
  if (this.type === 'MCQ' && (!this.mcqOptions || this.mcqOptions.length === 0)) {
    return next(new Error('MCQ questions must have options'));
  }
  if (this.type === 'CODING' && !this.codingConfig) {
    return next(new Error('CODING questions must have coding configurations'));
  }
  next();
});

export const Question = mongoose.model('Question', questionSchema);
export default Question;
