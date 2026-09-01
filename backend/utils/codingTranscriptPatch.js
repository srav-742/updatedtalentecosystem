const mongoose = require('mongoose');
const express = require('express');
const { invalidateCache } = require('../middleware/cacheMiddleware');
const {
    calculateDynamicMarks,
    normalizeDifficulty,
    getDifficultyWeight
} = require('./codingScoreCalculator');

console.log('[CodingTranscriptPatch] Initializing coding transcript & timer overlay patch...');

// 1. Dynamic Schema Extension (runs before Application model is compiled by other files)
mongoose.plugin((schema) => {
    // Check if this is the Application schema
    if (schema.path('codingAnswers')) {
        console.log('[CodingTranscriptPatch] Application schema detected. Injecting coding fields and hooks...');
        
        const codingAnswersPath = schema.path('codingAnswers');
        if (codingAnswersPath && codingAnswersPath.schema) {
            codingAnswersPath.schema.add({
                questionDescription: { type: String, default: '' },
                constraints: { type: String, default: '' },
                correctAnswer: { type: String, default: '' }, // standardized correct answer
                expectedApproach: { type: String, default: '' } // direct copy of expectedApproach
            });
        }

        // Helper function to enrich coding answers
        const enrichCodingAnswers = async (codingAnswers) => {
            if (!Array.isArray(codingAnswers) || codingAnswers.length === 0) return;
            
            try {
                const CodingQuestion = mongoose.model('CodingQuestion');
                for (let answer of codingAnswers) {
                    if (answer.questionId && (!answer.questionDescription || !answer.correctAnswer || !answer.expectedApproach)) {
                        const question = await CodingQuestion.findById(answer.questionId).lean();
                        if (question) {
                            answer.questionDescription = question.description || '';
                            answer.constraints = question.constraints || '';
                            answer.correctAnswer = question.expectedApproach || '';
                            answer.expectedApproach = question.expectedApproach || '';
                            console.log(`[CodingTranscriptPatch] Enriched coding answer for question: "${question.title}"`);
                        }
                    }
                }
            } catch (err) {
                console.error('[CodingTranscriptPatch] Failed to enrich coding answers:', err.message);
            }
        };

        // 2. Pre-Save hook
        schema.pre('save', async function () {
            if (this.isModified('codingAnswers') && this.codingAnswers && this.codingAnswers.length > 0) {
                await enrichCodingAnswers(this.codingAnswers);
            }
        });

        // 3. Pre-FindOneAndUpdate hook
        schema.pre('findOneAndUpdate', async function () {
            const update = this.getUpdate();
            if (update) {
                // Handle direct set updates
                if (update.$set && update.$set.codingAnswers) {
                    await enrichCodingAnswers(update.$set.codingAnswers);
                }
                // Handle direct object updates
                else if (update.codingAnswers) {
                    await enrichCodingAnswers(update.codingAnswers);
                }
            }
        });
    }
});

