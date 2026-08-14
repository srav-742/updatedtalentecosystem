import Question from '../models/question.model.js';

export class QuestionRepository {
  async create(data) {
    const question = new Question(data);
    return await question.save();
  }

  async findById(id) {
    return await Question.findById(id);
  }

  async find(filter = {}) {
    return await Question.find(filter).sort({ createdAt: -1 });
  }

  async update(id, data) {
    return await Question.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return await Question.findByIdAndDelete(id);
  }

  async findManyByIds(ids) {
    return await Question.find({ _id: { $in: ids } });
  }
}

export const questionRepository = new QuestionRepository();
export default questionRepository;
