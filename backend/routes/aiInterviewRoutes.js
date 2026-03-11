const express = require('express');
const router = express.Router();
const { callInterviewAI } = require('../utils/aiClients');
const { generateSpeech } = require('../services/tts.service');
const crypto = require('crypto');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const Application = require('../models/Application');
const Job = require('../models/Job');

// In-memory session store
const interviewSessions = new Map();

// ─── Role Classification ─────────────────────────────────────────────────────
// Keywords used to determine if a role is "tech" (development, engineering, data, etc.)
const TECH_KEYWORDS = [
    'developer', 'engineer', 'engineering', 'software', 'frontend', 'backend',
    'fullstack', 'full-stack', 'full stack', 'devops', 'data scientist',
    'data engineer', 'machine learning', 'ml engineer', 'ai engineer',
    'cloud engineer', 'sre', 'site reliability', 'qa engineer', 'test engineer',
    'automation engineer', 'security engineer', 'architect', 'programmer',
    'coding', 'development', 'web developer', 'mobile developer', 'ios developer',
    'android developer', 'react', 'node', 'python developer', 'java developer',
    'dba', 'database administrator', 'network engineer', 'systems engineer',
    'embedded', 'firmware', 'blockchain', 'web3', 'solidity', 'cybersecurity',
    'penetration tester', 'infrastructure', 'platform engineer', 'tech lead',
    'technical lead', 'cto', 'vp engineering', 'it engineer', 'it developer'
];

/**
 * Determines if a job is a technical role based on title, description, and skills.
 * Returns { isTech: boolean, roleCategory: string }
 */
function classifyRole(job) {
    if (!job) return { isTech: false, roleCategory: 'general' };

    const titleLower = (job.title || '').toLowerCase();
    const descLower = (job.description || '').toLowerCase();
    const skillsLower = (job.skills || []).map(s => s.toLowerCase());

    let techScore = 0;

    // Check title (strongest signal)
    for (const kw of TECH_KEYWORDS) {
        if (titleLower.includes(kw)) { techScore += 3; break; }
    }

    // Check description
    let descMatches = 0;
    for (const kw of TECH_KEYWORDS) {
        if (descLower.includes(kw)) descMatches++;
    }
    if (descMatches >= 3) techScore += 2;
    else if (descMatches >= 1) techScore += 1;

    // Check skills for tech-centric skills
    const techSkills = ['javascript', 'python', 'java', 'c++', 'react', 'node', 'angular',
        'vue', 'typescript', 'go', 'rust', 'sql', 'nosql', 'mongodb', 'postgresql',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'git',
        'html', 'css', 'api', 'rest', 'graphql', 'microservices', 'linux',
        'solidity', 'blockchain', 'machine learning', 'deep learning', 'tensorflow',
        'pytorch', 'scikit', 'pandas', 'numpy', 'spark', 'hadoop', 'kafka',
        'redis', 'elasticsearch', 'ci/cd', 'jenkins', 'flask', 'django', 'spring',
        'ruby', 'rails', 'swift', 'kotlin', 'flutter', 'dart', '.net', 'c#'];

    for (const skill of skillsLower) {
        if (techSkills.some(ts => skill.includes(ts))) techScore += 1;
    }

    const isTech = techScore >= 3;

    // Determine a more granular role category for prompt engineering
    let roleCategory = 'general';
    if (isTech) {
        roleCategory = 'technical';
    } else if (/sales|business development|bd |bde|account executive|account manager/i.test(titleLower + ' ' + descLower)) {
        roleCategory = 'sales';
    } else if (/marketing|brand|growth|seo|sem|content|social media/i.test(titleLower + ' ' + descLower)) {
        roleCategory = 'marketing';
    } else if (/hr |human resource|talent acquisition|recruiter|people ops/i.test(titleLower + ' ' + descLower)) {
        roleCategory = 'hr';
    } else if (/finance|accounting|chartered|cpa|audit|treasury/i.test(titleLower + ' ' + descLower)) {
        roleCategory = 'finance';
    } else if (/operations|supply chain|logistics|procurement|warehouse/i.test(titleLower + ' ' + descLower)) {
        roleCategory = 'operations';
    } else if (/design|ui|ux|graphic|creative|art director/i.test(titleLower + ' ' + descLower)) {
        roleCategory = 'design';
    } else if (/manager|management|director|lead|head of/i.test(titleLower)) {
        roleCategory = 'management';
    }

    return { isTech, roleCategory };
}

/**
 * Build the system prompt dynamically based on role classification.
 */
