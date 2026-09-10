const CodingRound = require('../models/CodingRound');
const CodingQuestion = require('../models/CodingQuestion');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { callGemini, safeParseAIJson } = require('../utils/aiClients');
const { invalidateCache } = require('../middleware/cacheMiddleware');
const mongoose = require('mongoose');
const {
    calculateDynamicMarks,
    evaluateQuestionScore,
    calculateAssessmentTotal,
    normalizeDifficulty,
    getDifficultyWeight
} = require('../utils/codingScoreCalculator');

// Helper to sync dynamic question marks across all questions in a round
const syncRoundQuestionMarks = async (codingRoundId) => {
    try {
        if (!codingRoundId) return;
        const questions = await CodingQuestion.find({ codingRoundId });
        if (!questions || questions.length === 0) return;
        const dynamicCalculations = calculateDynamicMarks(questions);
        for (const calc of dynamicCalculations) {
            await CodingQuestion.findByIdAndUpdate(calc.id, {
                difficulty: calc.difficulty,
                difficultyWeight: calc.difficultyWeight,
                marks: calc.maximumMarks
            });
        }
    } catch (err) {
        console.error('[CODING-ROUND] Error syncing dynamic question marks:', err.message);
    }
};

const getCodingRoundByJobId = async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Invalid Job ID.' });
        }
        const codingRound = await CodingRound.findOne({ jobId }).populate('questions');
        if (!codingRound) {
            return res.json({ success: false, message: 'No coding round configured for this job.' });
        }

        // Apply dynamic score calculations to questions
        if (codingRound.questions && codingRound.questions.length > 0) {
            const dynamicCalcs = calculateDynamicMarks(codingRound.questions);
            const calcsById = new Map(dynamicCalcs.map(c => [c.id ? c.id.toString() : '', c]));
            codingRound.questions.forEach(q => {
                const c = calcsById.get(q._id ? q._id.toString() : '');
                if (c) {
                    q.marks = c.maximumMarks;
                    q.difficulty = c.difficulty;
                    q.difficultyWeight = c.difficultyWeight;
                }
            });
        }

        res.json({ success: true, codingRound });
    } catch (error) {
        console.error('[CODING-ROUND] Get Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const createOrUpdateCodingRound = async (req, res) => {
    try {
        const { jobId, totalTime, timerType, languages, instructions, status } = req.body;

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Valid Job ID is required.' });
        }

        let codingRound = await CodingRound.findOne({ jobId });
        if (codingRound) {
            codingRound.totalTime = totalTime || codingRound.totalTime;
            codingRound.timerType = timerType || codingRound.timerType;
            codingRound.languages = languages || codingRound.languages;
            codingRound.instructions = instructions || codingRound.instructions;
            codingRound.status = status || codingRound.status;
        } else {
            codingRound = new CodingRound({
                jobId,
                totalTime: totalTime || 60,
                timerType: timerType || 'overall',
                languages: languages || [],
                instructions: instructions || '',
                status: status || 'draft'
            });
        }
        await codingRound.save();

        // Sync with Job
        await Job.findByIdAndUpdate(jobId, {
            codingRoundId: codingRound._id,
            codingAssessment: {
                enabled: true,
                passingScore: 70
            }
        });

        invalidateCache('/api/jobs');

        res.json({ success: true, codingRound });
    } catch (error) {
        console.error('[CODING-ROUND] Create/Update Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCodingRound = async (req, res) => {
    try {
        // Restrict delete operation strictly to the primary admin (sravyaadmin@gmail.com)
        const isPrimaryAdmin = req.user && req.user.role === 'admin' && req.user.email && req.user.email.toLowerCase() === 'sravyaadmin@gmail.com';
        if (!isPrimaryAdmin) {
            return res.status(403).json({ success: false, message: "Forbidden: Only the primary administrator (sravyaadmin@gmail.com) is authorized to delete coding rounds." });
        }

        const { jobId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Valid Job ID is required.' });
        }

        const codingRound = await CodingRound.findOne({ jobId });
        if (codingRound) {
            await CodingQuestion.deleteMany({ codingRoundId: codingRound._id });
            await CodingRound.findByIdAndDelete(codingRound._id);
        }

        await Job.findByIdAndUpdate(jobId, {
            codingRoundId: null,
            codingAssessment: {
                enabled: false,
                passingScore: 70
            }
        });

        invalidateCache('/api/jobs');

        res.json({ success: true, message: 'Coding round deleted successfully.' });
    } catch (error) {
        console.error('[CODING-ROUND] Delete Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Coding Questions Controllers ──────────────────────────

const addCodingQuestion = async (req, res) => {
    try {
        const { codingRoundId, title, description, inputFormat, outputFormat, constraints, expectedApproach, examples, difficulty, marks, allowedLanguages, timer } = req.body;

        if (!codingRoundId || !mongoose.Types.ObjectId.isValid(codingRoundId)) {
            return res.status(400).json({ success: false, message: 'Valid Coding Round ID is required.' });
        }

        const normDifficulty = normalizeDifficulty(difficulty);
        const diffWeight = getDifficultyWeight(normDifficulty);

        const question = new CodingQuestion({
            codingRoundId,
            title: title || 'Coding Question',
            description: description || '',
            inputFormat: inputFormat || '',
            outputFormat: outputFormat || '',
            constraints: constraints || '',
            expectedApproach: expectedApproach || '',
            examples: Array.isArray(examples) ? examples : [],
            difficulty: normDifficulty,
            difficultyWeight: diffWeight,
            marks: marks || 10,
            allowedLanguages: allowedLanguages || [],
            timer: timer || 0
        });
        await question.save();

        await CodingRound.findByIdAndUpdate(codingRoundId, {
            $push: { questions: question._id }
        });

        // Recalculate dynamic marks for all questions in this round
        await syncRoundQuestionMarks(codingRoundId);
        const updatedQuestion = await CodingQuestion.findById(question._id);

        res.json({ success: true, question: updatedQuestion || question });
    } catch (error) {
        console.error('[CODING-QUESTION] Add Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateCodingQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ success: false, message: 'Valid Question ID is required.' });
        }

        const updateData = { ...req.body };
        if (updateData.difficulty) {
            updateData.difficulty = normalizeDifficulty(updateData.difficulty);
            updateData.difficultyWeight = getDifficultyWeight(updateData.difficulty);
        }

        const question = await CodingQuestion.findByIdAndUpdate(questionId, updateData, { new: true });
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        // Recalculate dynamic marks for all questions in this round
        await syncRoundQuestionMarks(question.codingRoundId);
        const updatedQuestion = await CodingQuestion.findById(questionId);

        res.json({ success: true, question: updatedQuestion || question });
    } catch (error) {
        console.error('[CODING-QUESTION] Update Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCodingQuestion = async (req, res) => {
    try {
        // Restrict delete operation strictly to the primary admin (sravyaadmin@gmail.com)
        const isPrimaryAdmin = req.user && req.user.role === 'admin' && req.user.email && req.user.email.toLowerCase() === 'sravyaadmin@gmail.com';
        if (!isPrimaryAdmin) {
            return res.status(403).json({ success: false, message: "Forbidden: Only the primary administrator (sravyaadmin@gmail.com) is authorized to delete coding questions." });
        }

        const { questionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return res.status(400).json({ success: false, message: 'Valid Question ID is required.' });
        }

        const question = await CodingQuestion.findByIdAndDelete(questionId);
        if (question) {
            await CodingRound.findByIdAndUpdate(question.codingRoundId, {
                $pull: { questions: questionId }
            });
            // Recalculate dynamic marks for remaining questions in this round
            await syncRoundQuestionMarks(question.codingRoundId);
        }
        res.json({ success: true, message: 'Question deleted successfully.' });
    } catch (error) {
        console.error('[CODING-QUESTION] Delete Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Submissions Controllers ───────────────────────────────

const submitCodingAssessment = async (req, res) => {
    try {
        const { jobId, userId, answers } = req.body;

        if (!jobId || !userId || !Array.isArray(answers)) {
            return res.status(400).json({ success: false, message: 'Missing required submission fields.' });
        }

        // 1. Fetch round questions to calculate dynamic marks distribution
        const codingRound = await CodingRound.findOne({ jobId }).populate('questions');
        let roundQuestions = codingRound?.questions || [];
        if (roundQuestions.length === 0) {
            const questionIds = answers.map(a => a.questionId).filter(id => mongoose.Types.ObjectId.isValid(id));
            roundQuestions = await CodingQuestion.find({ _id: { $in: questionIds } });
        }

        if (roundQuestions.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one coding question is required.' });
        }

        // Dynamic marks normalized to strictly 100 maximum marks
        const dynamicCalculations = calculateDynamicMarks(roundQuestions);
        const dynamicByQId = new Map(dynamicCalculations.map(c => [c.id ? c.id.toString() : '', c]));

        const processedAnswers = [];

        // 2. Grade each question using AI and test case performance
        for (const ans of answers) {
            const question = roundQuestions.find(q => q._id.toString() === ans.questionId?.toString())
                || await CodingQuestion.findById(ans.questionId);
            if (!question) continue;

            const dynamicInfo = dynamicByQId.get(question._id.toString()) || {
                difficulty: normalizeDifficulty(question.difficulty),
                difficultyWeight: getDifficultyWeight(question.difficulty),
                maximumMarks: question.marks || 10
            };
            const questionMaxMarks = dynamicInfo.maximumMarks;

            const systemPrompt = `You are an expert technical interviewer and code reviewer. Your job is to thoroughly analyze and grade the candidate's coding solution for a programming challenge.
You must evaluate test case pass performance and return a raw JSON object fitting this schema:
{
  "testCasesPassed": <integer between 0 and 10 representing passed test cases>,
  "totalTestCases": 10,
  "performancePercentage": <number 0 to 100, e.g. 80 if 8 of 10 passed>,
  "correctnessVerdict": <one of "Correct", "Partially Correct", or "Incorrect">,
  "feedback": "Detailed constructive feedback covering: (1) Correctness analysis - does the logic solve the problem? (2) Edge case handling (3) Time/space complexity analysis (4) Code quality, readability, and style (5) Specific improvements needed.",
  "suggestedCode": "A complete, clean, efficient, and fully correct implementation of the optimal solution in the SAME programming language the candidate used. Do NOT use markdown code blocks. Write the FULL working code, not partial snippets."
}

IMPORTANT: The suggestedCode MUST be a complete, runnable solution. Do NOT truncate it.`;

            const userPrompt = `
Programming Challenge:
Title: ${question.title}
Difficulty: ${dynamicInfo.difficulty} (Weight: ${dynamicInfo.difficultyWeight})
Description: ${question.description}
${question.inputFormat ? 'Input Format: ' + question.inputFormat : ''}
${question.outputFormat ? 'Output Format: ' + question.outputFormat : ''}
Constraints: ${question.constraints}
${question.expectedApproach ? 'Expected Approach: ' + question.expectedApproach : ''}
Maximum Marks: ${questionMaxMarks}

Candidate's Solution:
Language: ${ans.language || 'python'}
Code:
\`\`\`${(ans.language || 'python').toLowerCase()}
${ans.code}
\`\`\`

Evaluate this solution thoroughly:
1. Does it solve the problem correctly for all inputs including edge cases?
2. Does it satisfy the constraints (time and space complexity)?
3. Is the code clean, well-structured, and following best practices?
4. Compare the candidate's approach with the optimal solution.

Provide correctnessVerdict, testCasesPassed (out of 10), performancePercentage, detailed feedback, and the complete suggestedCode (the optimal correct solution in the same language).
`;

            let gradeResult = { testCasesPassed: 0, totalTestCases: 10, performancePercentage: 0, feedback: 'Grading could not be completed.', suggestedCode: '', correctnessVerdict: 'Not Evaluated' };
            let aiEvaluationStatus = 'failed';

            // Attempt AI grading with retry
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const responseText = await callGemini(userPrompt, 4000, true, systemPrompt, 0.5);
                    const parsed = safeParseAIJson(responseText, null);
                    if (parsed) {
                        if (typeof parsed.testCasesPassed === 'number') gradeResult.testCasesPassed = parsed.testCasesPassed;
                        if (typeof parsed.totalTestCases === 'number') gradeResult.totalTestCases = parsed.totalTestCases;
                        if (typeof parsed.performancePercentage === 'number') gradeResult.performancePercentage = parsed.performancePercentage;
                        else if (typeof parsed.score === 'number') gradeResult.performancePercentage = parsed.score * 10;
                        if (parsed.feedback) gradeResult.feedback = parsed.feedback;
                        if (parsed.suggestedCode) gradeResult.suggestedCode = parsed.suggestedCode;
                        if (parsed.correctnessVerdict) gradeResult.correctnessVerdict = parsed.correctnessVerdict;
                        else {
                            // Derive correctness verdict from performance
                            if (gradeResult.performancePercentage >= 90) gradeResult.correctnessVerdict = 'Correct';
                            else if (gradeResult.performancePercentage >= 40) gradeResult.correctnessVerdict = 'Partially Correct';
                            else gradeResult.correctnessVerdict = 'Incorrect';
                        }
                        aiEvaluationStatus = 'success';
                        console.log(`[CODING-GRADE] AI Grading succeeded for question: ${question._id} (attempt ${attempt})`);
                        break; // Success, exit retry loop
                    }
                } catch (err) {
                    console.error(`[CODING-GRADE] AI Grading attempt ${attempt} failed for question:`, question._id, err.message);
                    if (attempt < 2) {
                        console.log(`[CODING-GRADE] Retrying AI grading for question: ${question._id}...`);
                        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
                    }
                }
            }

            const evalResult = evaluateQuestionScore(
                questionMaxMarks,
                gradeResult.testCasesPassed,
                gradeResult.totalTestCases,
                gradeResult.performancePercentage
            );

            processedAnswers.push({
                questionId: question._id,
                questionTitle: question.title,
                difficulty: dynamicInfo.difficulty,
                difficultyWeight: dynamicInfo.difficultyWeight,
                maximumMarks: questionMaxMarks,
                obtainedMarks: evalResult.obtainedMarks,
                testCasesPassed: gradeResult.testCasesPassed,
                totalTestCases: gradeResult.totalTestCases || 10,
                code: ans.code,
                language: ans.language,
                score: evalResult.obtainedMarks, // backward compatibility
                feedback: gradeResult.feedback,
                suggestedCode: gradeResult.suggestedCode,
                aiEvaluationStatus,
                correctnessVerdict: gradeResult.correctnessVerdict
            });
        }

        // 3. Calculate final coding assessment total using the dynamic scoring engine
        const assessmentTotals = calculateAssessmentTotal(processedAnswers);
        const standaloneCodingScore = assessmentTotals.totalObtainedMarks; // strictly 0 to 100

        // Fetch user basic info
        let resolvedName;
        let resolvedEmail;
        let resolvedPic;
        const seeker = await User.findOne({ uid: userId });
        if (seeker) {
            resolvedName = seeker.name;
            resolvedEmail = seeker.email;
            resolvedPic = seeker.profilePic;
        }

        const appQuery = { jobId: new mongoose.Types.ObjectId(jobId), userId };
        const existingApp = await Application.findOne(appQuery);

        const appUpdate = {
            codingScore: standaloneCodingScore,
            codingDetails: assessmentTotals,
            codingAnswers: processedAnswers
        };

        if (!existingApp) {
            if (resolvedName) appUpdate.applicantName = resolvedName;
            if (resolvedEmail) appUpdate.applicantEmail = resolvedEmail;
            if (resolvedPic) appUpdate.applicantPic = resolvedPic;
        } else {
            if (!existingApp.applicantName && resolvedName) appUpdate.applicantName = resolvedName;
            if (!existingApp.applicantEmail && resolvedEmail) appUpdate.applicantEmail = resolvedEmail;
            if (!existingApp.applicantPic && resolvedPic) appUpdate.applicantPic = resolvedPic;
        }

        const application = await Application.findOneAndUpdate(
            appQuery,
            { $set: appUpdate },
            { new: true, upsert: true }
        ).populate('jobId');

        // Recalculate Application final score strictly from present rounds (Resume + MCQ + Interview = 100 max)
        // Coding score is kept completely independent and separate, never mixed into finalScore
        const r = application.resumeMatchPercent || 0;
        const a = application.assessmentScore || 0;
        const i = application.interviewScore || 0;
        application.finalScore = r + a + i;

        // Verify completion flags & separate passing thresholds
        const job = application.jobId;
        const isResumeDone = !job || job.resumeAnalysis?.enabled === false || (application.resumeMatchPercent !== null && application.resumeMatchPercent !== undefined);
        const isAssessmentDone = !job || !job.assessment?.enabled || (application.assessmentScore !== null && application.assessmentScore !== undefined);
        const isCodingDone = !job || !job.codingAssessment?.enabled || (application.codingScore !== null && application.codingScore !== undefined);
        const isInterviewDone = !job || !job.mockInterview?.enabled || (application.interviewScore !== null && application.interviewScore !== undefined);
        const isCodingPassed = !job || !job.codingAssessment?.enabled || (application.codingScore >= (job.codingAssessment.passingScore || 70));

        if (isResumeDone && isAssessmentDone && isCodingDone && isInterviewDone && isCodingPassed && application.finalScore >= 55) {
            application.status = 'SHORTLISTED';
        } else {
            application.status = 'APPLIED';
        }
        await application.save();

        res.json({
            success: true,
            codingScore: standaloneCodingScore,
            percentageScore: standaloneCodingScore,
            codingDetails: assessmentTotals
        });
    } catch (error) {
        console.error('[CODING-ASSESSMENT] Submit Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getCodingAssessmentDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ success: false, message: 'Valid Application ID is required.' });
        }

        const application = await Application.findById(applicationId).populate('codingAnswers.questionId');
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
        }

        const formattedAnswers = (application.codingAnswers || []).map(ans => {
            const ansObj = ans.toObject ? ans.toObject() : { ...ans };
            const q = ans.questionId && typeof ans.questionId === 'object' ? ans.questionId : null;
            return {
                ...ansObj,
                questionTitle: ansObj.questionTitle || q?.title || 'Coding Question',
                questionDescription: q?.description || ansObj.questionDescription || '',
                constraints: q?.constraints || ansObj.constraints || '',
                inputFormat: q?.inputFormat || ansObj.inputFormat || '',
                outputFormat: q?.outputFormat || ansObj.outputFormat || '',
                expectedApproach: q?.expectedApproach || ansObj.expectedApproach || '',
                sampleInput: q?.sampleInput || ansObj.sampleInput || '',
                sampleOutput: q?.sampleOutput || ansObj.sampleOutput || ''
            };
        });

        res.json({
            success: true,
            codingScore: application.codingScore,
            codingDetails: application.codingDetails || {
                totalQuestions: application.codingAnswers?.length || 0,
                totalMaximumMarks: 100,
                totalObtainedMarks: application.codingScore || 0,
                finalPercentage: application.codingScore || 0
            },
            codingAnswers: formattedAnswers
        });
    } catch (error) {
        console.error('[CODING-ASSESSMENT] Get Details Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Re-evaluate a specific coding answer with AI ───────────

const reEvaluateCodingAnswer = async (req, res) => {
    try {
        const { applicationId, questionIndex } = req.params;
        const qIdx = parseInt(questionIndex, 10);

        if (!mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ success: false, message: 'Valid Application ID is required.' });
        }
        if (isNaN(qIdx) || qIdx < 0) {
            return res.status(400).json({ success: false, message: 'Valid question index is required.' });
        }

        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
        }
        if (!application.codingAnswers || qIdx >= application.codingAnswers.length) {
            return res.status(400).json({ success: false, message: 'Invalid question index for this application.' });
        }

        const answer = application.codingAnswers[qIdx];
        let question = answer.questionId ? await CodingQuestion.findById(answer.questionId) : null;
        if (!question && answer.questionTitle) {
            question = await CodingQuestion.findOne({ title: answer.questionTitle });
            if (!question && application.jobId) {
                try {
                    const round = await CodingRound.findOne({ jobId: application.jobId._id || application.jobId }).populate('questions');
                    if (round && round.questions) {
                        question = round.questions.find(q => q.title === answer.questionTitle) || null;
                    }
                } catch (e) {}
            }
        }

        const systemPrompt = `You are an expert technical interviewer and code reviewer. Your job is to thoroughly analyze and grade the candidate's coding solution for a programming challenge.
You must evaluate test case pass performance and return a raw JSON object fitting this schema:
{
  "testCasesPassed": <integer between 0 and 10 representing passed test cases>,
  "totalTestCases": 10,
  "performancePercentage": <number 0 to 100, e.g. 80 if 8 of 10 passed>,
  "correctnessVerdict": <one of "Correct", "Partially Correct", or "Incorrect">,
  "feedback": "Detailed constructive feedback covering: (1) Correctness analysis - does the logic solve the problem? (2) Edge case handling (3) Time/space complexity analysis (4) Code quality, readability, and style (5) Specific improvements needed.",
  "suggestedCode": "A complete, clean, efficient, and fully correct implementation of the optimal solution in the SAME programming language the candidate used. Do NOT use markdown code blocks. Write the FULL working code, not partial snippets."
}

CRITICAL REQUIREMENTS:
1. You MUST always provide "suggestedCode" containing the complete, optimal, bug-free, runnable code that solves the programming challenge. Never leave suggestedCode empty or null under any circumstance.
2. If the candidate wrote in Python, write Python. If JavaScript, write JavaScript.
3. suggestedCode must be complete and ready to run.`;

        const questionTitle = answer.questionTitle || question?.title || 'Coding Question';
        const questionDesc = question?.description || answer.questionDescription || '';
        const questionConstraints = question?.constraints || answer.constraints || '';
        const questionInputFormat = question?.inputFormat || answer.inputFormat || '';
        const questionOutputFormat = question?.outputFormat || answer.outputFormat || '';
        const questionExpectedApproach = question?.expectedApproach || answer.expectedApproach || '';

        const userPrompt = `
Programming Challenge:
Title: ${questionTitle}
Difficulty: ${answer.difficulty || 'MEDIUM'}
Description: ${questionDesc}
${questionInputFormat ? 'Input Format: ' + questionInputFormat : ''}
${questionOutputFormat ? 'Output Format: ' + questionOutputFormat : ''}
Constraints: ${questionConstraints}
${questionExpectedApproach ? 'Expected Approach: ' + questionExpectedApproach : ''}
Maximum Marks: ${answer.maximumMarks || 10}

Candidate's Solution:
Language: ${answer.language || 'python'}
Code:
\`\`\`${(answer.language || 'python').toLowerCase()}
${answer.code}
\`\`\`

Evaluate this solution thoroughly:
1. Does it solve the problem correctly for all inputs including edge cases?
2. Does it satisfy the constraints (time and space complexity)?
3. Is the code clean, well-structured, and following best practices?
4. Compare the candidate's approach with the optimal solution.

Provide correctnessVerdict, testCasesPassed (out of 10), performancePercentage, detailed feedback, and the complete suggestedCode (the optimal correct solution in the same language).
`;

        let gradeResult = { testCasesPassed: 0, totalTestCases: 10, performancePercentage: 0, feedback: 'Re-evaluation could not be completed.', suggestedCode: '', correctnessVerdict: 'Not Evaluated' };
        let aiEvaluationStatus = 'failed';

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const responseText = await callGemini(userPrompt, 4000, true, systemPrompt, 0.5);
                const parsed = safeParseAIJson(responseText, null);
                if (parsed) {
                    if (typeof parsed.testCasesPassed === 'number') gradeResult.testCasesPassed = parsed.testCasesPassed;
                    if (typeof parsed.totalTestCases === 'number') gradeResult.totalTestCases = parsed.totalTestCases;
                    if (typeof parsed.performancePercentage === 'number') gradeResult.performancePercentage = parsed.performancePercentage;
                    else if (typeof parsed.score === 'number') gradeResult.performancePercentage = parsed.score * 10;
                    if (parsed.feedback) gradeResult.feedback = parsed.feedback;
                    if (parsed.suggestedCode) gradeResult.suggestedCode = parsed.suggestedCode;
                    if (parsed.correctnessVerdict) gradeResult.correctnessVerdict = parsed.correctnessVerdict;
                    else {
                        if (gradeResult.performancePercentage >= 90) gradeResult.correctnessVerdict = 'Correct';
                        else if (gradeResult.performancePercentage >= 40) gradeResult.correctnessVerdict = 'Partially Correct';
                        else gradeResult.correctnessVerdict = 'Incorrect';
                    }
                    aiEvaluationStatus = 'success';
                    console.log(`[CODING-REEVAL] AI Re-evaluation succeeded for application: ${applicationId}, question index: ${qIdx} (attempt ${attempt})`);
                    break;
                }
            } catch (err) {
                console.error(`[CODING-REEVAL] AI Re-evaluation attempt ${attempt} failed:`, err.message);
                if (attempt < 2) {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }

        // Recalculate obtained marks
        const maxMarks = answer.maximumMarks || 10;
        const evalResult = evaluateQuestionScore(
            maxMarks,
            gradeResult.testCasesPassed,
            gradeResult.totalTestCases,
            gradeResult.performancePercentage
        );

        // Update the specific answer in the array
        application.codingAnswers[qIdx].testCasesPassed = gradeResult.testCasesPassed;
        application.codingAnswers[qIdx].totalTestCases = gradeResult.totalTestCases || 10;
        application.codingAnswers[qIdx].obtainedMarks = evalResult.obtainedMarks;
        application.codingAnswers[qIdx].score = evalResult.obtainedMarks;
        application.codingAnswers[qIdx].feedback = gradeResult.feedback;
        application.codingAnswers[qIdx].suggestedCode = gradeResult.suggestedCode;
        application.codingAnswers[qIdx].aiEvaluationStatus = aiEvaluationStatus;
        application.codingAnswers[qIdx].correctnessVerdict = gradeResult.correctnessVerdict;
        if (questionDesc) application.codingAnswers[qIdx].questionDescription = questionDesc;
        if (questionConstraints) application.codingAnswers[qIdx].constraints = questionConstraints;
        if (questionExpectedApproach) application.codingAnswers[qIdx].expectedApproach = questionExpectedApproach;

        // Recalculate totals
        const assessmentTotals = calculateAssessmentTotal(application.codingAnswers);
        application.codingScore = assessmentTotals.totalObtainedMarks;
        application.codingDetails = assessmentTotals;

        application.markModified('codingAnswers');
        await application.save();

        const updatedAns = application.codingAnswers[qIdx].toObject ? application.codingAnswers[qIdx].toObject() : application.codingAnswers[qIdx];
        const enrichedUpdatedAnswer = {
            ...updatedAns,
            questionTitle,
            questionDescription: questionDesc,
            constraints: questionConstraints,
            expectedApproach: questionExpectedApproach,
            suggestedCode: gradeResult.suggestedCode,
            feedback: gradeResult.feedback,
            correctnessVerdict: gradeResult.correctnessVerdict,
            aiEvaluationStatus
        };

        res.json({
            success: true,
            message: 'Re-evaluation completed successfully.',
            aiEvaluationStatus,
            updatedAnswer: enrichedUpdatedAnswer,
            codingScore: application.codingScore,
            codingDetails: application.codingDetails
        });
    } catch (error) {
        console.error('[CODING-REEVAL] Re-evaluate Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getCodingRoundByJobId,
    createOrUpdateCodingRound,
    deleteCodingRound,
    addCodingQuestion,
    updateCodingQuestion,
    deleteCodingQuestion,
    submitCodingAssessment,
    getCodingAssessmentDetails,
    reEvaluateCodingAnswer
};
