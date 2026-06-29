import { errors } from '@hire1percent/shared';

export const validateCreateAssessment = (req, res, next) => {
  const { title, duration, passPercent, questions } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new errors.ValidationError('Title must be a non-empty string.', null, 'VALIDATION_001'));
  }

  if (duration === undefined || typeof duration !== 'number' || duration <= 0) {
    return next(new errors.ValidationError('Duration must be a positive number.', null, 'VALIDATION_002'));
  }

  if (passPercent !== undefined) {
    if (typeof passPercent !== 'number' || passPercent < 0 || passPercent > 100) {
      return next(new errors.ValidationError('Pass percentage must be a number between 0 and 100.', null, 'VALIDATION_003'));
    }
  }

  if (questions !== undefined && !Array.isArray(questions)) {
    return next(new errors.ValidationError('Questions must be an array.', null, 'VALIDATION_004'));
  }

  next();
};

export const validateCreateQuestion = (req, res, next) => {
  const { title, content, type, difficulty, points, mcqOptions, codingConfig } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return next(new errors.ValidationError('Question title must be a non-empty string.', null, 'VALIDATION_005'));
  }

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return next(new errors.ValidationError('Question content must be a non-empty string.', null, 'VALIDATION_006'));
  }

  if (!['MCQ', 'CODING', 'SUBJECTIVE'].includes(type)) {
    return next(new errors.ValidationError('Invalid question type. Must be MCQ, CODING, or SUBJECTIVE.', null, 'VALIDATION_007'));
  }

  if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
    return next(new errors.ValidationError('Invalid difficulty. Must be EASY, MEDIUM, or HARD.', null, 'VALIDATION_008'));
  }

  if (points !== undefined && (typeof points !== 'number' || points <= 0)) {
    return next(new errors.ValidationError('Points must be a positive number.', null, 'VALIDATION_009'));
  }

  if (type === 'MCQ') {
    if (!mcqOptions || !Array.isArray(mcqOptions) || mcqOptions.length === 0) {
      return next(new errors.ValidationError('MCQ questions must have a non-empty options array.', null, 'VALIDATION_010'));
    }
    const hasCorrect = mcqOptions.some((opt) => opt.isCorrect === true);
    if (!hasCorrect) {
      return next(new errors.ValidationError('MCQ options must have at least one correct option.', null, 'VALIDATION_011'));
    }
  }

  if (type === 'CODING') {
    if (!codingConfig || typeof codingConfig !== 'object') {
      return next(new errors.ValidationError('Coding configuration object is required for CODING question.', null, 'VALIDATION_012'));
    }
  }

  next();
};

export const validateCreateQuestionBank = (req, res, next) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return next(new errors.ValidationError('Question bank name must be a non-empty string.', null, 'VALIDATION_013'));
  }

  next();
};

export default {
  validateCreateAssessment,
  validateCreateQuestion,
  validateCreateQuestionBank,
};
