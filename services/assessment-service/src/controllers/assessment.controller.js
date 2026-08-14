import assessmentService from '../services/assessment.service.js';
import questionRepository from '../repositories/question.repository.js';
import { response } from '@hire1percent/shared';

export class AssessmentController {
  // Assessment Methods
  async create(req, res, next) {
    try {
      const assessment = await assessmentService.createAssessment(req.body, req.user);
      response.sendSuccess(res, {
        data: assessment,
        message: 'Assessment created in draft mode.',
        status: 201,
      });
    } catch (err) {
      next(err);
    }
  }

  async get(req, res, next) {
    try {
      const { id } = req.params;
      const assessment = await assessmentService.getAssessment(id, req.user);
      response.sendSuccess(res, { data: assessment });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const assessment = await assessmentService.updateAssessment(id, req.body, req.user);
      response.sendSuccess(res, {
        data: assessment,
        message: 'Assessment updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await assessmentService.deleteAssessment(id, req.user);
      response.sendSuccess(res, { data: result });
    } catch (err) {
      next(err);
    }
  }

  async publish(req, res, next) {
    try {
      const { id } = req.params;
      const assessment = await assessmentService.publishAssessment(id, req.user);
      response.sendSuccess(res, {
        data: assessment,
        message: 'Assessment published successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async archive(req, res, next) {
    try {
      const { id } = req.params;
      const assessment = await assessmentService.archiveAssessment(id, req.user);
      response.sendSuccess(res, {
        data: assessment,
        message: 'Assessment archived successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const assessments = await assessmentService.listAssessments(req.user);
      response.sendSuccess(res, { data: assessments });
    } catch (err) {
      next(err);
    }
  }

  // Question Management Methods
  async createQuestion(req, res, next) {
    try {
      const questionData = {
        ...req.body,
        createdBy: req.user.userId,
      };
      const question = await questionRepository.create(questionData);
      response.sendSuccess(res, {
        data: question,
        message: 'Question created successfully.',
        status: 201,
      });
    } catch (err) {
      next(err);
    }
  }

  async getQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const question = await questionRepository.findById(id);
      response.sendSuccess(res, { data: question });
    } catch (err) {
      next(err);
    }
  }

  async listQuestions(req, res, next) {
    try {
      const { questionBankId } = req.query;
      const filter = {};
      if (questionBankId) filter.questionBankId = questionBankId;
      
      const questions = await questionRepository.find(filter);
      response.sendSuccess(res, { data: questions });
    } catch (err) {
      next(err);
    }
  }

  // QuestionBank Management Methods
  async createQuestionBank(req, res, next) {
    try {
      const bankData = {
        ...req.body,
        organizationId: req.user.organizationId,
        createdBy: req.user.userId,
      };
      const bank = await assessmentService.assessmentRepository.createQuestionBank(bankData);
      response.sendSuccess(res, {
        data: bank,
        message: 'Question bank created successfully.',
        status: 201,
      });
    } catch (err) {
      next(err);
    }
  }

  async listQuestionBanks(req, res, next) {
    try {
      const filter = { organizationId: req.user.organizationId };
      const banks = await assessmentService.assessmentRepository.findQuestionBanks(filter);
      response.sendSuccess(res, { data: banks });
    } catch (err) {
      next(err);
    }
  }
}

export const assessmentController = new AssessmentController();
export default assessmentController;