function buildSystemPrompt(roleInfo, job) {
    const { isTech, roleCategory } = roleInfo;
    const jobTitle = job?.title || 'the role';

    if (isTech) {
        return `
You are a senior technical interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- You are interviewing for a TECHNICAL role. Focus primarily on the job description requirements.
- 80% of your questions MUST be derived directly from the job description — responsibilities, required technologies, and domain knowledge.
- 20% of your questions should reference the candidate's resume to validate their claimed experience relevant to this role.
- Ask about system design, architecture decisions, debugging approaches, and code-level trade-offs relevant to the job.
- Dive into implementation details specific to the technologies mentioned in the job description.

INTERVIEW CONDUCT:
- Be professional, structured, and rigorous — like a real senior engineering interviewer at a top company.
- Each question should naturally flow from the candidate's previous answer.
- If the candidate gives a strong answer, go deeper. If they struggle, gracefully pivot to a related but different topic from the job description.
- Ask ONE question at a time. Never bundle multiple questions.
- Do NOT use conversational filler like "Great answer!" or "That's interesting!" — stay focused and professional.
- STRICT RULE: NEVER REPEAT a question that has already been asked in this interview. Provide a completely new question each time. Do not repeat the same specific topic if it has already been covered.
- Respond with ONLY the next interview question. Ensure the question is complete, concise, and professional. Do not cut off mid-sentence.
- Respond with ONLY the question text. Nothing else.
`;
    }

    // Non-tech roles: Category-specific prompts
    const categoryPrompts = {
        sales: `
You are a senior sales/business development interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% of questions must come from the JD — target market, sales methodology, pipeline management, revenue targets, and client engagement strategies described.
- Only 10% of questions should reference the candidate's resume (e.g., verifying past achievements or industry experience).
- Evaluate: negotiation skills, objection handling, relationship building, market knowledge, and commercial acumen.
- Ask situational and behavioral questions: "Tell me about a time when..." or "How would you handle..."
`,
        marketing: `
You are a senior marketing interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% questions from the JD — campaigns, channels, metrics, brand strategy, and growth targets described.
- Only 10% from the candidate's resume.
- Evaluate: strategic thinking, campaign planning, analytics mindset, creativity, and ROI focus.
- Ask about real scenarios: "Walk me through how you would plan a campaign for..." or "How do you measure success for..."
`,
        hr: `
You are a senior HR/People Operations interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% questions from the JD — talent acquisition, employee engagement, compliance, HRIS, and people strategy described.
- Only 10% from the candidate's resume.
- Evaluate: empathy, conflict resolution, labor law knowledge, organizational development, and strategic HR thinking.
`,
        finance: `
You are a senior finance interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% questions from the JD — financial analysis, reporting, compliance, budgeting, and forecasting requirements described.
- Only 10% from the candidate's resume.
- Evaluate: analytical rigor, attention to detail, regulatory knowledge, and financial modeling skills.
`,
        operations: `
You are a senior operations interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% questions from the JD — process optimization, supply chain, vendor management, and KPIs described.
- Only 10% from the candidate's resume.
- Evaluate: process thinking, problem-solving under constraints, efficiency mindset, and cross-functional collaboration.
`,
        design: `
You are a senior design interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% questions from the JD — design systems, user research, wireframing, prototyping, and brand guidelines described.
- Only 10% from the candidate's resume.
- Evaluate: design thinking, user empathy, visual communication skills, and ability to iterate based on feedback.
`,
        management: `
You are a senior interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% questions from the JD — team leadership, strategic planning, stakeholder management, and KPIs described.
- Only 10% from the candidate's resume.
- Evaluate: leadership style, decision-making under pressure, team building, conflict resolution, and strategic vision.
`,
        general: `
You are a senior professional interviewer conducting a formal interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 90% questions must come from the JD — role responsibilities, required qualifications, and key deliverables described.
- Only 10% from the candidate's resume.
- Evaluate: domain knowledge, problem-solving, communication skills, and cultural fit for the role.
`
    };

    const basePrompt = categoryPrompts[roleCategory] || categoryPrompts.general;

    return basePrompt + `
INTERVIEW CONDUCT:
- Be professional, structured, and rigorous — like a real interview panel at a reputable organization.
- Each question should naturally flow from the candidate's previous answer.
- If the candidate gives a strong answer, go deeper into that topic. If they struggle, gracefully pivot to another aspect of the job description.
- Ask ONE question at a time. Never bundle multiple questions.
- Do NOT use conversational filler like "Great answer!" or "That's interesting!" — stay focused and professional.
- Use a mix of situational, behavioral, and competency-based questions appropriate for the role.
- STRICT RULE: NEVER REPEAT a question that has already been asked in this interview. Provide a completely new question each time. Do not repeat the same specific topic if it has already been covered.
- Respond with ONLY the next interview question. Ensure the question is complete, concise, and professional. Do not cut off mid-sentence.
- Respond with ONLY the question text. Nothing else.
`;
}