// 4. Express response.json Interceptor (patches JSON output dynamically)
const originalJson = express.response.json;
express.response.json = function (body) {
    const res = this;
    const req = res.req;
    if (!req) return originalJson.call(res, body);

    const url = req.originalUrl || req.url;
    
    // Match transcripts and interview details endpoints
    const isTranscriptRoute = url.match(/\/api\/transcripts\/[a-f0-9]{24}$/i);
    const isInterviewDetailsRoute = url.match(/\/api\/interview\/interview-details\/[a-f0-9]{24}$/i) || url.match(/\/api\/interview-details\/[a-f0-9]{24}$/i);
    const isPublicInterviewDetailsRoute = url.match(/\/api\/interview\/public\/interview-details\/[a-f0-9]{24}$/i) || url.match(/\/api\/public\/interview-details\/[a-f0-9]{24}$/i);
    const isCodingDetailsRoute = url.match(/\/api\/coding-assessments\/details\/[a-f0-9]{24}$/i);

    if ((isTranscriptRoute || isInterviewDetailsRoute || isPublicInterviewDetailsRoute || isCodingDetailsRoute) && body && typeof body === 'object') {
        const applicationId = req.params.applicationId;
        
        if (mongoose.Types.ObjectId.isValid(applicationId)) {
            const Application = mongoose.model('Application');
            
            Application.findById(applicationId)
                .populate('codingAnswers.questionId')
                .lean()
                .then(async (app) => {
                    if (app && app.codingAnswers && app.codingAnswers.length > 0) {
                        const codingDetails = app.codingDetails || {
                            totalQuestions: app.codingAnswers?.length || 0,
                            totalMaximumMarks: 100,
                            totalObtainedMarks: app.codingScore || 0,
                            finalPercentage: app.codingScore || 0
                        };

                        const codingData = {
                            score: app.codingScore || 0,
                            codingDetails,
                            answers: app.codingAnswers.map(a => {
                                const qDoc = a.questionId || {};
                                const diffNorm = a.difficulty || normalizeDifficulty(qDoc.difficulty);
                                const diffWeight = a.difficultyWeight || getDifficultyWeight(diffNorm);
                                const maxMarks = a.maximumMarks !== undefined && a.maximumMarks !== null ? a.maximumMarks : (qDoc.marks || 10);
                                const obtMarks = a.obtainedMarks !== undefined && a.obtainedMarks !== null ? a.obtainedMarks : (a.score || 0);

                                return {
                                    questionId: a.questionId?._id || a.questionId,
                                    questionTitle: a.questionTitle || qDoc.title || '',
                                    questionDescription: a.questionDescription || qDoc.description || '',
                                    difficulty: diffNorm,
                                    difficultyWeight: diffWeight,
                                    maximumMarks: maxMarks,
                                    obtainedMarks: obtMarks,
                                    testCasesPassed: a.testCasesPassed !== undefined ? a.testCasesPassed : null,
                                    totalTestCases: a.totalTestCases || 10,
                                    constraints: a.constraints || qDoc.constraints || '',
                                    correctAnswer: a.correctAnswer || qDoc.expectedApproach || '',
                                    expectedApproach: a.expectedApproach || qDoc.expectedApproach || '',
                                    code: a.code || '',
                                    language: a.language || '',
                                    score: obtMarks,
                                    feedback: a.feedback || ''
                                };
                            })
                        };

                        if (isTranscriptRoute) {
                            body.coding = codingData;
                            console.log(`[CodingTranscriptPatch] Successfully injected coding data into transcript response for app: ${applicationId}`);
                        } else if (isCodingDetailsRoute) {
                            body.codingAnswers = codingData.answers;
                            body.codingDetails = codingDetails;
                            console.log(`[CodingTranscriptPatch] Successfully injected coding data into coding-assessments/details response for app: ${applicationId}`);
                        } else {
                            body.coding = codingData;
                            if (body.interview) {
                                body.interview.coding = codingData;
                            }
                            console.log(`[CodingTranscriptPatch] Successfully injected coding data into interview-details response for app: ${applicationId}`);
                        }
                    }
                    originalJson.call(res, body);
                })
                .catch((err) => {
                    console.error('[CodingTranscriptPatch] Failed to enrich transcript response:', err);
                    originalJson.call(res, body);
                });
            return res;
        }
    }

    return originalJson.call(this, body);
};

