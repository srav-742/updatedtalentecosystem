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
const { evaluateCodingSubmission } = require('../utils/partialCreditCodingEvaluator');
const { executeAgainstTestCases } = require('../services/codeExecutionService');
const { generateAndValidateTestCases } = require('../services/aiTestCaseGenerator');
const mutationEngine = require('../services/dmce/mutationEngine');
const { broadcastMutationToCandidate } = require('../services/dmce/wsServer');

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
        
        // Recruiter and admin can see all test details; candidates only see public test cases or metadata
        const isRecruiter = req.user && ['recruiter', 'admin', 'company'].includes(req.user.role);
        let sanitizedRound = codingRound.toObject ? codingRound.toObject() : { ...codingRound };
        if (!isRecruiter && Array.isArray(sanitizedRound.questions)) {
            sanitizedRound.questions = sanitizedRound.questions.map(q => {
                if (Array.isArray(q.testCases)) {
                    q.testCases = q.testCases.map(tc => {
                        if (tc.isHidden) {
                            return {
                                _id: tc._id,
                                category: tc.category || 'EDGE_CASE',
                                isHidden: true
                            };
                        }
                        return tc;
                    });
                }
                return q;
            });
        }

        res.json({ success: true, codingRound: sanitizedRound });
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
        const { codingRoundId, title, description, inputFormat, outputFormat, constraints, expectedApproach, examples, difficulty, marks, allowedLanguages, timer, testCases } = req.body;

        if (!codingRoundId || !mongoose.Types.ObjectId.isValid(codingRoundId)) {
            return res.status(400).json({ success: false, message: 'Valid Coding Round ID is required.' });
        }

        const normDifficulty = normalizeDifficulty(difficulty);
        const diffWeight = getDifficultyWeight(normDifficulty);

        let finalTestCases = Array.isArray(testCases) ? testCases : [];
        if (finalTestCases.length === 0 && Array.isArray(examples) && examples.length > 0) {
            finalTestCases = examples.map(ex => ({
                input: ex.input || '',
                expectedOutput: ex.output || '',
                isHidden: false,
                category: 'NORMAL',
                explanation: ex.explanation || ''
            }));
        }

        const question = new CodingQuestion({
            codingRoundId,
            title: title || 'Coding Question',
            description: description || '',
            inputFormat: inputFormat || '',
            outputFormat: outputFormat || '',
            constraints: constraints || '',
            expectedApproach: expectedApproach || '',
            examples: Array.isArray(examples) ? examples : [],
            testCases: finalTestCases,
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

        // 2. Grade each question using the partial credit coding evaluation engine
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

            // 1. Execute candidate code against real test cases
            let executionResult = null;
            let realExecutionMetrics = null;

            const hasTestCases = Array.isArray(question.testCases) && question.testCases.length > 0;
            const hasExamples = Array.isArray(question.examples) && question.examples.length > 0;

            if (hasTestCases || hasExamples) {
                const testCasesToRun = hasTestCases
                    ? question.testCases
                    : question.examples.map(ex => ({
                        input: ex.input || '',
                        expectedOutput: ex.output || '',
                        isHidden: false,
                        category: 'NORMAL'
                    }));

                try {
                    // Do not mask hidden details for backend evaluation and recruiter review
                    executionResult = await executeAgainstTestCases(ans.code, ans.language, testCasesToRun, { maskHiddenDetails: false });
                    realExecutionMetrics = {
                        status: executionResult.status,
                        passed: executionResult.passed,
                        failed: executionResult.failed,
                        total: executionResult.total,
                        executionTime: executionResult.executionTime,
                        results: executionResult.results
                    };
                } catch (execErr) {
                    console.error('[CODING-SUBMISSION] Real execution failed, falling back:', execErr.message);
                }
            }

            // 2. Grade question using factual execution results as ground truth for AI
            const evalResult = await evaluateCodingSubmission({
                question,
                code: ans.code,
                language: ans.language,
                dynamicInfo,
                realExecutionResults: realExecutionMetrics
            });

            // 3. Finalize DMCE session if active for this question
            let dmceData = null;
            const targetSid = ans.sessionId || req.body.sessionId || ans.dmceSessionId;
            if (targetSid) {
                try {
                    dmceData = mutationEngine.submitAndAnalyze(targetSid, ans.code, ans.language);
                } catch (dmceErr) {
                    console.warn(`[DMCE-SUBMIT] submitAndAnalyze warning for ${targetSid}:`, dmceErr.message);
                }
            }

            processedAnswers.push({
                questionId: question._id,
                questionTitle: question.title,
                difficulty: dynamicInfo.difficulty,
                difficultyWeight: dynamicInfo.difficultyWeight,
                maximumMarks: questionMaxMarks,
                obtainedMarks: evalResult.obtainedMarks,
                testCasesPassed: evalResult.testCasesPassed,
                totalTestCases: evalResult.totalTestCases || (realExecutionMetrics ? realExecutionMetrics.total : 10),
                code: ans.code,
                language: ans.language,
                score: evalResult.obtainedMarks, // backward compatibility
                feedback: evalResult.feedback,
                suggestedCode: evalResult.suggestedCode,
                aiEvaluationStatus: evalResult.aiEvaluationStatus,
                correctnessVerdict: evalResult.correctnessVerdict,
                execution: realExecutionMetrics,
                evaluation: evalResult,
                // Additive DMCE evidence fields
                baseline: dmceData?.baseline || ans.baseline || { passed: evalResult.testCasesPassed > 0, score: evalResult.obtainedMarks },
                mutation: dmceData?.mutation || ans.mutation || null,
                forensics: dmceData?.forensics || ans.forensics || null,
                snapshots: dmceData?.snapshots || ans.snapshots || {
                    baselineCode: ans.code,
                    preMutationCode: ans.code,
                    postMutationCode: ans.code,
                    finalSubmittedCode: ans.code
                },
                sandboxSessionId: targetSid || null
            });
        }

        // 3. Calculate final coding assessment total using the dynamic scoring engine
        const assessmentTotals = calculateAssessmentTotal(processedAnswers);
        const standaloneCodingScore = assessmentTotals.totalObtainedMarks; // strictly 0 to 100

        // Attach DMCE aggregate summary
        const triggeredMutations = processedAnswers.filter(a => a.mutation?.triggered);
        if (triggeredMutations.length > 0) {
            assessmentTotals.dmceSummary = {
                mutationsTriggered: triggeredMutations.length,
                mutationsPassed: triggeredMutations.filter(a => a.mutation?.status === 'PASSED').length,
                totalQuestionsWithDMCE: processedAnswers.filter(a => a.sandboxSessionId).length,
                overallCasScore: Math.round(
                    processedAnswers.reduce((acc, a) => acc + (a.forensics?.casScore || 85), 0) / (processedAnswers.length || 1)
                )
            };
        }

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

        const rawJobId = jobId?._id || jobId?.id || jobId;
        const validJobId = mongoose.Types.ObjectId.isValid(rawJobId) ? new mongoose.Types.ObjectId(rawJobId) : rawJobId;
        const appQuery = { jobId: validJobId, userId: String(userId) };

        const [existingApp, jobDoc] = await Promise.all([
            Application.findOne(appQuery).lean().catch(() => null),
            mongoose.Types.ObjectId.isValid(validJobId) ? Job.findById(validJobId).lean().catch(() => null) : null
        ]);

        const appUpdate = {
            codingScore: standaloneCodingScore,
            codingDetails: assessmentTotals,
            codingAnswers: processedAnswers
        };

        const finalName = resolvedName || existingApp?.applicantName;
        const finalEmail = resolvedEmail || existingApp?.applicantEmail;
        const finalPic = resolvedPic || existingApp?.applicantPic;

        if (finalName) appUpdate.applicantName = finalName;
        if (finalEmail) appUpdate.applicantEmail = finalEmail;
        if (finalPic) appUpdate.applicantPic = finalPic;

        // Recalculate Application final score strictly from present rounds (Resume + MCQ + Interview = 100 max)
        const r = Number(existingApp?.resumeMatchPercent || 0);
        const a = Number(existingApp?.assessmentScore || 0);
        const i = Number(existingApp?.interviewScore || 0);
        const calculatedFinalScore = r + a + i;
        appUpdate.finalScore = calculatedFinalScore;

        // Verify completion flags & separate passing thresholds
        const isResumeDone = !jobDoc || jobDoc.resumeAnalysis?.enabled === false || (existingApp?.resumeMatchPercent !== null && existingApp?.resumeMatchPercent !== undefined);
        const isAssessmentDone = !jobDoc || !jobDoc.assessment?.enabled || (existingApp?.assessmentScore !== null && existingApp?.assessmentScore !== undefined);
        const isCodingDone = true;
        const isInterviewDone = !jobDoc || !jobDoc.mockInterview?.enabled || (existingApp?.interviewScore !== null && existingApp?.interviewScore !== undefined);
        const isCodingPassed = !jobDoc || !jobDoc.codingAssessment?.enabled || (standaloneCodingScore >= (jobDoc.codingAssessment?.passingScore || 70));

        if (isResumeDone && isAssessmentDone && isCodingDone && isInterviewDone && isCodingPassed && calculatedFinalScore >= 55) {
            appUpdate.status = 'SHORTLISTED';
        } else {
            appUpdate.status = 'APPLIED';
        }

        await Application.findOneAndUpdate(
            appQuery,
            { $set: appUpdate },
            { new: true, upsert: true }
        );
        try {
            const { invalidateCache } = require('../middleware/cacheMiddleware');
            invalidateCache('/api/applications');
        } catch (cacheErr) {
            // ignore
        }

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

        const questionTitle = answer.questionTitle || question?.title || 'Coding Question';
        const questionDesc = question?.description || answer.questionDescription || '';
        const questionConstraints = question?.constraints || answer.constraints || '';
        const questionInputFormat = question?.inputFormat || answer.inputFormat || '';
        const questionOutputFormat = question?.outputFormat || answer.outputFormat || '';
        const questionExpectedApproach = question?.expectedApproach || answer.expectedApproach || '';
        const questionMaxMarks = answer.maximumMarks || question?.marks || 10;
        const normDifficulty = normalizeDifficulty(answer.difficulty || question?.difficulty || 'MEDIUM');
        const diffWeight = getDifficultyWeight(normDifficulty);

        const dynamicInfo = {
            difficulty: normDifficulty,
            difficultyWeight: diffWeight,
            maximumMarks: questionMaxMarks
        };

        const targetQuestion = question || {
            title: questionTitle,
            description: questionDesc,
            constraints: questionConstraints,
            inputFormat: questionInputFormat,
            outputFormat: questionOutputFormat,
            expectedApproach: questionExpectedApproach,
            marks: questionMaxMarks,
            difficulty: normDifficulty
        };

        let realExecutionMetrics = null;
        const hasTestCases = Array.isArray(targetQuestion.testCases) && targetQuestion.testCases.length > 0;
        const hasExamples = Array.isArray(targetQuestion.examples) && targetQuestion.examples.length > 0;

        if (hasTestCases || hasExamples) {
            const testCasesToRun = hasTestCases
                ? targetQuestion.testCases
                : targetQuestion.examples.map(ex => ({
                    input: ex.input || '',
                    expectedOutput: ex.output || '',
                    isHidden: false,
                    category: 'NORMAL'
                }));

            try {
                const executionResult = await executeAgainstTestCases(answer.code, answer.language, testCasesToRun, { maskHiddenDetails: false });
                realExecutionMetrics = {
                    status: executionResult.status,
                    passed: executionResult.passed,
                    failed: executionResult.failed,
                    total: executionResult.total,
                    executionTime: executionResult.executionTime,
                    results: executionResult.results
                };
            } catch (execErr) {
                console.error('[CODING-REEVAL] Real execution failed, falling back:', execErr.message);
            }
        }

        const evalResult = await evaluateCodingSubmission({
            question: targetQuestion,
            code: answer.code,
            language: answer.language,
            dynamicInfo,
            realExecutionResults: realExecutionMetrics
        });

        // Update the specific answer in the array
        application.codingAnswers[qIdx].testCasesPassed = evalResult.testCasesPassed;
        application.codingAnswers[qIdx].totalTestCases = evalResult.totalTestCases || (realExecutionMetrics ? realExecutionMetrics.total : 10);
        application.codingAnswers[qIdx].obtainedMarks = evalResult.obtainedMarks;
        application.codingAnswers[qIdx].score = evalResult.obtainedMarks;
        application.codingAnswers[qIdx].feedback = evalResult.feedback;
        application.codingAnswers[qIdx].suggestedCode = evalResult.suggestedCode;
        application.codingAnswers[qIdx].aiEvaluationStatus = evalResult.aiEvaluationStatus;
        application.codingAnswers[qIdx].correctnessVerdict = evalResult.correctnessVerdict;
        if (realExecutionMetrics) {
            application.codingAnswers[qIdx].execution = realExecutionMetrics;
        }
        application.codingAnswers[qIdx].evaluation = evalResult;
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
            suggestedCode: evalResult.suggestedCode,
            feedback: evalResult.feedback,
            correctnessVerdict: evalResult.correctnessVerdict,
            aiEvaluationStatus: evalResult.aiEvaluationStatus
        };

        res.json({
            success: true,
            message: 'Re-evaluation completed successfully.',
            aiEvaluationStatus: evalResult.aiEvaluationStatus,
            updatedAnswer: enrichedUpdatedAnswer,
            codingScore: application.codingScore,
            codingDetails: application.codingDetails
        });
    } catch (error) {
        console.error('[CODING-REEVAL] Re-evaluate Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/coding-assessments/run
 * Executes candidate code against real test cases inside isolated sandbox.
 * Strictly masks hidden test-case input & expected output for candidate confidentiality.
 */
const runCandidateCode = async (req, res) => {
    try {
        const { questionId, code, language, customInput } = req.body;

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ success: false, message: 'Source code is required.' });
        }

        if (!language || typeof language !== 'string') {
            return res.status(400).json({ success: false, message: 'Programming language is required.' });
        }

        let testCases = [];

        // Case 1: Custom input test
        if (typeof customInput === 'string' && customInput.trim().length > 0) {
            testCases = [{
                input: customInput,
                expectedOutput: '',
                isHidden: false,
                category: 'CUSTOM'
            }];
        } else if (questionId && mongoose.Types.ObjectId.isValid(questionId)) {
            // Case 2: Configured test cases on the question
            const question = await CodingQuestion.findById(questionId);
            if (question) {
                if (Array.isArray(question.testCases) && question.testCases.length > 0) {
                    testCases = question.testCases;
                } else if (Array.isArray(question.examples) && question.examples.length > 0) {
                    testCases = question.examples.map(ex => ({
                        input: ex.input || '',
                        expectedOutput: ex.output || '',
                        isHidden: false,
                        category: 'NORMAL',
                        explanation: ex.explanation || ''
                    }));
                }
            }
        }

        // If no test cases defined, provide empty input fallback run
        if (testCases.length === 0) {
            testCases = [{
                input: '',
                expectedOutput: '',
                isHidden: false,
                category: 'NORMAL'
            }];
        }

        // Execute against test cases with hidden details strictly masked
        const executionResult = await executeAgainstTestCases(code, language, testCases, { maskHiddenDetails: true });

        const publicTests = testCases.filter(t => !t.isHidden);
        const hiddenTests = testCases.filter(t => t.isHidden);
        const publicPassed = executionResult.results.filter(r => !r.isHidden && r.passed).length;
        const hiddenPassed = executionResult.results.filter(r => r.isHidden && r.passed).length;

        return res.json({
            success: true,
            status: executionResult.status,
            passed: executionResult.passed,
            failed: executionResult.failed,
            total: executionResult.total,
            publicPassed,
            publicTotal: publicTests.length,
            hiddenPassed,
            hiddenTotal: hiddenTests.length,
            executionTime: executionResult.executionTime,
            results: executionResult.results
        });
    } catch (error) {
        console.error('[CODING-ASSESSMENT] Run Code Error:', error);
        return res.status(200).json({
            success: false,
            status: 'EXECUTION_ERROR',
            message: 'Unable to execute the code at this moment. Please try again.',
            error: error.message
        });
    }
};