/**
 * Build the first question prompt with proper JD-vs-resume weighting.
 */
function buildFirstQuestionPrompt(job, structured, roleInfo, specialInstructions) {
    const { isTech, roleCategory } = roleInfo;
    const resumeWeight = isTech ? '20%' : '10%';
    const jdWeight = isTech ? '80%' : '90%';

    return `
=== JOB DESCRIPTION (PRIMARY SOURCE — ${jdWeight} of questions should come from this) ===
Title: ${job?.title || 'Not specified'}
Description: ${job?.description || 'Not specified'}
Required Skills: ${(job?.skills || []).join(', ') || 'Not specified'}
Experience Level: ${job?.experienceLevel || 'Not specified'}
Job Type: ${job?.type || 'Not specified'}

=== CANDIDATE RESUME (SECONDARY SOURCE — only ${resumeWeight} of questions should reference this) ===
${JSON.stringify(structured)}

=== RECRUITER'S SPECIAL INSTRUCTIONS ===
${specialInstructions || 'None'}

=== ROLE CLASSIFICATION ===
Role Type: ${isTech ? 'Technical' : 'Non-Technical'}
Category: ${roleCategory}

=== TASK ===
You are starting the interview. Ask the FIRST question.

RULES:
- The first question MUST be derived from the JOB DESCRIPTION, not the resume.
- Start with a strong, role-specific opening question that assesses the candidate's understanding of the core responsibilities described in the JD.
- For ${isTech ? 'technical roles: ask about a key technology, architecture pattern, or technical challenge mentioned in the JD.' : 'non-technical roles: ask about a core responsibility, business scenario, or domain-specific challenge mentioned in the JD.'}
- Do NOT ask generic questions like "Tell me about yourself" — dive directly into the role.
- Return ONLY the question. Nothing else. Ensure the question is a complete sentence and fully addresses the role requirements.
`;
}

/**
 * Build the follow-up question prompt with conversation context and question tracking.
 */
function buildNextQuestionPrompt(session, questionNumber) {
    const { roleInfo, specialInstructions, resumeProfile } = session;
    const { isTech, roleCategory } = roleInfo;
    const resumeWeight = isTech ? '20%' : '10%';
    const jdWeight = isTech ? '80%' : '90%';
    const totalQuestions = 10;

    // Determine if this question should be resume-based
    // For tech: questions 4 and 8 are resume-based (2 out of 10 = 20%)
    // For non-tech: question 7 is resume-based (1 out of 10 = 10%)
    const resumeQuestionSlots = isTech ? [4, 8] : [7];
    const isResumeQuestion = resumeQuestionSlots.includes(questionNumber);

    const askedQuestions = session.history
        .filter(h => h.role === 'interviewer')
        .map((h, i) => `${i + 1}. ${h.content}`)
        .join('\n');

    const thread = session.history.map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`).join('\n');

    let questionDirective;
    if (isResumeQuestion) {
        questionDirective = `
THIS IS A RESUME-BASED QUESTION (${resumeWeight} allocation).
- Ask a question that VALIDATES something specific from the candidate's resume.
- Connect it to the job description when possible — e.g., "I see you've worked with X technology. In this role, we need Y. How would your experience with X translate?"
- Focus on verifying claimed skills/experience that are relevant to the job.
`;
    } else {
        questionDirective = `
THIS IS A JOB-DESCRIPTION-BASED QUESTION (${jdWeight} allocation).
- Ask a question directly related to the responsibilities, requirements, or challenges described in the job description.
- Base the question on the candidate's PREVIOUS ANSWER — if they mentioned something relevant, drill deeper; if they struggled, pivot to another JD topic.
- ${isTech
                ? 'For technical roles: focus on implementation, system design, debugging, performance optimization, or architectural decisions related to the JD.'
                : 'For non-technical roles: use situational/behavioral questions tied to the JD responsibilities — "How would you handle...", "Walk me through how you would approach..."'}
`;
    }

    return `
=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Required Skills: ${(session.jobSkills || []).join(', ') || 'Not specified'}
Experience Level: ${session.experienceLevel || 'Not specified'}

=== CANDIDATE RESUME ===
${JSON.stringify(resumeProfile)}

=== RECRUITER'S SPECIAL INSTRUCTIONS ===
${specialInstructions || 'None'}

=== INTERVIEW PROGRESS ===
Question ${questionNumber} of ${totalQuestions}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory})

