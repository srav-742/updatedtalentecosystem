const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const QuestionLog = require('../models/QuestionLog');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { callSkillAI } = require('../utils/aiClients');
const { generateHash } = require('../utils/helpers');
const { deductCoins } = require('../services/coinService');

const generateFullAssessment = async (req, res) => {
    try {
        const { jobId, userId } = req.body;
        if (!jobId || !userId) {
            return res.status(400).json({ message: "jobId and userId are required" });
        }
        // 🔒 Validation
        const job = await Job.findById(jobId).lean(); // 👈 Critical: use .lean()
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }
        // Coerce to boolean to handle "true" strings if any, though lean() usually helps
        const isEnabled = job.assessment && (job.assessment.enabled === true || job.assessment.enabled === "true");
        if (!isEnabled) {
            console.log("[DEBUG] Assessment config:", job.assessment);
            return res.status(400).json({ message: "Assessment not enabled for this job" });
        }
        const user = await User.findOne({ uid: userId });
        // Removed unnecessary ResumeProfile check. Application record is the source of truth.
        const application = await Application.findOne({ jobId: new mongoose.Types.ObjectId(jobId), userId });
        if (!application) {
            return res.status(400).json({ message: "You must apply to the job first" });
        }
        if (application.resumeMatchPercent < (job.minPercentage || 60)) {
            return res.status(400).json({ message: `Resume match below ${job.minPercentage || 60}%` });
        }
        await deductCoins(userId, 20, 'Skill Assessment');
        // 🎯 Config
        const totalQuestions = Math.min(job.assessment.totalQuestions || 5, 10);
        const assessmentType = (job.assessment.type || 'mixed').toLowerCase();
        const skills = job.skills || ['General'];
        const usedHashes = new Set((await QuestionLog.find({ userId }).select('hash')).map(q => q.hash));
        const seed = crypto.randomBytes(8).toString('hex');
        // 🧠 Groq Prompt
        const prompt = `
Generate exactly ${totalQuestions} unique ${assessmentType.toUpperCase()} questions about: ${skills.join(', ')}.
Session Seed: ${seed}

Return ONLY a JSON object with key "questions" containing an array. 
Each question must be original and different from common examples.

Each question must have:
- "type": "mcq" or "coding"
- "skill": one of the given skills
- "question": clear, original question text
- "difficulty": "medium"

For "mcq":
- "options": array of 4 unique strings
- "correctAnswer": integer (0-3)

For "coding":
- "starterCode": string with function signature

Example:
{"questions":[{"type":"mcq","skill":"JavaScript","question":"What is the result of 1 + '1' in JS?","options":["11","2","NaN","Error"],"correctAnswer":0}]}

NO extra text, explanations, or markdown.
`;
        // 🔁 Call AI
        const rawResponse = await callSkillAI(prompt);
        if (!rawResponse) {
            console.error("[ASSESSMENT] AI response was null");
            return res.status(503).json({ message: "AI service unavailable. Please try again." });
        }

        // ✅ Robust JSON Extraction
        let parsed;
        try {
            let cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBrace = cleanedResponse.indexOf('{');
            const lastBrace = cleanedResponse.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
            }
            parsed = JSON.parse(cleanedResponse);
        } catch (e) {
            console.error("[ASSESSMENT JSON PARSE FAILED]:", rawResponse.substring(0, 500));
            return res.status(503).json({ message: "AI returned invalid JSON formatting." });
        }

        if (!parsed?.questions || !Array.isArray(parsed.questions)) {
            console.error("[ASSESSMENT] Invalid structure:", parsed);
            return res.status(503).json({ message: "AI returned incorrect question structure." });
        }
        // 🔒 Dedupe & Save
        const finalQuestions = [];
        for (const q of parsed.questions) {
            if (!q.question || typeof q.question !== 'string') continue;
            const hash = generateHash(q.question);
            if (usedHashes.has(hash)) continue;
            const type = (q.type || 'mcq').toLowerCase();
            if (type === 'mcq') {
                if (!Array.isArray(q.options) || q.options.length < 2) continue;
                if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
                    q.correctAnswer = 0;
                }
            } else if (type === 'coding') {
                if (!q.starterCode) q.starterCode = "// Write your solution here";
            }
            // Save to log
            try {
                await QuestionLog.create({
                    questionText: q.question,
                    skill: q.skill || 'General',
                    difficulty: 'medium',
                    category: type.toUpperCase(),
                    hash,
                    userId
                });
            } catch (e) {
                // Soft fail
            }
            finalQuestions.push(q);
            usedHashes.add(hash);
            if (finalQuestions.length >= totalQuestions) break;
        }
        // Final trim
        const output = finalQuestions.slice(0, totalQuestions);
        if (output.length < 3) {
            return res.status(503).json({
                message: "Elite assessment failed. Generated only " + output.length + " questions (< 3)."
            });
        }
        console.log(`[ASSESSMENT] ✅ Generated ${output.length} questions (Requested: ${totalQuestions}) for user ${userId}`);
        res.json({
            sessionId: seed,
            questions: output,
            job: {
                title: job.title,
                skills: job.skills,
                assessment: {
                    type: assessmentType,
                    passingScore: job.assessment.passingScore || 70,
                    totalQuestions: totalQuestions
                }
            }
        });
    } catch (error) {
        console.error("[ASSESSMENT ERROR]", error);
        res.status(500).json({ message: "Assessment generation failed" });
    }
};

module.exports = { generateFullAssessment };