/**
 * POST /api/coding-assessments/generate-test-cases
 * AI-generates and sandbox-validates comprehensive test cases for a coding question.
 */
const generateQuestionTestCases = async (req, res) => {
    try {
        const { questionId, question, language, saveToDb } = req.body;

        let questionData = question;
        let questionDoc = null;

        if (questionId && mongoose.Types.ObjectId.isValid(questionId)) {
            questionDoc = await CodingQuestion.findById(questionId);
            if (questionDoc && !questionData) {
                questionData = questionDoc.toObject();
            }
        }

        if (!questionData || !questionData.title) {
            return res.status(400).json({ success: false, message: 'Valid question data or questionId is required.' });
        }

        const targetLang = language || (Array.isArray(questionData.allowedLanguages) && questionData.allowedLanguages[0]) || 'python';

        console.log(`[TEST-CASE-GEN] Generating and sandbox-validating test cases for "${questionData.title}" in ${targetLang}...`);
        const genResult = await generateAndValidateTestCases(questionData, targetLang);

        if (saveToDb && questionDoc && Array.isArray(genResult.testCases) && genResult.testCases.length > 0) {
            questionDoc.testCases = genResult.testCases;
            await questionDoc.save();
            console.log(`[TEST-CASE-GEN] Saved ${genResult.testCases.length} validated test cases to question ${questionId}`);
        }

        return res.json({
            success: true,
            message: `Successfully generated and validated ${genResult.testCases?.length || 0} test cases.`,
            testCases: genResult.testCases || [],
            referenceSolution: genResult.referenceSolution,
            validationMetrics: genResult.validationMetrics
        });
    } catch (error) {
        console.error('[TEST-CASE-GEN] Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─── DMCE Dedicated Sandbox & Dynamic Mutation Handlers ─────────────────

const startDMCESession = async (req, res) => {
    try {
        const { sessionId, candidateId, applicationId, jobId, questionId, language } = req.body;
        const config = req.body.config || {};

        let roundConfig = null;
        if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
            roundConfig = await CodingRound.findOne({ jobId });
        }
        if (roundConfig?.dynamicMutation) {
            Object.assign(config, roundConfig.dynamicMutation);
        }

        const session = mutationEngine.startSession({
            sessionId,
            candidateId: candidateId || req.user?.uid || req.user?._id || '',
            applicationId,
            jobId,
            questionId,
            language,
            config
        });

        res.json({
            success: true,
            sessionId: session.sessionId,
            state: session.state,
            startedAt: session.startedAt,
            config: session.config,
            sandbox: session.sandbox
        });
    } catch (err) {
        console.error('[DMCE-CONTROLLER] startSession Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const heartbeatDMCESession = async (req, res) => {
    try {
        const { sessionId, currentCode, customMutationId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID is required.' });
        }

        const triggerResult = mutationEngine.triggerMutationIfEligible(sessionId, currentCode, customMutationId);

        if (triggerResult.triggered) {
            broadcastMutationToCandidate(sessionId, triggerResult);
        }

        res.json({
            success: true,
            ...triggerResult
        });
    } catch (err) {
        console.error('[DMCE-CONTROLLER] heartbeat Error:', err);
        res.status(200).json({ success: false, triggered: false, message: err.message });
    }
};

const runDMCEBaseline = async (req, res) => {
    try {
        const { sessionId, questionId, code, language } = req.body;
        if (!sessionId || !code) {
            return res.status(400).json({ success: false, message: 'sessionId and code are required.' });
        }

        let testCases = [];
        if (questionId && mongoose.Types.ObjectId.isValid(questionId)) {
            const question = await CodingQuestion.findById(questionId);
            if (question && Array.isArray(question.testCases)) {
                testCases = question.testCases.filter(tc => tc.category !== 'MUTATION' && tc.category !== 'Mutation');
            }
        }

        if (testCases.length === 0) {
            testCases = [{ input: '', expectedOutput: '', isHidden: false, category: 'NORMAL' }];
        }

        const baselineResult = await mutationEngine.runBaseline(sessionId, code, language, testCases);

        let mutationTriggered = null;
        if (baselineResult.mutationEligible) {
            try {
                const trig = mutationEngine.triggerMutationIfEligible(sessionId, code);
                if (trig.triggered) {
                    mutationTriggered = trig;
                    broadcastMutationToCandidate(sessionId, trig);
                }
            } catch (_) {}
        }

        res.json({
            success: true,
            execution: baselineResult.execution,
            baselinePassed: baselineResult.baselinePassed,
            mutationEligible: baselineResult.mutationEligible,
            mutationTriggered
        });
    } catch (err) {
        console.error('[DMCE-CONTROLLER] runBaseline Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const runDMCEMutation = async (req, res) => {
    try {
        const { sessionId, code, language } = req.body;
        if (!sessionId || !code) {
            return res.status(400).json({ success: false, message: 'sessionId and code are required.' });
        }

        const mutationResult = await mutationEngine.runMutationTests(sessionId, code, language);
        res.json({
            success: true,
            ...mutationResult
        });
    } catch (err) {
        console.error('[DMCE-CONTROLLER] runMutation Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

const ingestDMCETelemetry = async (req, res) => {
    try {
        const { sessionId, seqId, events, documentHash } = req.body;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'sessionId is required.' });
        }
        mutationEngine.ingestTelemetryBatch(sessionId, { seqId, events, documentHash });
        res.json({ success: true, timestamp: Date.now() });
    } catch (err) {
        res.status(200).json({ success: false, error: err.message });
    }
};

const getDMCESessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = mutationEngine.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }
        res.json({
            success: true,
            sessionId: session.sessionId,
            state: session.state,
            baselinePassed: session.baselinePassed,
            mutation: session.mutation,
            startedAt: session.startedAt,
            config: session.config
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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
    reEvaluateCodingAnswer,
    runCandidateCode,
    generateQuestionTestCases,
    startDMCESession,
    heartbeatDMCESession,
    runDMCEBaseline,
    runDMCEMutation,
    ingestDMCETelemetry,
    getDMCESessionStatus
};

