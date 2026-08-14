const pdf = require('pdf-parse');
const CodingRound = require('../models/CodingRound');
const CodingQuestion = require('../models/CodingQuestion');
const Job = require('../models/Job');
const { callSkillAI, safeParseAIJson, callGemini } = require('../utils/aiClients');
const { invalidateCache } = require('../middleware/cacheMiddleware');
const mongoose = require('mongoose');

/**
 * POST /api/custom-coding-assessments/generate
 * Generates custom coding assessment questions using AI.
 */
const generateCustomCodingQuestions = async (req, res) => {
    try {
        const { language, normalCount, moderateCount, highCount, jobTitle, jobDescription } = req.body;

        if (!language) {
            return res.status(400).json({ success: false, message: 'Programming language is required.' });
        }

        const countNormal = Math.max(0, parseInt(normalCount) || 0);
        const countModerate = Math.max(0, parseInt(moderateCount) || 0);
        const countHigh = Math.max(0, parseInt(highCount) || 0);

        if (countNormal + countModerate + countHigh === 0) {
            return res.status(400).json({ success: false, message: 'At least one question must be requested.' });
        }

        // Parse uploaded file text if present
        let fileText = '';
        if (req.file) {
            const fileName = req.file.originalname.toLowerCase();
            console.log(`[CUSTOM-CODING-AI] Parsing uploaded reference file: ${fileName}`);
            try {
                if (fileName.endsWith('.pdf')) {
                    const parsedPdf = await pdf(req.file.buffer);
                    fileText = (parsedPdf.text || '').trim();
                } else {
                    fileText = req.file.buffer.toString('utf8').trim();
                }
            } catch (err) {
                console.warn('[CUSTOM-CODING-AI] File extraction failed, using blank fallback:', err.message);
            }
        }

        const systemPrompt = `You are an expert technical interviewer, senior software developer, and coding question extractor. Your task is to extract exact programming/coding questions contained in reference documents and structure them correctly as challenges. Do not invent new questions if the document contains coding questions. Do not write multiple choice questions. Always return a raw JSON array of objects fitting the exact schema requested.`;

        const userPrompt = `
You are analyzing a reference document that contains specific coding/programming questions uploaded by a recruiter.

CRITICAL REQUIREMENT:
If the reference context document contains actual programming/coding questions, tasks, or challenges, you MUST extract and transcribe those EXACT questions. Do not invent new questions in this case. Preserve their logic, titles, descriptions, and rules, adapting them only to fit the JSON schema and the programming language "${language}" if necessary (e.g. providing appropriate template constraints, examples, and test cases).

If the reference context document does NOT contain specific coding questions but rather a syllabus, topics, or general description, generate logical coding questions matching those topics in "${language}".

Job Details:
- Title: ${jobTitle || 'Software Engineer'}
- Description: ${jobDescription || 'Programming assessment'}

Reference Context Document Text:
"""
${fileText ? fileText : 'No context provided. Generate general programming topics.'}
"""

Programming Language: ${language}

Quantity and Difficulty Targets (if generating or if matching extracted questions):
- ${countNormal} Easy questions
- ${countModerate} Medium questions
- ${countHigh} Hard questions

Return strictly a JSON array of objects. Do NOT include markdown code blocks or backticks. Only return the raw JSON array.
Each question object in the JSON array must follow this exact format:
{
  "title": "Clear question title",
  "description": "Detailed explanation of the problem, input constraints, and expectations.",
  "inputFormat": "Description of input format",
  "outputFormat": "Description of output format",
  "constraints": "Time and space complexity requirements, input range limits.",
  "expectedApproach": "Optimal coding approach description",
  "difficulty": "Easy" | "Medium" | "Hard",
  "marks": <integer rating, e.g. 10 for Easy, 20 for Medium, 30 for Hard>,
  "allowedLanguages": ["${language}"],
  "examples": [
    {
      "input": "Sample input value",
      "output": "Expected sample output value",
      "explanation": "Explanation of the sample example test case logic"
    }
  ]
}
`;

        console.log(`[CUSTOM-CODING-AI] Invoking Gemini AI to extract ${countNormal} Easy, ${countModerate} Medium, ${countHigh} Hard questions for ${language}...`);
        const responseText = await callGemini(userPrompt, 3500, true, systemPrompt, 0.7);

        if (!responseText) {
            throw new Error('AI service returned an empty response.');
        }

        let questions = safeParseAIJson(responseText, []);
        if (questions && !Array.isArray(questions) && Array.isArray(questions.questions)) {
            questions = questions.questions;
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate questions. AI did not return a valid array of coding questions.',
                rawResponse: responseText
            });
        }

        res.json({ success: true, questions });
    } catch (error) {
        console.error('[CUSTOM-CODING-AI] Generation Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/custom-coding-assessments/save
 * Saves the approved coding round questions in database.
 */
const saveCustomCodingRound = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { jobId, questions, totalTime, languages } = req.body;

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Valid jobId is required.' });
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one question is required to save coding round.' });
        }

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
            codingRound.languages = languages || [];
            codingRound.status = 'published';
            codingRound.questions = [];
        } else {
            codingRound = new CodingRound({
                jobId,
                totalTime: totalTime || 60,
                timerType: 'overall',
                languages: languages || [],
                instructions: 'Write the code logic. Make sure to satisfy the examples and constraints.',
                status: 'published',
                questions: []
            });
        }

        await codingRound.save({ session });

        // Save each question
        const savedQuestionIds = [];
        for (const q of questions) {
            const questionDoc = new CodingQuestion({
                codingRoundId: codingRound._id,
                title: q.title || 'Coding Challenge',
                description: q.description || '',
                inputFormat: q.inputFormat || '',
                outputFormat: q.outputFormat || '',
                constraints: q.constraints || '',
                expectedApproach: q.expectedApproach || '',
                examples: Array.isArray(q.examples) ? q.examples : [],
                difficulty: q.difficulty || 'Medium',
                marks: parseInt(q.marks) || 10,
                allowedLanguages: Array.isArray(q.allowedLanguages) ? q.allowedLanguages : languages,
                timer: 0
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
            console.warn('[CUSTOM-CODING-AI] Failed to invalidate jobs cache:', cacheErr.message);
        }

        res.json({
            success: true,
            message: 'Coding assessment round saved and published successfully.',
            codingRoundId: codingRound._id
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('[CUSTOM-CODING-AI] Save Round Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    generateCustomCodingQuestions,
    saveCustomCodingRound
};
