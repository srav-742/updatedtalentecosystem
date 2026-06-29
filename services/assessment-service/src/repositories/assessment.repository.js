import Assessment from '../models/assessment.model.js';
import QuestionBank from '../models/questionBank.model.js';

export class AssessmentRepository {
  async create(data) {
    const assessment = new Assessment(data);
    return await assessment.save();
  }

  async findById(id) {
    return await Assessment.findById(id);
  }

  async findByIdWithQuestions(id) {
    return await Assessment.findById(id).populate('questions.questionId');
  }

  async find(filter = {}) {
    return await Assessment.find(filter).sort({ createdAt: -1 });
  }

  async update(id, data) {
    return await Assessment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Assessment.findByIdAndDelete(id);
  }

  // QuestionBank operations
  async createQuestionBank(data) {
    const bank = new QuestionBank(data);
    return await bank.save();
  }

  async findQuestionBanks(filter = {}) {
    return await QuestionBank.find(filter).sort({ name: 1 });
  }

  async findQuestionBankById(id) {
    return await QuestionBank.findById(id);
  }
}

export const assessmentRepository = new AssessmentRepository();
export default assessmentRepository;
