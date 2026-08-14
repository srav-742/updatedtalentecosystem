import mongoose from 'mongoose';

const { Schema } = mongoose;

const questionBankSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Question bank name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Organization ID is required'],
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

export const QuestionBank = mongoose.model('QuestionBank', questionBankSchema);
export default QuestionBank;
