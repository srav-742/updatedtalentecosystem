import { errors } from '@hire1percent/shared';
import assessmentRepository from '../repositories/assessment.repository.js';
import questionRepository from '../repositories/question.repository.js';
import attemptRepository from '../repositories/attempt.repository.js';
import evaluationService from './evaluation.service.js';

export class AssessmentService {
  // Assessment CRUD
  async createAssessment(data, user) {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new errors.ForbiddenError('User must belong to an organization to create assessments.');
    }

    const assessmentData = {
      ...data,
      organizationId: orgId,
      status: 'DRAFT',
      createdBy: user.userId,
    };

    return await assessmentRepository.create(assessmentData);
  }

  async getAssessment(id, user) {
    const assessment = await assessmentRepository.findByIdWithQuestions(id);
    if (!assessment) {
      throw new errors.NotFoundError('Assessment not found.');
    }

    // Candidate protection: filter out correct answers and test cases
    if (user.role === 'candidate' || user.role === 'CANDIDATE') {
      if (assessment.status !== 'PUBLISHED') {
        throw new errors.ForbiddenError('Assessment is not available.');
      }

      // Deep copy to prevent mutating database cache
      const assessmentObj = assessment.toObject();
      assessmentObj.questions = assessmentObj.questions.map((aq) => {
        const q = aq.questionId;
        if (!q) return aq;

        if (q.type === 'MCQ') {
          // Exclude correct answers
          q.mcqOptions = q.mcqOptions.map((opt) => ({
            id: opt.id,
            text: opt.text,
          }));
        } else if (q.type === 'CODING') {
          // Only show sample test cases
          if (q.codingConfig && q.codingConfig.testCases) {
            q.codingConfig.testCases = q.codingConfig.testCases.filter((tc) => tc.isSample);
          }
        }
        return aq;
      });

      return assessmentObj;
    }

    // Owner recruiter check
    if (assessment.organizationId.toString() !== user.organizationId?.toString()) {
      throw new errors.ForbiddenError('Access denied to this assessment.');
    }

    return assessment;
  }

  async updateAssessment(id, data, user) {
    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new errors.NotFoundError('Assessment not found.');
    }

    if (assessment.organizationId.toString() !== user.organizationId?.toString()) {
      throw new errors.ForbiddenError('You do not own this assessment.');
    }

    if (assessment.status !== 'DRAFT') {
      throw new errors.ValidationError('Only DRAFT assessments can be updated.');
    }

    return await assessmentRepository.update(id, data);
  }

  async deleteAssessment(id, user) {
    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new errors.NotFoundError('Assessment not found.');
    }

    if (assessment.organizationId.toString() !== user.organizationId?.toString()) {
      throw new errors.ForbiddenError('You do not own this assessment.');
    }

    if (assessment.status !== 'DRAFT') {
      throw new errors.ValidationError('Only DRAFT assessments can be deleted.');
    }

    await assessmentRepository.delete(id);
    return { success: true, message: 'Assessment deleted successfully.' };
  }

  async publishAssessment(id, user) {
    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new errors.NotFoundError('Assessment not found.');
    }

    if (assessment.organizationId.toString() !== user.organizationId?.toString()) {
      throw new errors.ForbiddenError('Access denied.');
    }

    if (assessment.questions.length === 0) {
      throw new errors.ValidationError('Cannot publish assessment with no questions.');
    }

    assessment.status = 'PUBLISHED';
    return await assessment.save();
  }

  async archiveAssessment(id, user) {
    const assessment = await assessmentRepository.findById(id);
    if (!assessment) {
      throw new errors.NotFoundError('Assessment not found.');
    }

    if (assessment.organizationId.toString() !== user.organizationId?.toString()) {
      throw new errors.ForbiddenError('Access denied.');
    }

    assessment.status = 'ARCHIVED';
    return await assessment.save();
  }

  async listAssessments(user) {
    const orgId = user.organizationId;
    if (!orgId) {
      throw new errors.ForbiddenError('User must belong to an organization.');
    }

    return await assessmentRepository.find({ organizationId: orgId });
  }

  // Attempt Workflow
  async startAttempt(assessmentId, user) {
    const assessment = await assessmentRepository.findById(assessmentId);
    if (!assessment) {
      throw new errors.NotFoundError('Assessment not found.');
    }

    if (assessment.status !== 'PUBLISHED') {
      throw new errors.ValidationError('This assessment is not open for attempts.');
    }

    const candidateId = user.userId;

    // Check if candidate already has an active attempt
    const activeAttempts = await attemptRepository.findAttempts({
      assessmentId,
      candidateId,
      status: { $in: ['STARTED', 'IN_PROGRESS'] },
    });

    if (activeAttempts.length > 0) {
      // Return the current active attempt
      return activeAttempts[0];
    }

    // Set duration bounds
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + assessment.duration * 60000);

    // Populate question structures
    let questionsList = [...assessment.questions];
    if (assessment.randomize) {
      // Shuffle questions
      questionsList.sort(() => Math.random() - 0.5);
    }

    const answers = questionsList.map((aq) => ({
      questionId: aq.questionId,
      mcqAnswerId: null,
      codingSubmissionId: null,
      subjectiveAnswer: null,
      score: 0,
    }));

    return await attemptRepository.createAttempt({
      assessmentId,
      candidateId,
      status: 'STARTED',
      startTime,
      endTime,
      answers,
    });
  }

  async submitAttempt(assessmentId, data, user) {
    const candidateId = user.userId;
    
    // Find active attempt
    const attempts = await attemptRepository.findAttempts({
      assessmentId,
      candidateId,
      status: { $in: ['STARTED', 'IN_PROGRESS'] },
    });

    if (attempts.length === 0) {
      throw new errors.ValidationError('No active assessment attempt found for this candidate.');
    }

    const attempt = attempts[0];
    const now = new Date();

    // Check if attempt duration has expired (with a 30 seconds grace period)
    const isExpired = now.getTime() > (attempt.endTime.getTime() + 30000);
    
    if (isExpired) {
      attempt.status = 'EXPIRED';
      await attempt.save();
      // Even if expired, evaluate the draft answers already saved or submitted
    }

    // Process candidate answers submitted in payload
    // Array of answers: [{ questionId, mcqAnswerId, codingCode, codingLanguage, subjectiveAnswer }]
    const answersPayload = data.answers || [];

    for (const p of answersPayload) {
      const q = await questionRepository.findById(p.questionId);
      if (!q) continue;

      const attemptAns = attempt.answers.find(
        (ans) => ans.questionId.toString() === p.questionId.toString()
      );

      if (!attemptAns) continue;

      if (q.type === 'MCQ' && p.mcqAnswerId) {
        attemptAns.mcqAnswerId = p.mcqAnswerId;
        // Autosave individual draft log
        await attemptRepository.upsertMCQAnswer(attempt._id, q._id, p.mcqAnswerId);
      } 
      else if (q.type === 'CODING' && p.codingCode) {
        // Compile and run tests
        const submission = await evaluationService.runCodingTests(
          attempt._id,
          q,
          p.codingLanguage || 'javascript',
          p.codingCode
        );
        attemptAns.codingSubmissionId = submission._id;
      } 
      else if (q.type === 'SUBJECTIVE' && p.subjectiveAnswer) {
        attemptAns.subjectiveAnswer = p.subjectiveAnswer;
      }
    }

    attempt.submittedAt = now;
    if (attempt.status !== 'EXPIRED') {
      attempt.status = 'SUBMITTED';
    }
    await attempt.save();

    // Trigger auto-evaluation engine
    const evaluation = await evaluationService.evaluateAttempt(attempt._id);

    return {
      attemptId: attempt._id,
      status: attempt.status,
      result: evaluation.result,
    };
  }

  async getAttempt(id, user) {
    const attempt = await attemptRepository.findAttemptByIdWithQuestions(id);
    if (!attempt) {
      throw new errors.NotFoundError('Attempt not found.');
    }

    // Check candidate or recruiter permissions
    if (user.role === 'candidate' || user.role === 'CANDIDATE') {
      if (attempt.candidateId.toString() !== user.userId.toString()) {
        throw new errors.ForbiddenError('Access denied: You do not own this attempt.');
      }
    } else {
      // Recruiter check organization membership
      const assessment = attempt.assessmentId;
      if (assessment && assessment.organizationId.toString() !== user.organizationId?.toString()) {
        throw new errors.ForbiddenError('Access denied: Assessment belongs to another organization.');
      }
    }

    return attempt;
  }

  async listAttempts(assessmentId, user) {
    // Recruiters only
    const assessment = await assessmentRepository.findById(assessmentId);
    if (!assessment) {
      throw new errors.NotFoundError('Assessment not found.');
    }

    if (assessment.organizationId.toString() !== user.organizationId?.toString()) {
      throw new errors.ForbiddenError('Access denied.');
    }

    return await attemptRepository.findAttempts({ assessmentId });
  }

  async logCheatingEvent(attemptId, data, user) {
    const attempt = await attemptRepository.findAttemptById(attemptId);
    if (!attempt) {
      throw new errors.NotFoundError('Attempt not found.');
    }

    if (attempt.candidateId.toString() !== user.userId.toString()) {
      throw new errors.ForbiddenError('Access denied.');
    }

    if (!['STARTED', 'IN_PROGRESS'].includes(attempt.status)) {
      throw new errors.ValidationError('Cannot record cheating events on completed attempts.');
    }

    const { type, details } = data;
    if (!['TAB_SWITCH', 'FOCUS_LOST', 'PASTE', 'WINDOW_RESIZE'].includes(type)) {
      throw new errors.ValidationError('Invalid event type.');
    }

    // Increment corresponding counter
    if (type === 'TAB_SWITCH') {
      attempt.antiCheatingMetadata.tabSwitchesCount += 1;
    } else if (type === 'FOCUS_LOST') {
      attempt.antiCheatingMetadata.fullscreenExitsCount += 1;
    } else if (type === 'PASTE') {
      attempt.antiCheatingMetadata.copyPasteCount += 1;
    }

    // Log detailed event list
    attempt.antiCheatingMetadata.events.push({
      type,
      timestamp: new Date(),
      details: details || `Candidate triggered cheating event of type: ${type}`,
    });

    return await attempt.save();
  }
}

export const assessmentService = new AssessmentService();
export default assessmentService;