=== CONVERSATION SO FAR ===
${thread}

=== QUESTION DIRECTIVE ===
${questionDirective}

=== PREVIOUSLY ASKED QUESTIONS (CRITICAL: DO NOT REPEAT THESE) ===
${askedQuestions}

=== TASK ===
Based on the interview flow above, ask the NEXT interview question (Question ${questionNumber}).
- CRITICAL RULE: DO NOT REPEAT any topics/questions from the "PREVIOUSLY ASKED QUESTIONS" list. Pick a purely new topic from the Job Description.
- Make it flow naturally from the candidate's last answer.
- If the candidate gave a strong answer, go deeper. If they were weak, gracefully shift to another relevant topic from the JD.
- Match the difficulty to the experience level: ${session.experienceLevel || 'entry-level'}.
- Return ONLY the question. Nothing else. Ensure the question flows from the previous answer and is complete.
`;
}

/**
 * Build the evaluation prompt for final scoring.
 */
function buildEvalPrompt(session) {
    const { roleInfo } = session;
    const { isTech, roleCategory } = roleInfo;
    const conversation = session.history.map(h => `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`).join('\n');

    return `
You are a senior ${isTech ? 'technical' : 'professional'} interview evaluator.

=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory})

=== EVALUATION CRITERIA ===
${isTech ? `
- Technical depth and accuracy of answers
- Problem-solving approach and analytical thinking
- System design and architecture understanding
- Knowledge of required technologies from the JD
- Communication clarity when explaining technical concepts
` : `
- Domain knowledge relevant to the job description
- Problem-solving and situational judgement
- Communication and interpersonal skills
- Strategic thinking and business acumen
- Practical experience alignment with the JD requirements
`}

=== INTERVIEW TRANSCRIPT ===
${conversation}

