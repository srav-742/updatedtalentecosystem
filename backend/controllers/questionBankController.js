/**
 * Question Bank Controller — Hire1Percent Central Coding Question Bank
 * 
 * Provides admin and recruiter API endpoints for managing the reusable
 * question bank. Does NOT modify any existing coding assessment logic.
 * 
 * Admin endpoints: CRUD, approve/reject, archive, validate test cases
 * Recruiter endpoints: Browse approved questions, import to job coding round
 */

const QuestionBank = require('../models/QuestionBank');
const CodingRound = require('../models/CodingRound');
const CodingQuestion = require('../models/CodingQuestion');
const Job = require('../models/Job');
const mongoose = require('mongoose');
const { executeAgainstTestCases } = require('../services/codeExecutionService');

// ─── ADMIN EMAILS (matches authMiddleware) ─────────────────────────
const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];

const isAdmin = (user, req) => {
    if (req && (req.headers['x-client-id'] === 'hire1percent_web_client' || req.headers['x-client-id'] === 'hire1admindashboard')) {
        return true;
    }
    if (!user) return false;
    return user.role === 'admin' || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim()));
};

// ═══════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/question-bank
 * List questions with pagination, search, and filters
 * Admin: sees all. Recruiter: sees only APPROVED + accessible.
 */
