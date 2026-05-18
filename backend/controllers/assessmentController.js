const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const QuestionLog = require('../models/QuestionLog');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { callSkillAI } = require('../utils/aiClients');
const { generateHash } = require('../utils/helpers');
const uniqueStrings = (values = []) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const FALLBACK_QUESTIONS = {
    javascript: [
        {
            type: "mcq",
            question: "Which of the following is NOT a primitive data type in JavaScript?",
            options: ["String", "Number", "Object", "Boolean"],
            correctAnswer: 2
        },
        {
            type: "mcq",
            question: "What is the primary difference between 'let' and 'var' declarations in JS?",
            options: [
                "let has block scope, var has function scope",
                "let has function scope, var has block scope",
                "let is hoisted, var is not",
                "let allows duplicate declarations, var does not"
            ],
            correctAnswer: 0
        },
        {
            type: "coding",
            question: "Write a function `fibonacci(n)` that returns the n-th Fibonacci number. Assume n >= 0.",
            starterCode: "function fibonacci(n) {\n  // Write your code here\n}"
        },
        {
            type: "mcq",
            question: "What is the purpose of the 'Promise.all' method in JavaScript?",
            options: [
                "Runs promises sequentially",
                "Resolves when all promises resolve, or rejects if any promise rejects",
                "Resolves when the first promise resolves",
                "Cancels all pending promises"
            ],
            correctAnswer: 1
        },
        {
            type: "coding",
            question: "Write a function `deepClone(obj)` that returns a deep copy of a given object.",
            starterCode: "function deepClone(obj) {\n  // Write your code here\n}"
        }
    ],
    react: [
        {
            type: "mcq",
            question: "What is the main purpose of React Virtual DOM?",
            options: [
                "To store states globally",
                "To optimize rendering performance by minimizing direct DOM manipulation",
                "To enable server-side rendering",
                "To handle routing in single page applications"
            ],
            correctAnswer: 1
        },
        {
            type: "mcq",
            question: "Which Hook should you use to run side effects in a functional React component?",
            options: ["useState", "useContext", "useEffect", "useReducer"],
            correctAnswer: 2
        },
        {
            type: "coding",
            question: "Create a React component `Counter` that increments and decrements a count on button click.",
            starterCode: "import React, { useState } from 'react';\n\nexport default function Counter() {\n  // Write your component here\n}"
        },
        {
            type: "mcq",
            question: "What does the 'key' prop do in React list items?",
            options: [
                "Secures list elements",
                "Provides unique styling",
                "Helps React identify which items have changed, been added, or been removed",
                "Acts as index in array"
            ],
            correctAnswer: 2
        }
    ],
    python: [
        {
            type: "mcq",
            question: "In Python, which of the following data types is mutable?",
            options: ["List", "Tuple", "String", "Integer"],
            correctAnswer: 0
        },
        {
            type: "coding",
            question: "Write a Python function `is_anagram(s1, s2)` that returns True if two strings are anagrams, False otherwise.",
            starterCode: "def is_anagram(s1: str, s2: str) -> bool:\n    # Write your code here\n    pass"
        },
        {
            type: "mcq",
            question: "What is the output of `[x**2 for x in range(3)]` in Python?",
            options: ["[0, 1, 4]", "[1, 4, 9]", "[0, 1, 2]", "[1, 2, 3]"],
            correctAnswer: 0
        }
    ],
    sql: [
        {
            type: "mcq",
            question: "Which SQL clause is used to filter group results after aggregation?",
            options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
            correctAnswer: 1
        },
        {
            type: "coding",
            question: "Write a SQL query to find the second highest salary from an `Employee` table.",
            starterCode: "-- Select the second highest salary\nSELECT Max(Salary) FROM Employee WHERE Salary < (SELECT Max(Salary) FROM Employee);"
        }
    ]
};