=== TASK ===
Evaluate this interview and return ONLY a JSON object:
{
  "score": <number 0-100>,
  "feedback": "<concise 2-3 sentence professional summary of the candidate's performance, highlighting strengths and areas for improvement>"
}
`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Start interview
router.post('/start', async (req, res) => {
    try {
        const { jobId, userId } = req.body;
        if (!jobId || !userId) return res.status(400).json({ message: "jobId and userId are required" });

        // Fetch resume data
        let resume = await ResumeAnalysis.findOne({ userId, jobId });
        let structured = resume?.structured;

        if (!structured) {
            const ResumeProfile = require('../models/ResumeProfile');
            const profile = await ResumeProfile.findOne({ userId });
            if (profile) {
                structured = {
                    skills: profile.skills,
                    projects: profile.projects,
                    experienceYears: profile.experienceYears
                };
            }
        }

        // Final fallback
        if (!structured) structured = { message: "No resume data available." };

        // Fetch job details
        const job = await Job.findById(jobId);
        const specialInstructions = job?.specialInstructions || "";

        // Classify the role
        const roleInfo = classifyRole(job);
        console.log(`[INTERVIEW-START] Role Classification: ${JSON.stringify(roleInfo)} | Job: ${job?.title}`);

        // Build role-specific system prompt
        const systemPrompt = buildSystemPrompt(roleInfo, job);

        // Build first question prompt (JD-focused)
        const firstQPrompt = buildFirstQuestionPrompt(job, structured, roleInfo, specialInstructions);

        let firstQuestion = await callInterviewAI(firstQPrompt, 1000, false, systemPrompt);

        if (!firstQuestion) {
            // Fallback: role-appropriate generic question
            firstQuestion = roleInfo.isTech
                ? "Looking at the job description, could you walk me through your experience with the core technologies we require and how you've applied them in production environments?"
                : `For this ${job?.title || 'role'}, could you describe how you would approach the primary responsibilities outlined in the job description based on your professional experience?`;
        }

        // Voice generation (TTS)
        let audioBase64 = null;
        try {
            const buffer = await generateSpeech(firstQuestion);
            if (buffer) audioBase64 = buffer.toString('base64');
        } catch (e) { console.warn("TTS failed"); }

        const sessionId = crypto.randomBytes(16).toString('hex');
        interviewSessions.set(sessionId, {
            userId, jobId,
            resumeProfile: structured,
            specialInstructions,
            roleInfo,
            jobTitle: job?.title || '',
            jobDescription: job?.description || '',
            jobSkills: job?.skills || [],
            experienceLevel: job?.experienceLevel || '',
            systemPrompt,
            history: [{ role: 'interviewer', content: firstQuestion }]
        });

        res.json({ success: true, sessionId, question: firstQuestion, audio: audioBase64 });
    } catch (error) {
        console.error("Start Error:", error);
        res.status(500).json({ success: false, message: "Failed to start" });
    }
});

// Next question
router.post('/next', async (req, res) => {
    try {
        const { sessionId, answerText } = req.body;
        const session = interviewSessions.get(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        session.history.push({ role: 'candidate', content: answerText });
        const interviewers = session.history.filter(h => h.role === 'interviewer');

        // End after 10 questions
        if (interviewers.length >= 10) {
            console.log(`[INTERVIEW-END] Finalizing session for user: ${session.userId}`);
            const evalPrompt = buildEvalPrompt(session);

            let evaluation = { score: 70, feedback: "Interview completed. Performance was satisfactory." };
            try {
                const resText = await callInterviewAI(
                    evalPrompt,
                    1500,
                    true,
                    `You are a senior ${session.roleInfo.isTech ? 'technical' : 'professional'} evaluator. Analyze this interview objectively.`
                );
                console.log("[INTERVIEW-EVAL] Raw AI Response:", resText);
                if (resText) {
                    const match = resText.match(/\{[\s\S]*\}/);
                    const parsed = JSON.parse(match ? match[0] : resText);
                    const rawScore = Number(parsed?.score);
                    if (parsed && !isNaN(rawScore) && rawScore >= 1 && rawScore <= 100) {
                        evaluation.score = Math.max(25, Math.min(95, rawScore));
                        evaluation.feedback = parsed.feedback || evaluation.feedback;
                    }
                }
            } catch (e) {
                console.error("[INTERVIEW-EVAL] Parsing failed:", e.message);
            }

            console.log("[INTERVIEW-EVAL] Final Score:", evaluation.score);

            await Application.findOneAndUpdate(
                { userId: session.userId, jobId: session.jobId },
                {
                    interviewScore: evaluation.score,
                    status: 'APPLIED',
                    resultsVisibleAt: new Date(),
                    interviewAnswers: session.history.filter((_, i) => i % 2 === 0).map((h, i) => ({
                        question: h.content,
                        answer: session.history[i * 2 + 1]?.content || "",
                        score: evaluation.score,
                        feedback: evaluation.feedback
                    }))
                },
                { upsert: true }
            );

            // Update final score
            const app = await Application.findOne({ userId: session.userId, jobId: session.jobId }).populate('jobId');
            if (app) {
                const r = Number(app.resumeMatchPercent || 0);
                const a = Number(app.assessmentScore || 0);
                const i = Number(app.interviewScore || 0);

                let totalScore = 0;
                let numModules = 0;
                const job = app.jobId;

                if (job) {
                    if (job.resumeAnalysis && job.resumeAnalysis.enabled) {
                        totalScore += r;
                        numModules++;
                    }
                    if (job.assessment && job.assessment.enabled) {
                        totalScore += a;
                        numModules++;
                    }
                    if (job.mockInterview && job.mockInterview.enabled) {
                        totalScore += i;
                        numModules++;
                    }
                }

                if (numModules === 0) {
                    totalScore = r + a + i;
                    numModules = 3;
                }

                app.finalScore = Math.round(totalScore / numModules);

                if (app.finalScore >= 60) app.status = 'SHORTLISTED';

                await app.save();
                console.log(`[INTERVIEW-EVAL] Application Updated. Final Score: ${app.finalScore}`);
            }

            interviewSessions.delete(sessionId);
            return res.json({ hasNext: false, finalScore: evaluation.score, feedback: evaluation.feedback });
        }

        // Determine next question number
        const nextQuestionNumber = interviewers.length + 1;

        // Build role-aware follow-up prompt
        const nextPrompt = buildNextQuestionPrompt(session, nextQuestionNumber);

        let nextQuestion = await callInterviewAI(nextPrompt, 1000, false, session.systemPrompt);

        if (!nextQuestion) {
            nextQuestion = session.roleInfo.isTech
                ? "Can you elaborate on the technical implementation details of that approach?"
                : "Could you walk me through how you would specifically handle that situation in this role?";
        }

        // Voice generation (TTS)
        let audioBase64 = null;
        try {
            const buffer = await generateSpeech(nextQuestion);
            if (buffer) audioBase64 = buffer.toString('base64');
        } catch (e) { console.warn("TTS failed"); }

        session.history.push({ role: 'interviewer', content: nextQuestion });

        res.json({
            hasNext: true,
            question: nextQuestion,
            audio: audioBase64,
            currentQuestionNumber: session.history.filter(h => h.role === 'interviewer').length
        });
    } catch (error) {
        console.error("Next Error:", error);
        res.status(500).json({ success: false, message: "Error" });
    }
});

module.exports = router;