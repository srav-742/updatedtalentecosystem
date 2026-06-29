import { errors } from '@hire1percent/shared';
import attemptRepository from '../repositories/attempt.repository.js';
import assessmentRepository from '../repositories/assessment.repository.js';

export class EvaluationService {
  /**
   * Auto-evaluates MCQ and Coding questions for an attempt, compiling the score.
   */
  async evaluateAttempt(attemptId) {
    const attempt = await attemptRepository.findAttemptByIdWithQuestions(attemptId);
    if (!attempt) {
      throw new errors.NotFoundError('Assessment attempt not found.');
    }

    const assessment = attempt.assessmentId;
    if (!assessment) {
      throw new errors.NotFoundError('Associated assessment not found.');
    }

    let totalScore = 0;
    let maxScore = 0;
    let hasSubjective = false;

    // Fetch the detailed questions to evaluate correct answers
    for (const ans of attempt.answers) {
      const question = ans.questionId;
      if (!question) continue;

      // Find points value (check for override)
      const assessmentQ = assessment.questions.find(
        (q) => q.questionId.toString() === question._id.toString()
      );
      const points = assessmentQ?.pointsOverride ?? question.points;
      maxScore += points;

      if (question.type === 'MCQ') {
        const correctOption = question.mcqOptions?.find((opt) => opt.isCorrect);
        const isCorrect = correctOption && ans.mcqAnswerId === correctOption.id;
        ans.score = isCorrect ? points : 0;
        ans.evaluationNotes = isCorrect ? 'Auto-evaluated: Correct answer' : 'Auto-evaluated: Incorrect answer';
        totalScore += ans.score;
      } 
      else if (question.type === 'CODING') {
        // Evaluate coding test cases
        if (ans.codingSubmissionId) {
          const submission = await attemptRepository.findCodingSubmissionById(ans.codingSubmissionId);
          if (submission) {
            // Count passed test cases
            const totalCases = submission.results.length;
            const passedCases = submission.results.filter((tc) => tc.passed).length;
            
            // Calculate proportional score
            const questionScore = totalCases > 0 ? Math.round((passedCases / totalCases) * points) : 0;
            ans.score = questionScore;
            ans.evaluationNotes = `Auto-evaluated: Passed ${passedCases}/${totalCases} test cases`;
            totalScore += questionScore;
          } else {
            ans.score = 0;
            ans.evaluationNotes = 'Auto-evaluated: No submission record found';
          }
        } else {
          ans.score = 0;
          ans.evaluationNotes = 'Auto-evaluated: Code not submitted';
        }
      } 
      else if (question.type === 'SUBJECTIVE') {
        hasSubjective = true;
        ans.evaluationNotes = 'Pending manual evaluation';
      }
    }

    const percentage = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(2)) : 0;
    const passed = percentage >= assessment.passPercent;

    // If there is a subjective question, status is PENDING_MANUAL_EVALUATION, otherwise PASSED/FAILED
    const resultStatus = hasSubjective ? 'PENDING_MANUAL_EVALUATION' : (passed ? 'PASSED' : 'FAILED');

    // Update attempt answers
    attempt.status = hasSubjective ? 'SUBMITTED' : 'EVALUATED';
    attempt.submittedAt = attempt.submittedAt || new Date();
    await attempt.save();

    // Create or update result
    let result = await attemptRepository.findResultByAttemptId(attemptId);
    if (result) {
      result.totalScore = totalScore;
      result.maxScore = maxScore;
      result.percentage = percentage;
      result.passed = passed;
      result.status = resultStatus;
      result.evaluatedBy = null; // Auto-evaluated
      result.evaluatedAt = new Date();
      await result.save();
    } else {
      result = await attemptRepository.createResult({
        attemptId,
        assessmentId: assessment._id,
        candidateId: attempt.candidateId,
        totalScore,
        maxScore,
        percentage,
        passed,
        status: resultStatus,
        evaluatedBy: null,
        evaluatedAt: new Date(),
      });
    }