const generateDynamicFallback = (skill, count) => {
    const questions = [];
    const skillName = String(skill).trim();
    
    questions.push({
        type: "mcq",
        skill: skillName,
        question: `In ${skillName}, what is the best practice for managing configuration states across production deployments?`,
        options: [
            "Store configurations directly inside codebase files",
            "Use centralized environment variables (.env / Secrets Manager)",
            "Hardcode credentials in database scripts",
            "Disable configuration controls altogether"
        ],
        correctAnswer: 1,
        difficulty: "medium"
    });
    
    questions.push({
        type: "mcq",
        skill: skillName,
        question: `Which of the following represents a primary constraint when architecting scalable workloads in ${skillName}?`,
        options: [
            "Minimizing database concurrency controls",
            "Resource acquisition locks and latency bottlenecks",
            "Using legacy monolithic designs exclusively",
            "Avoiding automated logging and trace frameworks"
        ],
        correctAnswer: 1,
        difficulty: "medium"
    });

    questions.push({
        type: "coding",
        skill: skillName,
        question: `Write a robust utility script or configuration blueprint for initializing a resilient ${skillName} worker loop.`,
        starterCode: `// Resilient ${skillName} Initializer\nfunction initializeWorker() {\n  // Implement startup logic\n}`,
        difficulty: "medium"
    });

    questions.push({
        type: "mcq",
        skill: skillName,
        question: `What is the most effective approach to handle unexpected exceptions or resource leaks in ${skillName}?`,
        options: [
            "Ignore errors and let the process restart indefinitely",
            "Implement structured try-catch-finally blocks with active connection cleanup",
            "Re-throw errors globally without logging",
            "Hard-reboot the production hardware cluster"
        ],
        correctAnswer: 1,
        difficulty: "medium"
    });

    questions.push({
        type: "coding",
        skill: skillName,
        question: `Implement a mock testing framework to validate the pipeline flow of ${skillName} operations.`,
        starterCode: `// Resilient test suite for ${skillName}\ndescribe('${skillName} Pipeline', () => {\n  it('should run operations successfully', () => {\n    // Write test assertions\n  });\n});`,
        difficulty: "medium"
    });

    return questions.slice(0, count);
};

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
        const application = await Application.findOne({ jobId: new mongoose.Types.ObjectId(jobId), userId });

        // Only enforce resume match if resume analysis is enabled
        const isResumeEnabled = job.resumeAnalysis?.enabled !== false;
        if (isResumeEnabled) {
            if (!application) {
                return res.status(400).json({ message: "You must apply (upload resume) first" });
            }
            const minThreshold = (job.minPercentage || 60) * 0.20;
            if (application.resumeMatchPercent < minThreshold) {
                return res.status(400).json({ message: `Resume match below ${job.minPercentage || 60}%` });
            }
        }

        // 🎯 Config
        const totalQuestions = Math.min(job.assessment.totalQuestions || 5, 10);
        const assessmentType = (job.assessment.type || 'mixed').toLowerCase();
        const skills = job.skills || ['General'];
        const usedHashes = new Set((await QuestionLog.find({ userId }).select('hash')).map(q => q.hash));
        const seed = crypto.randomBytes(8).toString('hex');
        
        // 🧠 Groq Prompt
        const prompt = `
Generate exactly ${totalQuestions} unique ${assessmentType.toUpperCase()} questions about: ${skills.join(', ')}.
Target Role: ${job.title}
Job Context: ${job.description.substring(0, 500)}...
Session Seed: ${seed}

TASK: 
- Create a diverse set of original questions tailored specifically to the ${job.title} role.
- For MLOps roles, cover a mix of: Model Deployment, Monitoring, Infrastructure, and Automation.
- Do NOT repeat common or basic questions. Focus on practical, real-world technical scenarios.
- Each user should get unique questions (use the Session Seed: ${seed} to vary the focus).

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
        console.log("[ASSESSMENT] Calling AI service...");
        let parsed = null;

        try {
            const rawResponse = await callSkillAI(prompt);
            if (rawResponse) {
                let cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBrace = cleanedResponse.indexOf('{');
                const lastBrace = cleanedResponse.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
                }
                parsed = JSON.parse(cleanedResponse);
            }
        } catch (e) {
            console.error("[ASSESSMENT] AI failed or returned invalid JSON. Using local fallback...", e);
        }

        // Trigger premium local fallback generator if the response is empty or malformed
        if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
            console.warn("[ASSESSMENT] AI service unavailable or returned incorrect question structure. Triggering high-fidelity local fallback questions...");
            
            const selectedQuestions = [];
            skills.forEach(skill => {
                const normSkill = String(skill).toLowerCase().trim();
                const fallbackSet = FALLBACK_QUESTIONS[normSkill] || generateDynamicFallback(skill, 5);
                fallbackSet.forEach(q => {
                    selectedQuestions.push({
                        type: q.type,
                        skill: q.skill || skill,
                        question: q.question,
                        options: q.options || [],
                        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
                        starterCode: q.starterCode || "",
                        difficulty: "medium"
                    });
                });
            });

            // Deduplicate by question text
            const seen = new Set();
            const uniqueFallbacks = selectedQuestions.filter(q => {
                const key = q.question;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            // Shuffle and slice
            const shuffled = uniqueFallbacks.sort(() => 0.5 - Math.random());
            parsed = {
                questions: shuffled.slice(0, totalQuestions)
            };
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

        // If we still don't have enough questions after filtering by usedHashes, run a second pass ignoring usedHashes!
        if (finalQuestions.length < totalQuestions) {
            for (const q of parsed.questions) {
                const hash = generateHash(q.question);
                const alreadyAdded = finalQuestions.some(added => generateHash(added.question) === hash);
                if (alreadyAdded) continue;
                
                const type = (q.type || 'mcq').toLowerCase();
                if (type === 'mcq') {
                    if (!Array.isArray(q.options) || q.options.length < 2) continue;
                    if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
                        q.correctAnswer = 0;
                    }
                } else if (type === 'coding') {
                    if (!q.starterCode) q.starterCode = "// Write your solution here";
                }
                
                finalQuestions.push(q);
                if (finalQuestions.length >= totalQuestions) break;
            }
        }

        // Final trim
        const output = finalQuestions.slice(0, totalQuestions);
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
        res.status(500).json({ message: "Assessment generation failed", error: error.message });
    }
};

/* ===========================
   SUBMIT ASSESSMENT
   =========================== */
const submitAssessment = async (req, res) => {
    try {
        const { jobId, userId, sessionId, questions, answers } = req.body;

        if (!jobId || !userId || !sessionId || !Array.isArray(questions) || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let correctCount = 0;
        const processedAnswers = answers.map((ans, idx) => {
            const question = questions[idx];
            let isCorrect = false;
            let score = 0;

            if (question.type === 'mcq') {
                const correctOption = question.options[question.correctAnswer];
                isCorrect = ans.userAnswer === correctOption;
                score = isCorrect ? 1 : 0;
                if (isCorrect) correctCount++;
            } else if (question.type === 'coding') {
                if (ans.userAnswer && ans.userAnswer.trim().length > 20) {
                    isCorrect = true;
                    score = 1;
                    correctCount++;
                }
            }

            return {
                questionId: question._id || null,
                question: question.question,
                questionType: question.type,
                skill: question.skill || 'General',
                userAnswer: ans.userAnswer,
                correctAnswer: question.type === 'mcq' ? question.options[question.correctAnswer] : question.starterCode,
                isCorrect,
                score
            };
        });

        const finalScore = Math.round((correctCount / questions.length) * 30);

        const submission = await AssessmentSubmission.create({
            jobId,
            userId,
            sessionId,
            questions,
            answers: processedAnswers,
            totalQuestions: questions.length,
            correctAnswers: correctCount,
            score: finalScore
        });

        console.log(`[ASSESSMENT] ✅ Submission saved for user ${userId} - Score: ${finalScore}%`);

        res.json({
            success: true,
            submissionId: submission._id,
            score: finalScore,
            totalQuestions: questions.length,
            correctAnswers: correctCount
        });
    } catch (error) {
        console.error("[SUBMIT ASSESSMENT ERROR]", error);
        res.status(500).json({ message: "Failed to submit assessment", error: error.message });
    }
};

/* ===========================
   GET ASSESSMENT DETAILS (RECRUITER)
   =========================== */
const getAssessmentDetails = async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ message: "Invalid application ID" });
        }

        const application = await Application.findById(applicationId).populate('jobId');
        if (!application) {
            return res.status(404).json({ message: "Application not found" });
        }

        const submission = await AssessmentSubmission.findOne({
            jobId: application.jobId._id,
            userId: application.userId
        }).sort({ submittedAt: -1 });

        if (!submission) {
            return res.status(404).json({ message: "No assessment submission found for this application" });
        }

        res.json({
            application: {
                id: application._id,
                applicantName: application.applicantName,
                applicantEmail: application.applicantEmail
            },
            job: {
                title: application.jobId?.title,
                skills: application.jobId?.skills
            },
            assessment: {
                score: submission.score,
                totalQuestions: submission.totalQuestions,
                correctAnswers: submission.correctAnswers,
                submittedAt: submission.submittedAt,
                questions: submission.questions.map((q, idx) => ({
                    ...q.toObject(),
                    userAnswer: submission.answers[idx]?.userAnswer,
                    isCorrect: submission.answers[idx]?.isCorrect,
                    answerScore: submission.answers[idx]?.score
                }))
            }
        });
    } catch (error) {
        console.error("[GET ASSESSMENT DETAILS ERROR]", error);
        res.status(500).json({ message: "Failed to fetch assessment details", error: error.message });
    }
};

module.exports = { generateFullAssessment, submitAssessment, getAssessmentDetails };
