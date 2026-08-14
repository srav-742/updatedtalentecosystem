import assessmentService from '../services/assessment.service.js';
import evaluationService from '../services/evaluation.service.js';
import { response } from '@hire1percent/shared';

export class AttemptController {
  async start(req, res, next) {
    try {
      const { id: assessmentId } = req.params;
      const attempt = await assessmentService.startAttempt(assessmentId, req.user);
      response.sendSuccess(res, {
        data: attempt,
        message: 'Assessment attempt started.',
      });
    } catch (err) {
      next(err);
    }
  }

  async submit(req, res, next) {
    try {
      const { id: assessmentId } = req.params;
      const result = await assessmentService.submitAttempt(assessmentId, req.body, req.user);
      response.sendSuccess(res, {
        data: result,
        message: 'Assessment submitted and evaluated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getAttempt(req, res, next) {
    try {
      const { id } = req.params;
      const attempt = await assessmentService.getAttempt(id, req.user);
      response.sendSuccess(res, { data: attempt });
    } catch (err) {
      next(err);
    }
  }

  async listAttempts(req, res, next) {
    try {
      const { assessmentId } = req.query;
      const attempts = await assessmentService.listAttempts(assessmentId, req.user);
      response.sendSuccess(res, { data: attempts });
    } catch (err) {
      next(err);
    }
  }

  async cheatingEvent(req, res, next) {
    try {
      const { id: attemptId } = req.params;
      const attempt = await assessmentService.logCheatingEvent(attemptId, req.body, req.user);
      response.sendSuccess(res, {
        data: attempt,
        message: 'Telemetry event recorded successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  async evaluate(req, res, next) {
    try {
      const { id: attemptId } = req.params;
      const { questionId, score, evaluationNotes } = req.body;
      const result = await evaluationService.overrideScore(
        attemptId,
        questionId,
        score,
        evaluationNotes,
        req.user.userId
      );
      response.sendSuccess(res, {
        data: result,
        message: 'Evaluation score updated successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const attemptController = new AttemptController();
export default attemptController;