    return { attempt, result };
  }

  /**
   * Run compilation / test cases for a coding submission (Sandbox Simulator)
   */
  async runCodingTests(attemptId, question, language, code) {
    const codingConfig = question.codingConfig;
    if (!codingConfig) {
      throw new errors.ValidationError('Coding configuration missing for question.');
    }

    // Default runner simulation: compile code (checks for syntax) and run test cases
    const testCases = codingConfig.testCases || [];
    const results = [];
    let overallStatus = 'SUCCESS';

    for (const tc of testCases) {
      // Simulate code execution: we do simple static checks or stub responses
      // In local testing, if code includes basic correct return/logic, or just runs, we mark it passed.
      // To simulate properly:
      let passed = false;
      let actualOutput = '';
      let errorMessage = null;

      try {
        // If code has basic structure, we can pass it, or check if it matches output.
        // For a full sandbox, you'd run Docker/Judge0. Here, we parse basic JS or simulate run:
        passed = this._simulateExecution(code, language, tc.input, tc.expectedOutput);
        actualOutput = passed ? tc.expectedOutput : 'Mock execution failed';
      } catch (err) {
        passed = false;
        errorMessage = err.message;
        overallStatus = 'RUNTIME_ERROR';
      }

      results.push({
        testCaseId: tc.id,
        passed,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        runtimeMs: Math.floor(Math.random() * 50) + 5,
        memoryKb: Math.floor(Math.random() * 500) + 1200,
        errorMessage,
      });
    }

    // Save coding submission log
    return await attemptRepository.createCodingSubmission({
      attemptId,
      questionId: question._id,
      language,
      code,
      status: overallStatus,
      results,
    });
  }

  /**
   * Mock compiler matching code constructs for evaluation
   */
  _simulateExecution(code, language, input, expectedOutput) {
    if (!code || code.trim() === '') return false;
    
    // Quick regex validation to see if user has attempted to return a value or solve the problem
    // For test cases, if the code contains simple output stubs or keywords, we can evaluate success.
    const normalizedCode = code.replace(/\s+/g, '');
    
    // Standard validation: passes if code has standard function declaration and has a return statement
    if (language === 'javascript') {
      return code.includes('function') || code.includes('const') || code.includes('return');
    }
    if (language === 'python') {
      return code.includes('def ') || code.includes('return');
    }
    
    return true; // default pass for stub simulation
  }

  /**
   * Recruiter manually reviews subjective question or overrides score
   */
  async overrideScore(attemptId, questionId, score, notes, evaluatorId) {
    const attempt = await attemptRepository.findAttemptById(attemptId);
    if (!attempt) {
      throw new errors.NotFoundError('Assessment attempt not found.');
    }

    const assessment = await assessmentRepository.findById(attempt.assessmentId);
    if (!assessment) {
      throw new errors.NotFoundError('Associated assessment not found.');
    }

    const answer = attempt.answers.find((ans) => ans.questionId.toString() === questionId.toString());
    if (!answer) {
      throw new errors.ValidationError('Question not found in this candidate attempt.');
    }

    const assessmentQ = assessment.questions.find((q) => q.questionId.toString() === questionId.toString());
    const maxPoints = assessmentQ?.pointsOverride ?? 10; // default 10 if not overridden
    
    if (score < 0 || score > maxPoints) {
      throw new errors.ValidationError(`Score must be between 0 and the maximum points (${maxPoints}).`);
    }

    const previousScore = answer.score;
    answer.score = score;
    answer.evaluationNotes = notes || 'Manually evaluated by Recruiter';

    await attempt.save();

    // Audit override in EvaluationLog
    await attemptRepository.createEvaluationLog({
      attemptId,
      evaluatorId,
      questionId,
      previousScore,
      newScore: score,
      notes,
    });

    // Recalculate result
    let result = await attemptRepository.findResultByAttemptId(attemptId);
    if (!result) {
      throw new errors.NotFoundError('Assessment result not found. Evaluate attempt first.');
    }

    // Re-sum all scores in attempt answers
    let totalScore = 0;
    for (const ans of attempt.answers) {
      totalScore += ans.score;
    }

    const percentage = result.maxScore > 0 ? parseFloat(((totalScore / result.maxScore) * 100).toFixed(2)) : 0;
    const passed = percentage >= assessment.passPercent;

    result.totalScore = totalScore;
    result.percentage = percentage;
    result.passed = passed;
    result.evaluatedBy = evaluatorId;
    result.evaluatedAt = new Date();

    // Check if there are any remaining subjective questions with pending evaluation
    const hasRemainingSubjective = attempt.answers.some((ans) => {
      return ans.evaluationNotes === 'Pending manual evaluation';
    });
    
    result.status = hasRemainingSubjective ? 'PENDING_MANUAL_EVALUATION' : (passed ? 'PASSED' : 'FAILED');
    await result.save();

    if (!hasRemainingSubjective && attempt.status !== 'EVALUATED') {
      attempt.status = 'EVALUATED';
      await attempt.save();
    }

    return { attempt, result };
  }
}

export const evaluationService = new EvaluationService();
export default evaluationService;