const listQuestions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            difficulty,
            topic,
            status,
            language,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Build filter
        const filter = {};

        // Role-based filtering
        const userIsAdmin = isAdmin(req.user, req);
        if (!userIsAdmin) {
            // Recruiters only see approved + accessible questions
            filter.approvalStatus = 'APPROVED';
            const userUid = req.user ? (req.user.uid || req.user._id?.toString() || '') : '';
            if (userUid) {
                filter.$or = [
                    { accessScope: 'PUBLIC' },
                    { allowedRecruiters: userUid }
                ];
            } else {
                filter.accessScope = 'PUBLIC';
            }
        } else if (status) {
            filter.approvalStatus = status.toUpperCase();
        }

        if (difficulty) {
            filter.difficulty = difficulty.toUpperCase();
        }
        if (topic) {
            filter.topics = { $in: [topic] };
        }
        if (language) {
            filter.supportedLanguages = { $in: [language.toLowerCase()] };
        }
        if (search) {
            filter.$or = filter.$or || [];
            const searchRegex = { $regex: search, $options: 'i' };
            filter.$or.push(
                { title: searchRegex },
                { slug: searchRegex },
                { topics: searchRegex },
                { tags: searchRegex },
                { skills: searchRegex }
            );
            // If already has $or from access control, use $and
            if (!userIsAdmin && filter.$or.length > 2) {
                const accessOr = [
                    { accessScope: 'PUBLIC' },
                    { allowedRecruiters: req.user.uid || req.user._id.toString() }
                ];
                const searchOr = [
                    { title: searchRegex },
                    { slug: searchRegex },
                    { topics: searchRegex },
                    { tags: searchRegex },
                    { skills: searchRegex }
                ];
                delete filter.$or;
                filter.$and = [
                    { approvalStatus: 'APPROVED' },
                    { $or: accessOr },
                    { $or: searchOr }
                ];
                delete filter.approvalStatus;
            }
        }

        const sortObj = {};
        sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Build projection — hide sensitive fields from non-admins
        const projection = userIsAdmin ? {} : {
            referenceSolution: 0,
            'testCases.expectedOutput': 0,
            'testCases.input': 0,
            allowedRecruiters: 0
        };

        // For recruiter list view, don't hide test case metadata entirely
        // just hide the actual input/output values
        const [questions, total] = await Promise.all([
            QuestionBank.find(filter, projection)
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            QuestionBank.countDocuments(filter)
        ]);

        // Normalize questions array fields and populate testCaseSummary
        questions.forEach(q => {
            if (typeof q.topics === 'string') {
                q.topics = q.topics.split(/[,\s]+/).filter(Boolean);
            } else if (!Array.isArray(q.topics)) {
                q.topics = [];
            }
            if (typeof q.tags === 'string') {
                q.tags = q.tags.split(/[,\s]+/).filter(Boolean);
            } else if (!Array.isArray(q.tags)) {
                q.tags = [];
            }
            if (typeof q.skills === 'string') {
                q.skills = q.skills.split(/[,\s]+/).filter(Boolean);
            } else if (!Array.isArray(q.skills)) {
                q.skills = [];
            }

            const rawTestCases = q.testCases || [];
            q.testCaseSummary = {
                total: rawTestCases.length,
                public: rawTestCases.filter(tc => !tc.isHidden).length,
                hidden: rawTestCases.filter(tc => tc.isHidden).length
            };

            // Don't expose test cases directly in recruiter list view
            if (!userIsAdmin) {
                delete q.testCases;
            }
        });

        res.json({
            success: true,
            questions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[QUESTION-BANK] List error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/question-bank/:id
 * Get single question details
 */
const getQuestion = async (req, res) => {
    try {
        const { id } = req.params;

        let question;
        if (mongoose.Types.ObjectId.isValid(id)) {
            question = await QuestionBank.findById(id).lean();
        }
        if (!question) {
            question = await QuestionBank.findOne({ slug: id }).lean();
        }
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        // Normalize array fields
        if (typeof question.topics === 'string') {
            question.topics = question.topics.split(/[,\s]+/).filter(Boolean);
        } else if (!Array.isArray(question.topics)) {
            question.topics = [];
        }
        if (typeof question.tags === 'string') {
            question.tags = question.tags.split(/[,\s]+/).filter(Boolean);
        } else if (!Array.isArray(question.tags)) {
            question.tags = [];
        }
        if (typeof question.skills === 'string') {
            question.skills = question.skills.split(/[,\s]+/).filter(Boolean);
        } else if (!Array.isArray(question.skills)) {
            question.skills = [];
        }

        const userIsAdmin = isAdmin(req.user, req);

        // Access check for non-admins
        if (!userIsAdmin) {
            if (question.approvalStatus !== 'APPROVED') {
                return res.status(403).json({ success: false, message: 'This question is not available.' });
            }
            if (question.accessScope === 'RESTRICTED') {
                const userId = req.user ? (req.user.uid || req.user._id?.toString() || '') : '';
                if (!userId || !question.allowedRecruiters.includes(userId)) {
                    return res.status(403).json({ success: false, message: 'You do not have access to this question.' });
                }
            }
            // Hide sensitive data
            delete question.referenceSolution;
            delete question.allowedRecruiters;
            if (question.testCases) {
                question.testCases = question.testCases.map(tc => {
                    if (tc.isHidden) {
                        return {
                            _id: tc._id,
                            category: tc.category,
                            isHidden: true,
                            validationStatus: tc.validationStatus
                        };
                    }
                    return tc;
                });
            }
        }

        res.json({ success: true, question });
    } catch (error) {
        console.error('[QUESTION-BANK] Get error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/question-bank
 * Create a new question (admin only)
 */
const createQuestion = async (req, res) => {
    try {
        const {
            slug, title, description, difficulty, topics, tags, skills,
            supportedLanguages, inputFormat, outputFormat, constraints,
            executionMode, functionSignature, expectedApproach,
            examples, starterCode, referenceSolution, testCases, marks
        } = req.body;

        if (!slug || !title || !description || !difficulty) {
            return res.status(400).json({
                success: false,
                message: 'slug, title, description, and difficulty are required.'
            });
        }

        // Check duplicate slug
        const existing = await QuestionBank.findOne({ slug: slug.toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `A question with slug "${slug}" already exists.`
            });
        }

        const question = new QuestionBank({
            slug: slug.toLowerCase().trim(),
            title: title.trim(),
            description,
            difficulty: difficulty.toUpperCase(),
            topics: topics || [],
            tags: tags || [],
            skills: skills || [],
            supportedLanguages: supportedLanguages || ['python', 'javascript', 'java', 'c++', 'go'],
            inputFormat: inputFormat || '',
            outputFormat: outputFormat || '',
            constraints: constraints || '',
            executionMode: executionMode || 'STDIN',
            functionSignature: functionSignature || null,
            expectedApproach: expectedApproach || '',
            examples: examples || [],
            starterCode: starterCode || {},
            referenceSolution: referenceSolution || {},
            testCases: testCases || [],
            marks: marks || 10,
            approvalStatus: req.body.approvalStatus || (isAdmin(req.user, req) ? 'APPROVED' : 'DRAFT'),
            approvedBy: (req.body.approvalStatus === 'APPROVED' || (!req.body.approvalStatus && isAdmin(req.user, req))) ? (req.user ? (req.user.uid || req.user._id?.toString() || 'admin') : 'admin') : null,
            approvedAt: (req.body.approvalStatus === 'APPROVED' || (!req.body.approvalStatus && isAdmin(req.user, req))) ? new Date() : null,
            createdBy: req.user ? (req.user.uid || req.user._id?.toString() || 'admin') : 'admin'
        });

        await question.save();

        res.status(201).json({ success: true, question });
    } catch (error) {
        console.error('[QUESTION-BANK] Create error:', error);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'Duplicate slug detected.' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/question-bank/:id
 * Update a question (admin only). Cannot update APPROVED questions without re-versioning.
 */
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await QuestionBank.findById(id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        // If question is approved, increment version
        if (question.approvalStatus === 'APPROVED') {
            question.version = (question.version || 1) + 1;
            question.approvalStatus = 'PENDING_REVIEW';
            question.approvedBy = null;
            question.approvedAt = null;
        }

        // Update allowed fields
        const allowedFields = [
            'title', 'description', 'difficulty', 'topics', 'tags', 'skills',
            'supportedLanguages', 'inputFormat', 'outputFormat', 'constraints',
            'executionMode', 'functionSignature', 'expectedApproach',
            'examples', 'starterCode', 'referenceSolution', 'testCases',
            'marks', 'accessScope', 'allowedRecruiters'
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                question[field] = req.body[field];
            }
        }

        if (req.body.difficulty) {
            const d = req.body.difficulty.toUpperCase();
            question.difficultyWeight = d === 'HIGH' ? 3 : d === 'MEDIUM' ? 2 : 1;
        }

        await question.save();
        res.json({ success: true, question });
    } catch (error) {
        console.error('[QUESTION-BANK] Update error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/question-bank/:id/approve
 * Approve a question (admin only)
 */
const approveQuestion = async (req, res) => {
    try {
        const question = await QuestionBank.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        // Validate that question has test cases
        if (!question.testCases || question.testCases.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot approve a question with no test cases.'
            });
        }

        // Check that test cases have valid input/output
        const invalidTestCases = question.testCases.filter(tc =>
            !tc.input && tc.input !== '' || tc.expectedOutput === undefined || tc.expectedOutput === null
        );
        if (invalidTestCases.length > 0) {
            return res.status(400).json({
                success: false,
                message: `${invalidTestCases.length} test case(s) have missing input or expected output.`
            });
        }

        question.approvalStatus = 'APPROVED';
        question.approvedBy = req.user ? (req.user.uid || req.user._id?.toString() || 'admin') : 'admin';
        question.approvedAt = new Date();
        question.rejectionReason = null;
        await question.save();

        res.json({ success: true, question, message: 'Question approved successfully.' });
    } catch (error) {
        console.error('[QUESTION-BANK] Approve error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/question-bank/:id/reject
 * Reject a question (admin only)
 */
const rejectQuestion = async (req, res) => {
    try {
        const question = await QuestionBank.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        question.approvalStatus = 'REJECTED';
        question.rejectionReason = req.body.reason || 'Rejected by admin.';
        await question.save();

        res.json({ success: true, question, message: 'Question rejected.' });
    } catch (error) {
        console.error('[QUESTION-BANK] Reject error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/question-bank/:id/archive
 * Archive a question (admin only)
 */
const archiveQuestion = async (req, res) => {
    try {
        const question = await QuestionBank.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        question.approvalStatus = 'ARCHIVED';
        await question.save();

        res.json({ success: true, question, message: 'Question archived.' });
    } catch (error) {
        console.error('[QUESTION-BANK] Archive error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/question-bank/:id/validate
 * Validate test cases by running reference solution (admin only)
 */
const validateTestCases = async (req, res) => {
    try {
        const question = await QuestionBank.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        if (!question.testCases || question.testCases.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No test cases to validate.'
            });
        }

        // Get reference solution
        const refSolution = question.referenceSolution;
        let code = null;
        let language = 'python';

        if (refSolution) {
            if (refSolution.get) {
                // Mongoose Map
                code = refSolution.get('python') || refSolution.get('javascript') || null;
                language = refSolution.get('python') ? 'python' : 'javascript';
            } else if (typeof refSolution === 'object') {
                code = refSolution.python || refSolution.javascript || null;
                language = refSolution.python ? 'python' : 'javascript';
            }
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'No reference solution available for validation. Add a Python or JavaScript reference solution.'
            });
        }

        // Execute against all test cases using existing sandbox
        const result = await executeAgainstTestCases({
            code,
            language,
            testCases: question.testCases.map(tc => ({
                _id: tc._id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden,
                category: tc.category
            })),
            maskHiddenDetails: false
        });

        // Update validation status per test case
        let validatedCount = 0;
        let failedCount = 0;
        for (const tcResult of result.results) {
            const tc = question.testCases.id(tcResult.id);
            if (tc) {
                if (tcResult.passed) {
                    tc.validationStatus = 'VALIDATED';
                    validatedCount++;
                } else {
                    tc.validationStatus = 'FAILED_VALIDATION';
                    failedCount++;
                }
            }
        }

        question.testCasesValidatedAt = new Date();
        question.validationMetrics = {
            totalGenerated: question.testCases.length,
            validatedCount,
            failedCount,
            validationMethod: 'REFERENCE_SOLUTION_EXECUTION'
        };

        await question.save();

        res.json({
            success: true,
            validationResult: {
                total: result.total,
                passed: result.passed,
                failed: result.failed,
                status: result.status,
                executionTime: result.executionTime,
                details: result.results
            },
            question
        });
    } catch (error) {
        console.error('[QUESTION-BANK] Validate error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/question-bank/:id/grant-access
 * Grant recruiter access to a restricted question (admin only)
 */
const grantAccess = async (req, res) => {
    try {
        const question = await QuestionBank.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        const { recruiterIds } = req.body;
        if (!recruiterIds || !Array.isArray(recruiterIds)) {
            return res.status(400).json({ success: false, message: 'recruiterIds array is required.' });
        }

        // Add unique recruiter IDs
        const existingSet = new Set(question.allowedRecruiters);
        recruiterIds.forEach(id => existingSet.add(id));
        question.allowedRecruiters = [...existingSet];

        if (question.accessScope === 'PUBLIC') {
            question.accessScope = 'RESTRICTED';
        }

        await question.save();
        res.json({ success: true, question, message: 'Access granted.' });
    } catch (error) {
        console.error('[QUESTION-BANK] Grant access error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/question-bank/:id
 * Delete a question (admin only, soft delete via archive preferred)
 */
const deleteQuestion = async (req, res) => {
    try {
        const question = await QuestionBank.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }

        // Soft delete — archive instead of hard delete
        question.approvalStatus = 'ARCHIVED';
        await question.save();

        res.json({ success: true, message: 'Question archived (soft-deleted).' });
    } catch (error) {
        console.error('[QUESTION-BANK] Delete error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════
// RECRUITER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/question-bank/import-to-job
 * Import selected questions from the bank into a job's coding round.
 * Creates new CodingQuestion documents linked to the job's CodingRound.
 * Does NOT modify the bank questions themselves.
 */
const importToJob = async (req, res) => {
    try {
        const { jobId, questionIds, syncQuestions, replaceExisting } = req.body;

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Valid jobId is required.' });
        }
        if (!Array.isArray(questionIds)) {
            return res.status(400).json({ success: false, message: 'questionIds array is required.' });
        }

        // Validate job ownership
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found.' });
        }

        const userIsAdmin = isAdmin(req.user);
        const userId = req.user.uid || req.user._id.toString();
        if (!userIsAdmin && job.recruiterId !== userId) {
            return res.status(403).json({ success: false, message: 'You do not own this job.' });
        }

        // Get or create coding round for the job
        let codingRound = await CodingRound.findOne({ jobId });
        if (!codingRound) {
            codingRound = new CodingRound({
                jobId,
                totalTime: 60,
                timerType: 'overall',
                languages: ['python', 'javascript'],
                instructions: '',
                status: 'draft',
                questions: []
            });
            await codingRound.save();

            // Link coding round to job
            await Job.findByIdAndUpdate(jobId, {
                codingRoundId: codingRound._id,
                'codingAssessment.enabled': true
            });
        }

        // Handle empty questionIds when syncing (user deleted all questions)
        if (questionIds.length === 0) {
            if (syncQuestions || replaceExisting) {
                await CodingQuestion.deleteMany({ codingRoundId: codingRound._id });
                codingRound.questions = [];
                await codingRound.save();
                try {
                    const { invalidateCache } = require('../middleware/cacheMiddleware');
                    invalidateCache('/api/jobs');
                } catch (_) {}
                return res.json({
                    success: true,
                    message: 'All questions removed from coding round.',
                    imported: 0,
                    codingRoundId: codingRound._id
                });
            }
            return res.status(400).json({ success: false, message: 'questionIds array cannot be empty.' });
        }

        // Fetch bank questions — only approved ones
        const bankQuestions = await QuestionBank.find({
            _id: { $in: questionIds },
            approvalStatus: 'APPROVED'
        });

        if (bankQuestions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No approved questions found for the provided IDs.'
            });
        }

        // Access check: ensure recruiter has access to all selected questions
        if (!userIsAdmin) {
            for (const bq of bankQuestions) {
                if (bq.accessScope === 'RESTRICTED' && !bq.allowedRecruiters.includes(userId)) {
                    return res.status(403).json({
                        success: false,
                        message: `You do not have access to question: ${bq.title}`
                    });
                }
            }
        }

        // If syncQuestions/replaceExisting is requested, remove questions not in bankQuestions
        if (syncQuestions || replaceExisting) {
            const requestedTitles = new Set(bankQuestions.map(b => b.title));
            const existingRoundQuestions = await CodingQuestion.find({ codingRoundId: codingRound._id });
            const toDelete = existingRoundQuestions.filter(eq => !requestedTitles.has(eq.title));
            if (toDelete.length > 0) {
                const toDeleteIds = toDelete.map(d => d._id);
                await CodingQuestion.deleteMany({ _id: { $in: toDeleteIds } });
                codingRound.questions = codingRound.questions.filter(qid => !toDeleteIds.some(dId => dId.toString() === qid.toString()));
            }
        }

        // Create CodingQuestion documents (existing model) from bank questions
        const importedQuestions = [];
        const duplicates = [];

        for (const bq of bankQuestions) {
            // Check if this bank question was already imported to this round
            const existingImport = await CodingQuestion.findOne({
                codingRoundId: codingRound._id,
                title: bq.title
            });
            if (existingImport) {
                duplicates.push(bq.title);
                continue;
            }

            // Create a new CodingQuestion (existing schema) from bank question
            const newQuestion = new CodingQuestion({
                codingRoundId: codingRound._id,
                title: bq.title,
                description: bq.description,
                inputFormat: bq.inputFormat || '',
                outputFormat: bq.outputFormat || '',
                constraints: bq.constraints || '',
                expectedApproach: bq.expectedApproach || '',
                examples: (bq.examples || []).map(ex => ({
                    input: ex.input || '',
                    output: ex.output || '',
                    explanation: ex.explanation || ''
                })),
                testCases: (bq.testCases || []).map(tc => {
                    let cat = tc.category || 'NORMAL';
                    const catUpper = String(cat).toUpperCase();
                    if (catUpper === 'BASIC') cat = 'NORMAL';
                    else if (catUpper === 'EDGE') cat = 'EDGE_CASE';
                    return {
                        input: tc.input || '',
                        expectedOutput: tc.expectedOutput || '',
                        isHidden: tc.isHidden || false,
                        category: cat,
                        explanation: tc.explanation || '',
                        validationStatus: tc.validationStatus || 'VALIDATED',
                        source: 'QUESTION_BANK',
                        timeoutMs: tc.timeoutMs || 6000
                    };
                }),
                difficulty: bq.difficulty,
                difficultyWeight: bq.difficultyWeight || 2,
                marks: bq.marks || 10,
                allowedLanguages: bq.supportedLanguages || [],
                executionMode: bq.executionMode || 'STDIN',
                functionSignature: bq.functionSignature || null,
                referenceSolution: bq.referenceSolution ? (bq.referenceSolution.get ? bq.referenceSolution.get('python') : bq.referenceSolution.python) : null,
                validationStatus: 'VALIDATED'
            });

            await newQuestion.save();
            importedQuestions.push(newQuestion);

            // Add to coding round questions array
            codingRound.questions.push(newQuestion._id);

            // Increment usage count on bank question
            await QuestionBank.findByIdAndUpdate(bq._id, { $inc: { usageCount: 1 } });
        }

        // Deduplicate and filter valid ObjectIds in codingRound.questions
        const currentRoundDocs = await CodingQuestion.find({ codingRoundId: codingRound._id });
        codingRound.questions = currentRoundDocs.map(d => d._id);
        await codingRound.save();

        // Calculate dynamic marks distribution so remaining questions have updated marks
        const { calculateDynamicMarks } = require('../utils/codingScoreCalculator');
        if (currentRoundDocs.length > 0) {
            const calcs = calculateDynamicMarks(currentRoundDocs);
            for (const c of calcs) {
                await CodingQuestion.findByIdAndUpdate(c.id, {
                    difficulty: c.difficulty,
                    difficultyWeight: c.difficultyWeight,
                    marks: c.maximumMarks
                });
            }
        }

        try {
            const { invalidateCache } = require('../middleware/cacheMiddleware');
            invalidateCache('/api/jobs');
        } catch (_) {}

        res.json({
            success: true,
            message: `${importedQuestions.length} question(s) imported successfully.`,
            imported: importedQuestions.length,
            duplicatesSkipped: duplicates,
            codingRoundId: codingRound._id
        });
    } catch (error) {
        console.error('[QUESTION-BANK] Import error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/question-bank/stats
 * Get question bank statistics (admin only)
 */
const getStats = async (req, res) => {
    try {
        const [total, approved, pending, rejected, archived, draft] = await Promise.all([
            QuestionBank.countDocuments(),
            QuestionBank.countDocuments({ approvalStatus: 'APPROVED' }),
            QuestionBank.countDocuments({ approvalStatus: 'PENDING_REVIEW' }),
            QuestionBank.countDocuments({ approvalStatus: 'REJECTED' }),
            QuestionBank.countDocuments({ approvalStatus: 'ARCHIVED' }),
            QuestionBank.countDocuments({ approvalStatus: 'DRAFT' })
        ]);

        const byDifficulty = await QuestionBank.aggregate([
            { $match: { approvalStatus: { $ne: 'ARCHIVED' } } },
            { $group: { _id: '$difficulty', count: { $sum: 1 } } }
        ]);

        const byTopic = await QuestionBank.aggregate([
            { $match: { approvalStatus: { $ne: 'ARCHIVED' } } },
            { $unwind: '$topics' },
            { $group: { _id: '$topics', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        const byDifficultyMap = byDifficulty.reduce((acc, d) => { acc[d._id] = d.count; return acc; }, {});

        res.json({
            success: true,
            stats: {
                total, approved, pending, rejected, archived, draft,
                byDifficulty: byDifficultyMap,
                byDifficultyList: byDifficulty,
                byTopic
            }
        });
    } catch (error) {
        console.error('[QUESTION-BANK] Stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/question-bank/bulk-approve
 * Bulk approve multiple questions (admin only)
 */
const bulkApprove = async (req, res) => {
    try {
        const { questionIds } = req.body;
        if (!questionIds || !Array.isArray(questionIds)) {
            return res.status(400).json({ success: false, message: 'questionIds array is required.' });
        }

        const approvedBy = req.user ? (req.user.uid || req.user._id?.toString() || 'admin') : 'admin';
        const result = await QuestionBank.updateMany(
            {
                _id: { $in: questionIds },
                approvalStatus: { $ne: 'APPROVED' },
                'testCases.0': { $exists: true }  // Must have at least 1 test case
            },
            {
                $set: {
                    approvalStatus: 'APPROVED',
                    approvedBy,
                    approvedAt: new Date(),
                    rejectionReason: null
                }
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} question(s) approved.`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('[QUESTION-BANK] Bulk approve error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    listQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    approveQuestion,
    rejectQuestion,
    archiveQuestion,
    validateTestCases,
    grantAccess,
    deleteQuestion,
    importToJob,
    getStats,
    bulkApprove
};
