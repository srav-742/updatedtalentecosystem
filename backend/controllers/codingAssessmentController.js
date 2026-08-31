const CodingRound = require('../models/CodingRound');
const CodingQuestion = require('../models/CodingQuestion');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { callGemini, safeParseAIJson } = require('../utils/aiClients');
const { invalidateCache } = require('../middleware/cacheMiddleware');
const mongoose = require('mongoose');

// ─── Coding Round Controllers ──────────────────────────────

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

        const question = new CodingQuestion({
            codingRoundId,
            title: title || 'Coding Question',
            description: description || '',
            inputFormat: inputFormat || '',
            outputFormat: outputFormat || '',
            constraints: constraints || '',
            expectedApproach: expectedApproach || '',
            examples: Array.isArray(examples) ? examples : [],
            difficulty: difficulty || 'Medium',
            marks: marks || 10,
            allowedLanguages: allowedLanguages || [],
            timer: timer || 0
        });
        await question.save();

        await CodingRound.findByIdAndUpdate(codingRoundId, {
            $push: { questions: question._id }
        });

        res.json({ success: true, question });
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

        const question = await CodingQuestion.findByIdAndUpdate(questionId, req.body, { new: true });
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found.' });
        }
        res.json({ success: true, question });
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

        let totalScore = 0;
        let maxScore = 0;
        const processedAnswers = [];

        // Grade each question using Gemini AI
        for (const ans of answers) {
            const question = await CodingQuestion.findById(ans.questionId);
            if (!question) continue;

            maxScore += question.marks || 10;

            const systemPrompt = `You are an expert technical interviewer and code reviewer. Your job is to grade the candidate's coding solution for a programming challenge.
You must return a raw JSON object fitting this schema:
{
  "score": <integer score out of the maximum marks, e.g. if max marks is 10, return a value 0-10>,
  "feedback": "Detailed constructive feedback on correctness, efficiency, code quality, and style."
}`;

            const userPrompt = `
Programming Challenge:
Title: ${question.title}
Description: ${question.description}
Constraints: ${question.constraints}
Max Marks: ${question.marks || 10}

Candidate's Solution:
Language: ${ans.language || 'python'}
Code:
\`\`\`${(ans.language || 'python').toLowerCase()}
${ans.code}
\`\`\`

Evaluate this solution. Check if it:
1. Solves the problem logic correctly.
2. Satisfies the constraints.
3. Follows clean coding standards.

Provide a score out of ${question.marks || 10} and clear feedback.
`;

            let gradeResult = { score: 0, feedback: 'Grading failed.' };
            try {
                const responseText = await callGemini(userPrompt, 1000, true, systemPrompt, 0.5);
                const parsed = safeParseAIJson(responseText, null);
                if (parsed && typeof parsed.score === 'number') {
                    gradeResult = parsed;
                }
            } catch (err) {
                console.error('[CODING-GRADE] AI Grading failed for question:', question._id, err.message);
            }

            totalScore += gradeResult.score;
            processedAnswers.push({
                questionId: question._id,
                questionTitle: question.title,
                code: ans.code,
                language: ans.language,
                score: gradeResult.score,
                feedback: gradeResult.feedback
            });
        }

        // Scale coding score to out of 30 as defined in overall weighting system
        const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        const scaledScore = Math.round((percentageScore / 100) * 30);

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
            codingScore: scaledScore,
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

        // Recalculate Application final score
        const r = application.resumeMatchPercent || 0;
        const a = application.assessmentScore || 0;
        const c = application.codingScore || 0;
        const i = application.interviewScore || 0;
        application.finalScore = r + a + c + i;

        // Verify completion flags
        const job = application.jobId;
        const isResumeDone = !job || job.resumeAnalysis?.enabled === false || (application.resumeMatchPercent !== null && application.resumeMatchPercent !== undefined);
        const isAssessmentDone = !job || !job.assessment?.enabled || (application.assessmentScore !== null && application.assessmentScore !== undefined);
        const isCodingDone = !job || !job.codingAssessment?.enabled || (application.codingScore !== null && application.codingScore !== undefined);
        const isInterviewDone = !job || !job.mockInterview?.enabled || (application.interviewScore !== null && application.interviewScore !== undefined);

        if (isResumeDone && isAssessmentDone && isCodingDone && isInterviewDone && application.finalScore >= 55) {
            application.status = 'SHORTLISTED';
        } else {
            application.status = 'APPLIED';
        }
        await application.save();

        res.json({
            success: true,
            codingScore: scaledScore,
            percentageScore
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

        res.json({
            success: true,
            codingScore: application.codingScore,
            codingAnswers: application.codingAnswers
        });
    } catch (error) {
        console.error('[CODING-ASSESSMENT] Get Details Error:', error);
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
    getCodingAssessmentDetails
};