// 5. Dynamic Controller Patching for custom AI question saving
try {
    const customCtrl = require('../controllers/customCodingAssessmentController');
    if (customCtrl) {
        customCtrl.saveCustomCodingRound = async (req, res) => {
            console.log('[CodingTranscriptPatch] Intercepted saveCustomCodingRound request...');
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const { jobId, questions, totalTime, timerType, languages } = req.body;

                if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
                    return res.status(400).json({ success: false, message: 'Valid jobId is required.' });
                }

                if (!Array.isArray(questions) || questions.length === 0) {
                    return res.status(400).json({ success: false, message: 'At least one question is required to save coding round.' });
                }

                const Job = mongoose.model('Job');
                const CodingRound = mongoose.model('CodingRound');
                const CodingQuestion = mongoose.model('CodingQuestion');

                const job = await Job.findById(jobId).session(session);
                if (!job) {
                    return res.status(404).json({ success: false, message: 'Job not found.' });
                }

                // Find or create coding round
                let codingRound = await CodingRound.findOne({ jobId }).session(session);
                if (codingRound) {
                    // Delete existing questions
                    await CodingQuestion.deleteMany({ codingRoundId: codingRound._id }).session(session);
                    
                    // Update coding round attributes
                    codingRound.totalTime = totalTime || 60;
                    codingRound.timerType = timerType || 'overall';
                    codingRound.languages = languages || [];
                    codingRound.status = 'published';
                    codingRound.questions = [];
                } else {
                    codingRound = new CodingRound({
                        jobId,
                        totalTime: totalTime || 60,
                        timerType: timerType || 'overall',
                        languages: languages || [],
                        instructions: 'Write the code logic. Make sure to satisfy the examples and constraints.',
                        status: 'published',
                        questions: []
                    });
                }

                await codingRound.save({ session });

                // Calculate dynamic marks distribution totaling exactly 100
                const dynamicCalcs = calculateDynamicMarks(questions);

                // Save each question
                const savedQuestionIds = [];
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    const dynamicInfo = dynamicCalcs[i] || {
                        difficulty: normalizeDifficulty(q.difficulty),
                        difficultyWeight: getDifficultyWeight(q.difficulty),
                        maximumMarks: 10
                    };

                    let qTimer = parseInt(q.timer);
                    // Automatically set default timers based on difficulty level if per-question timers are enabled
                    if ((timerType || codingRound.timerType) === 'individual' && !qTimer) {
                        if (dynamicInfo.difficulty === 'LOW') qTimer = 15;
                        else if (dynamicInfo.difficulty === 'HIGH') qTimer = 45;
                        else qTimer = 30; // Medium
                    }

                    const questionDoc = new CodingQuestion({
                        codingRoundId: codingRound._id,
                        title: q.title || 'Coding Challenge',
                        description: q.description || '',
                        inputFormat: q.inputFormat || '',
                        outputFormat: q.outputFormat || '',
                        constraints: q.constraints || '',
                        expectedApproach: q.expectedApproach || '',
                        examples: Array.isArray(q.examples) ? q.examples : [],
                        difficulty: dynamicInfo.difficulty,
                        difficultyWeight: dynamicInfo.difficultyWeight,
                        marks: dynamicInfo.maximumMarks,
                        allowedLanguages: Array.isArray(q.allowedLanguages) ? q.allowedLanguages : languages,
                        timer: qTimer || 0
                    });
                    await questionDoc.save({ session });
                    savedQuestionIds.push(questionDoc._id);
                }

                codingRound.questions = savedQuestionIds;
                await codingRound.save({ session });

                // Link coding round back to Job and enable codingAssessment
                job.codingRoundId = codingRound._id;
                job.codingAssessment = {
                    enabled: true,
                    passingScore: job.codingAssessment?.passingScore || 70
                };
                await job.save({ session });

                await session.commitTransaction();
                session.endSession();

                // Invalidate the jobs cache so candidates can see the updated job details immediately
                try {
                    invalidateCache('/api/jobs');
                } catch (cacheErr) {
                    console.warn('[CodingTranscriptPatch] Failed to invalidate jobs cache:', cacheErr.message);
                }
                
                console.log(`[CodingTranscriptPatch] Custom coding round saved successfully. Job: ${jobId}, timerType: ${timerType || codingRound.timerType}`);
                res.json({ success: true, codingRound });
            } catch (error) {
                await session.abortTransaction();
                session.endSession();
                console.error('[CodingTranscriptPatch] Failed to save custom coding round:', error);
                res.status(500).json({ success: false, message: error.message });
            }
        };
        console.log('[CodingTranscriptPatch] Overrode saveCustomCodingRound controller successfully.');
    }
} catch (err) {
    console.error('[CodingTranscriptPatch] Failed to patch customCodingAssessmentController:', err.message);
}

console.log('[CodingTranscriptPatch] Registered schemas hook & Express overrides successfully.');
