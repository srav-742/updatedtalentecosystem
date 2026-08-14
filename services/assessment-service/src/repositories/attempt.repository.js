import AssessmentAttempt from '../models/assessmentAttempt.model.js';
import CodingSubmission from '../models/codingSubmission.model.js';
import MCQAnswer from '../models/mcqAnswer.model.js';
import AssessmentResult from '../models/assessmentResult.model.js';
import EvaluationLog from '../models/evaluationLog.model.js';

export class AttemptRepository {
  // Attempt Operations
  async createAttempt(data) {
    const attempt = new AssessmentAttempt(data);
    return await attempt.save();
  }

  async findAttemptById(id) {
    return await AssessmentAttempt.findById(id);
  }

  async findAttemptByIdWithQuestions(id) {
    return await AssessmentAttempt.findById(id)
      .populate('assessmentId')
      .populate('answers.questionId');
  }

  async findAttempts(filter = {}) {
    return await AssessmentAttempt.find(filter).sort({ createdAt: -1 });
  }

  async updateAttempt(id, data) {
    return await AssessmentAttempt.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  // Coding Submission Operations
  async createCodingSubmission(data) {
    const submission = new CodingSubmission(data);
    return await submission.save();
  }

  async findCodingSubmissionById(id) {
    return await CodingSubmission.findById(id);
  }

  async findCodingSubmissions(filter = {}) {
    return await CodingSubmission.find(filter).sort({ createdAt: -1 });
  }

  async updateCodingSubmission(id, data) {
    return await CodingSubmission.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  // MCQ Answer Operations (Draft Save)
  async upsertMCQAnswer(attemptId, questionId, selectedOptionId) {
    return await MCQAnswer.findOneAndUpdate(
      { attemptId, questionId },
      { selectedOptionId, timestamp: new Date() },
      { upsert: true, new: true }
    );
  }

  async findMCQAnswers(attemptId) {
    return await MCQAnswer.find({ attemptId });
  }

  // Result Operations
  async createResult(data) {
    const result = new AssessmentResult(data);
    return await result.save();
  }

  async findResultByAttemptId(attemptId) {
    return await AssessmentResult.findOne({ attemptId });
  }

  async updateResult(attemptId, data) {
    return await AssessmentResult.findOneAndUpdate({ attemptId }, data, { new: true, runValidators: true });
  }

  // Evaluation Log Operations
  async createEvaluationLog(data) {
    const log = new EvaluationLog(data);
    return await log.save();
  }

  async findEvaluationLogs(attemptId) {
    return await EvaluationLog.find({ attemptId }).sort({ createdAt: -1 });
  }
}

export const attemptRepository = new AttemptRepository();
export default attemptRepository;
