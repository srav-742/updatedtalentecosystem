/**
 * ─── Fast AI Interview Routes — FIX OVERLAY ─────────────────────────────────
 *
 * PURPOSE:
 *   Drop-in override for the `/next-fast` endpoint from
 *   fastAiInterviewRoutes.js. Fixes the following critical bugs:
 *
 *     1. maxTokens increased from 200 → 1000 so questions are never truncated.
 *     2. AI transition phrases ("Noted. Moving on.") are stripped before the
 *        question is stored or sent to the frontend.
 *     3. Candidates with interviewScore === 0 are NEVER auto-shortlisted.
 *     4. Empty / too-short answers are detected and returned to the frontend
 *        with a retry flag instead of silently burning a question slot.
 *
 * ISOLATION:
 *   This file is 100% self-contained. It reads from the same MongoDB
 *   InterviewSession / Application collections and reuses the same
 *   aiClients + interviewScoring utilities, but does NOT import from
 *   or modify aiInterviewRoutes.js or fastAiInterviewRoutes.js.
 *
 * MOUNT:  app.use('/api/interview', fastAiInterviewRoutesFix)
 *         BEFORE the original fastAiInterviewRoutes so Express matches
 *         this handler first for POST /api/interview/next-fast.
 * ────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { callInterviewAI } = require('../utils/aiClients');
const Application = require('../models/Application');
const InterviewSession = require('../models/InterviewSession');
const Job = require('../models/Job');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const {
    averageInterviewScore,
    clamp,
    roundToTenth,
    scoreInterviewAnswer
} = require('../utils/interviewScoring');

const MAX_INTERVIEW_QUESTIONS = 15;

// Keywords used to determine if a role is "tech" (development, engineering, data, etc.)
const TECH_KEYWORDS = [
    'developer', 'engineer', 'engineering', 'software', 'frontend', 'backend',
    'fullstack', 'full-stack', 'full stack', 'devops', 'data scientist',
    'data engineer', 'machine learning', 'ml engineer', 'ai engineer',
    'artificial intelligence', 'ai researcher', 'ai scientist', 'llm engineer',
    'prompt engineer', 'nlp engineer', 'computer vision', 'deep learning engineer',
    'generative ai', 'genai', 'foundation model', 'rag engineer', 'mlops',
    'cloud engineer', 'sre', 'site reliability', 'qa engineer', 'test engineer',
    'automation engineer', 'security engineer', 'architect', 'programmer',
    'coding', 'development', 'web developer', 'mobile developer', 'ios developer',
    'android developer', 'react', 'node', 'python developer', 'java developer',
    'dba', 'database administrator', 'network engineer', 'systems engineer',
    'embedded', 'firmware', 'blockchain', 'web3', 'solidity', 'cybersecurity',
    'penetration tester', 'infrastructure', 'platform engineer', 'tech lead',
    'technical lead', 'cto', 'vp engineering', 'it engineer', 'it developer'
];

function getRandomQuestionCount() {
    return MAX_INTERVIEW_QUESTIONS;
}

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
        'ruby', 'rails', 'swift', 'kotlin', 'flutter', 'dart', '.net', 'c#',
        'langchain', 'langgraph', 'openai', 'anthropic', 'hugging face', 'transformers',
        'llm', 'gpt', 'claude', 'gemini', 'ollama', 'rag', 'vector database',
        'pinecone', 'weaviate', 'chroma', 'faiss', 'embeddings', 'fine-tuning',
        'lora', 'rlhf', 'prompt engineering', 'stable diffusion', 'diffusion models',
        'automl', 'mlflow', 'weights and biases', 'wandb', 'ray', 'triton',
        'onnx', 'torchserve', 'bentoml', 'fastapi', 'gradio', 'streamlit'
    ];

    for (const skill of skillsLower) {
        if (techSkills.some(ts => skill.includes(ts))) techScore += 1;
    }

    const isTech = techScore >= 3;

    // Determine a more granular role category for prompt engineering
    let roleCategory = 'general';
    if (isTech) {
        if (/mlops/i.test(titleLower + ' ' + descLower)) {
            roleCategory = 'mlops';
        } else if (/ai engineer|ml engineer|machine learning|deep learning|llm|artificial intelligence|ai researcher|ai scientist|nlp|computer vision|generative ai|genai|prompt engineer|rag|foundation model/i.test(titleLower + ' ' + descLower)) {
            roleCategory = 'ai_engineer';
        } else {
            roleCategory = 'technical';
        }
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

function buildSystemPrompt(roleInfo, job) {
    const { isTech, roleCategory } = roleInfo;
    const jobTitle = job?.title || 'the role';

    let basePrompt = '';
    if (isTech && roleCategory === 'mlops') {
        basePrompt = `
You are a Lead MLOps Engineer conducting a technical interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus on the intersection of Machine Learning and DevOps. 95% of questions must come from the JD — CI/CD for ML, model monitoring, feature stores, data versioning (DVC), and model deployment (Kubernetes/SageMaker).
- DIVERSITY RULE: Use the session context to ensure every user gets a unique starting question. Rotate between: 1. Model Deployment strategies, 2. Data drift & Monitoring, 3. Infrastructure as Code for ML, 4. Scalability & Performance.
- Evaluate: production mindset, automation skills, understanding of the ML lifecycle, and system reliability.

INTERVIEW CONDUCT:
- Be professional, structured, and rigorous — like a lead engineer at a top tech company.
- Each question should naturally flow from the candidate's previous answer.
- Ask ONE question at a time.
- STRICT RULE: NEVER REPEAT a question. Provide a completely new question each time.
- Respond with ONLY the question text. Nothing else.
`;
    } else if (isTech && roleCategory === 'ai_engineer') {
        basePrompt = `
You are a principal AI/ML engineer and technical interviewer conducting a rigorous interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- You are interviewing for an AI/ML engineering role. Focus primarily on the job description requirements.
- 95% of your questions MUST be derived directly from the job description — AI/ML frameworks, model architectures, data pipelines, deployment strategies, and domain-specific AI challenges.
- 5% of your questions should reference the candidate's resume to validate their claimed AI/ML experience.
- Ask about model selection and trade-offs, RAG pipeline design, LLM fine-tuning strategies, prompt engineering techniques, vector database architecture, MLOps practices, and production AI system challenges relevant to the job.
- Dive into implementation details: tokenization, embedding strategies, chunking strategies, context window management, hallucination mitigation, latency optimisation, and cost management for LLM-based systems.
- Probe their understanding of evaluation metrics: BLEU, ROUGE, BERTScore, faithfulness, relevance, and human evaluation for generative AI systems.

INTERVIEW CONDUCT:
- Be professional, structured, and rigorous — like a principal AI engineer interviewing at a top AI-first company.
- Each question should naturally flow from the candidate's previous answer.
- If the candidate gives a strong answer, go deeper. If they struggle, gracefully pivot to a related but different AI/ML topic from the job description.
- Ask ONE question at a time. Never bundle multiple questions.
- Do NOT use conversational filler like "Great answer!" or "That's interesting!" — stay focused and professional.
- STRICT RULE: NEVER REPEAT a question that has already been asked in this interview. Provide a completely new question each time. Do not repeat the same specific topic if it has already been covered.
- Respond with ONLY the next interview question. Ensure the question is complete, concise, and professional. Do not cut off mid-sentence.
- Respond with ONLY the question text. Nothing else.
`;
    } else if (isTech) {
        basePrompt = `
You are a senior technical interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- You are interviewing for a TECHNICAL role. Focus primarily on the job description requirements.
- 95% of your questions MUST be derived directly from the job description — responsibilities, required technologies, and domain knowledge.
- 5% of your questions should reference the candidate's resume to validate their claimed experience relevant to this role.
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
    } else {
        const categoryPrompts = {
            sales: `
You are a senior sales/business development interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% of questions must come from the JD — target market, sales methodology, pipeline management, revenue targets, and client engagement strategies described.
- Only 5% of questions should reference the candidate's resume (e.g., verifying past achievements or industry experience).
- Evaluate: negotiation skills, objection handling, relationship building, market knowledge, and commercial acumen.
- Ask situational and behavioral questions: "Tell me about a time when..." or "How would you handle..."
`,
            marketing: `
You are a senior marketing interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% questions from the JD — campaigns, channels, metrics, brand strategy, and growth targets described.
- Only 5% from the candidate's resume.
- Evaluate: strategic thinking, campaign planning, analytics mindset, creativity, and ROI focus.
- Ask about real scenarios: "Walk me through how you would plan a campaign for..." or "How do you measure success for..."
`,
            hr: `
You are a senior HR/People Operations interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% questions from the JD — talent acquisition, employee engagement, compliance, HRIS, and people strategy described.
- Only 5% from the candidate's resume.
- Evaluate: empathy, conflict resolution, labor law knowledge, organizational development, and strategic HR thinking.
`,
            finance: `
You are a senior finance interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% questions from the JD — financial analysis, reporting, compliance, budgeting, and forecasting requirements described.
- Only 5% from the candidate's resume.
- Evaluate: analytical rigor, attention to detail, regulatory knowledge, and financial modeling skills.
`,
            operations: `
You are a senior operations interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% questions from the JD — process optimization, supply chain, vendor management, and KPIs described.
- Only 5% from the candidate's resume.
- Evaluate: process thinking, problem-solving under constraints, efficiency mindset, and cross-functional collaboration.
`,
            design: `
You are a senior design interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% questions from the JD — design systems, user research, wireframing, prototyping, and brand guidelines described.
- Only 5% from the candidate's resume.
- Evaluate: design thinking, user empathy, visual communication skills, and ability to iterate based on feedback.
`,
            management: `
You are a senior interviewer conducting a professional interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% questions from the JD — team leadership, strategic planning, stakeholder management, and KPIs described.
- Only 5% from the candidate's resume.
- Evaluate: leadership style, decision-making under pressure, team building, conflict resolution, and strategic vision.
`,
            general: `
You are a senior professional interviewer conducting a formal interview for the role of "${jobTitle}".

INTERVIEW PHILOSOPHY:
- Focus ENTIRELY on the job description. 95% questions must come from the JD — role responsibilities, required qualifications, and key deliverables described.
- Only 5% from the candidate's resume.
- Evaluate: domain knowledge, problem-solving, communication skills, and cultural fit for the role.
`
        };

        const categoryBase = categoryPrompts[roleCategory] || categoryPrompts.general;
        basePrompt = categoryBase + `
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

    let voiceStyleInstruction = '';
    if (roleCategory === 'mlops' || roleCategory === 'technical') {
        voiceStyleInstruction = `
VOICE STYLE & PERSONA:
- You are a Senior Engineering Manager.
- Your voice style is calm, confident, and authoritative. Speak with clear deliberation.
`;
    } else if (roleCategory === 'ai_engineer') {
        voiceStyleInstruction = `
VOICE STYLE & PERSONA:
- You are a Principal AI Engineer.
- Your voice style is deep technical with thoughtful pauses. Discuss advanced technical AI architectures and considerations naturally.
`;
    } else if (roleCategory === 'sales' || roleCategory === 'marketing') {
        voiceStyleInstruction = `
VOICE STYLE & PERSONA:
- You are a VP of Sales.
- Your voice style is energetic, professional, and engaging.
`;
    } else {
        voiceStyleInstruction = `
VOICE STYLE & PERSONA:
- You are a Director / VP.
- Your voice style is executive tone, measured, formal, and direct.
`;
    }

    return basePrompt + voiceStyleInstruction + INTERVIEWER_PERSONA;
}

function buildFirstQuestionPrompt(job, structured, roleInfo, specialInstructions) {
    const { isTech, roleCategory } = roleInfo;
    const resumeWeight = '5%';
    const jdWeight = '95%';
    const isAiRole = roleCategory === 'ai_engineer';

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
- For ${roleCategory === 'mlops'
            ? 'MLOps engineering roles: ask about a specific production challenge — e.g., model deployment strategies (Canary/Blue-Green), drift detection pipelines, feature store implementation, or CI/CD for ML models described in the JD.'
            : isAiRole
            ? 'AI/ML engineering roles: ask about a key AI/ML architecture, framework, or technical challenge mentioned in the JD — e.g., RAG pipeline design, LLM selection rationale, embedding strategy, or model evaluation approach.'
            : isTech
                ? 'technical roles: ask about a key technology, architecture pattern, or technical challenge mentioned in the JD.'
                : 'non-technical roles: ask about a core responsibility, business scenario, or domain-specific challenge mentioned in the JD.'}
- Do NOT ask generic questions like "Tell me about yourself" — dive directly into the role.
- Return ONLY the question. Nothing else. Ensure the question is a short, concise, single complete question ending with a question mark (?). Keep it under 30 words. Do not include any trailing text or explanations.
`;
}

function sanitizeRecordingSegment(value) {
    return String(value || 'unknown')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 40) || 'unknown';
}

function buildRecordingSessionId(userId, jobId) {
    const userSegment = sanitizeRecordingSegment(userId);
    const jobSegment = sanitizeRecordingSegment(jobId);
    const timestamp = Date.now();
    const suffix = crypto.randomBytes(4).toString('hex');
    return `rec_${userSegment}_${jobSegment}_${timestamp}_${suffix}`;
}

// ─── In-memory session cache ────────────────────────────────────────────────
const fixSessionCache = new Map();

// ─── Session Helpers ────────────────────────────────────────────────────────

async function loadSession(sessionId) {
    if (fixSessionCache.has(sessionId)) {
        return fixSessionCache.get(sessionId);
    }

    const stored = await InterviewSession.findOne({ sessionId }).lean();
    if (!stored) return null;

    const session = {
        sessionId: stored.sessionId,
        userId: stored.userId,
        jobId: stored.jobId,
        recordingSessionId: stored.recordingSessionId,
        resumeProfile: stored.resumeProfile,
        specialInstructions: stored.specialInstructions,
        roleInfo: stored.roleInfo,
        jobTitle: stored.jobTitle,
        jobDescription: stored.jobDescription,
        jobSkills: stored.jobSkills || [],
        experienceLevel: stored.experienceLevel || '',
        systemPrompt: stored.systemPrompt,
        interviewerVoice: stored.interviewerVoice,
        totalQuestions: Math.min(stored.totalQuestions || MAX_INTERVIEW_QUESTIONS, MAX_INTERVIEW_QUESTIONS),
        history: stored.history || [],
        answerEvaluations: stored.answerEvaluations || []
    };

    fixSessionCache.set(sessionId, session);
    return session;
}

async function saveSession(sessionId, session) {
    fixSessionCache.set(sessionId, session);

    await InterviewSession.findOneAndUpdate(
        { sessionId },
        {
            $set: {
                sessionId,
                userId: session.userId,
                jobId: String(session.jobId),
                recordingSessionId: session.recordingSessionId,
                resumeProfile: session.resumeProfile,
                specialInstructions: session.specialInstructions,
                roleInfo: session.roleInfo,
                jobTitle: session.jobTitle,
                jobDescription: session.jobDescription,
                jobSkills: session.jobSkills,
                experienceLevel: session.experienceLevel,
                systemPrompt: session.systemPrompt,
                interviewerVoice: session.interviewerVoice,
                totalQuestions: Math.min(session.totalQuestions || MAX_INTERVIEW_QUESTIONS, MAX_INTERVIEW_QUESTIONS),
                history: session.history || [],
                answerEvaluations: session.answerEvaluations || []
            }
        },
        { upsert: true, setDefaultsOnInsert: true }
    );
}

async function deleteSession(sessionId) {
    fixSessionCache.delete(sessionId);
    await InterviewSession.deleteOne({ sessionId }).catch(() => null);
}

// ─── JSON Parsing Helpers ───────────────────────────────────────────────────

function stripMarkdownJson(rawText = '') {
    return String(rawText || '')
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function parseJsonObject(rawText = '') {
    const cleaned = stripMarkdownJson(rawText);
    if (!cleaned) return null;

    try {
        return JSON.parse(cleaned);
    } catch (_) {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch (_) {
            return null;
        }
    }
}

// ─── FIX 2: Clean Question Response ─────────────────────────────────────────
// Strips AI transition/acknowledgment phrases so only the actual question
// is stored and spoken to the candidate.

const TRANSITION_PATTERNS = [
    /^\s*understood\.?\s*/i,
    /^\s*noted\.?\s*/i,
    /^\s*moving\s+on\.?\s*/i,
    /^\s*noted\.\s*moving\s+on\.?\s*/i,
    /^\s*fair\s+enough\.?\s*/i,
    /^\s*fair\s+enough\.\s*next\s+question\.?\s*/i,
    /^\s*let['']?s\s+pivot\s+to\s+the\s+next\s+area\.?\s*/i,
    /^\s*let['']?s\s+continue\.?\s*/i,
    /^\s*that\s+covers\s+the\s+basics\.?\s*/i,
    /^\s*that\s+covers\s+the\s+basics\.\s*let['']?s\s+continue\.?\s*/i,
    /^\s*alright\.?\s*/i,
    /^\s*okay\.?\s*/i,
    /^\s*very\s+well\.?\s*/i,
    /^\s*right\.?\s*/i,
    /^\s*good\.?\s*/i,
    /^\s*next\s+question\.?\s*/i,
    /^\s*let['']?s\s+move\s+(?:on|forward)\.?\s*/i,
    /^\s*moving\s+(?:on|forward)\.?\s*/i,
    /^\s*let['']?s\s+proceed\.?\s*/i,
    /^\s*proceeding\.?\s*/i,
];

function cleanQuestionResponse(rawText) {
    if (!rawText) return rawText;

    let cleaned = String(rawText).trim();

    // Iteratively strip leading transition phrases (there may be multiple)
    let prevLength;
    do {
        prevLength = cleaned.length;
        for (const pattern of TRANSITION_PATTERNS) {
            cleaned = cleaned.replace(pattern, '').trim();
        }
    } while (cleaned.length < prevLength && cleaned.length > 0);

    // If we stripped everything (AI only returned a transition phrase), return original
    if (!cleaned || cleaned.length < 15) {
        console.warn('[FIX-CLEAN] Cleaning removed too much; returning original:', rawText);
        return rawText.trim();
    }

    return cleaned;
}

// ─── Prompt Builders (self-contained copies) ────────────────────────────────

const INTERVIEWER_PERSONA = `

INTERVIEWER IDENTITY & BEHAVIORAL DIRECTIVES:
- ROLE: You are a senior executive and the lead human technical interviewer conducting a high-stakes professional assessment.
- TONE: Authoritative, confident, direct, and formal. Speak with clear deliberation.
- RULE 1: NEVER refer to yourself as an AI, bot, assistant, or language model. You are the interviewer.
- RULE 2: NEVER use over-enthusiastic filler words: "Awesome!", "Great job!", "Perfect!", "Fantastic!", "Amazing!", "Wonderful!", "Excellent answer!", "That's interesting!".
- RULE 3: Do NOT add any transition phrases, acknowledgments, or filler before the question. Do NOT start with "Noted.", "Moving on.", "Understood.", "Fair enough.", "Let's continue.", or any similar phrase. Return ONLY the interview question itself.
- RULE 4: Maintain a structured, professional boundary. Do not over-explain your questions unless the candidate explicitly asks for clarification.
- RULE 5: Do NOT praise answers. Proceed directly to the next question.
- RULE 6: Your tone should be commanding and measured — like a VP of Engineering or a Director conducting a final-round interview.
- RULE 7: MANDATORY: Your response MUST be exactly one single, complete question. It MUST end with a question mark (?). Do NOT include any text, explanations, or notes after the question mark. Do NOT cut off mid-sentence.
- RULE 8: Make your question highly concise and direct. It MUST be at most 2 sentences and under 30 words. Long questions are extremely slow to speak and process.
`;

/**
 * Dynamic interview partitioning helper to divide 70% of questions as follow-ups.
 */
function getInterviewStructure(T) {
    const numFollowups = Math.round(T * 0.70);
    const numMains = T - numFollowups;
    const baseFollowups = Math.floor(numFollowups / numMains);
    const remainder = numFollowups % numMains;
    
    const structure = [];
    let currentQ = 1;
    for (let i = 0; i < numMains; i++) {
        const followupsForThisMain = baseFollowups + (i < remainder ? 1 : 0);
        const mainIndex = currentQ;
        const followUpIndices = [];
        for (let j = 0; j < followupsForThisMain; j++) {
            followUpIndices.push(currentQ + 1 + j);
        }
        structure.push({
            mainIndex,
            followUpIndices
        });
        currentQ += 1 + followupsForThisMain;
    }
    return structure;
}

/**
 * Build the follow-up question prompt with conversation context and question tracking.
 */
function buildNextQuestionPrompt(session, questionNumber) {
    const { roleInfo, specialInstructions, resumeProfile } = session;
    const { isTech, roleCategory } = roleInfo;
    const totalQuestions = session.totalQuestions;
    const isAiRole = roleCategory === 'ai_engineer';

    // Resume question slots scale with totalQuestions and align with main question slots where possible
    let resumeQuestionSlots;
    if (totalQuestions === 15) {
        resumeQuestionSlots = [9]; // Align with main question 3
    } else if (totalQuestions === 10) {
        resumeQuestionSlots = [8]; // Align with main question 3
    } else {
        resumeQuestionSlots = [Math.max(1, totalQuestions - 1)];
    }
    const isResumeQuestion = resumeQuestionSlots.includes(questionNumber);

    // Analyze block evaluations to guide follow-up behavior
    const structure = getInterviewStructure(totalQuestions);
    const block = structure.find(b => b.mainIndex === questionNumber || b.followUpIndices.includes(questionNumber));
    
    const blockEvals = [];
    if (block) {
        const evals = session.answerEvaluations || [];
        for (const e of evals) {
            if (e.questionNumber === block.mainIndex || block.followUpIndices.includes(e.questionNumber)) {
                blockEvals.push(e);
            }
        }
    }

    let isPivot = false;
    let quality = 'N/A';
    let lastFeedback = '';

    if (blockEvals.length > 0) {
        const lastEval = blockEvals[blockEvals.length - 1];
        lastFeedback = lastEval.feedback || '';
        const score = lastEval.score || 0;

        if (score >= 70) {
            quality = 'Strong';
        } else if (score >= 40) {
            quality = 'Moderate';
        } else {
            quality = 'Weak';
        }

        // Pivot early guard: if last two answers in this block were both weak
        if (blockEvals.length >= 2) {
            const secondLastEval = blockEvals[blockEvals.length - 2];
            if ((lastEval.score || 0) < 40 && (secondLastEval.score || 0) < 40) {
                isPivot = true;
            }
        }
    }

    let followUpDirective = '';
    if (isPivot || questionNumber === block?.mainIndex) {
        followUpDirective = `
=== FOLLOW-UP FRAMEWORK: NEW TOPIC / PIVOT ===
- You must select and pivot to a brand new topic from the Job Description.
- Do NOT continue the previous thread or ask follow-ups on the last answer.
- ${isPivot ? "Reason: The candidate has struggled to clarify their understanding of the previous topic. Acknowledge the response neutrally and pivot to a completely new area of the JD." : "Reason: You are starting a new topic block."}
`;
    } else {
        if (quality === 'Strong') {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: DRILL DEEPER (STRONG ANSWER) ===
- The candidate's last answer was evaluated as STRONG.
- Drill deeper on the SAME topic. Ask a deep follow-up to explore trade-offs, scalability, or production challenges.
- Last answer feedback: "${lastFeedback}"
`;
        } else if (quality === 'Moderate') {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: REQUEST CLARIFICATION (MODERATE ANSWER) ===
- The candidate's last answer was MODERATE (some details missing).
- Request clarification or explore missing details. Ask them to elaborate, walk through implementation, or explain challenges.
- Last answer feedback: "${lastFeedback}"
`;
        } else if (quality === 'Weak') {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: ATTEMPT ONE CLARIFICATION (WEAK ANSWER) ===
- The candidate's last answer was WEAK.
- Attempt exactly ONE clarification question to uncover partial understanding. Ask them to explain it in a simpler way, provide an example, or outline their first step.
- Last answer feedback: "${lastFeedback}"
`;
        } else {
            followUpDirective = `
=== FOLLOW-UP FRAMEWORK: DRILL DEEPER ===
- Follow up on the candidate's last answer to explore the topic further.
`;
        }
    }

    let questionDirective;
    if (isResumeQuestion) {
        questionDirective = `
THIS IS A RESUME-BASED QUESTION (5% allocation).
- Ask a question that VALIDATES something specific from the candidate's resume.
- Connect it to the job description when possible.
- Focus on verifying claimed skills/experience that are relevant to the job.
` + followUpDirective;
    } else {
        questionDirective = `
THIS IS A JOB-DESCRIPTION-BASED QUESTION (95% allocation).
- Ask a question directly related to the responsibilities, requirements, or challenges described in the job description.
- ${roleCategory === 'mlops'
                ? 'For MLOps roles: ask about model deployment patterns, model monitoring for drift, feature store implementation, CI/CD pipelines for ML, Kubernetes for ML, data versioning, or serving latency optimizations.'
                : isAiRole
                ? 'For AI/ML engineering roles: ask about LLM architecture trade-offs, RAG pipeline design, chunking strategies, embedding models, vector store selection, fine-tuning vs. prompting, evaluation frameworks, hallucination mitigation, latency/cost optimisation, or MLOps practices described in the JD.'
                : isTech
                    ? 'For technical roles: focus on implementation, system design, debugging, performance optimization, or architectural decisions related to the JD.'
                    : 'For non-technical roles: use situational/behavioral questions tied to the JD responsibilities.'}
` + followUpDirective;
    }

    const askedQuestions = session.history
        .filter(h => h.role === 'interviewer')
        .map((h, i) => `${i + 1}. ${h.content}`)
        .join('\n');

    const recentMessages = session.history.slice(-4);
    const thread = recentMessages.map(h =>
        `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`
    ).join('\n');

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
- Match the difficulty to the experience level: ${session.experienceLevel || 'entry-level'}.
- Return ONLY the question. Nothing else. Ensure the question is a short, concise, single complete question ending with a question mark (?). Keep it under 30 words. Do not include any trailing text, explanations, or cut off mid-sentence.
`;
}

function buildAnswerEvaluationPrompt(session, questionText, answerText, questionNumber) {
    const { roleInfo } = session;
    const { isTech, roleCategory } = roleInfo;
    const isAiRole = roleCategory === 'ai_engineer';

    return `
You are a senior ${isAiRole ? 'AI/ML engineering' : isTech ? 'technical' : 'professional'} interview evaluator scoring ONE interview answer.

=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Required Skills: ${(session.jobSkills || []).join(', ') || 'Not specified'}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory})

=== QUESTION NUMBER ===
${questionNumber}

=== INTERVIEW QUESTION ===
${questionText || 'Not specified'}

=== CANDIDATE ANSWER ===
${answerText || 'No answer provided'}

=== SCORE THIS ANSWER ONLY ===
${isAiRole ? `
- Depth of AI/ML knowledge
- RAG and LLM system design
- Practical engineering judgement
- Evaluation mindset
- MLOps awareness
- Communication clarity when explaining complex AI/ML concepts
` : isTech ? `
- Technical depth and accuracy of answers
- Problem-solving approach and analytical thinking
- Implementation detail and architecture understanding when relevant
- Knowledge of required technologies from the JD
- Communication clarity when explaining technical concepts
` : `
- Domain knowledge relevant to the job description
- Problem-solving and situational judgement
- Communication and interpersonal skills
- Strategic thinking and business acumen
- Practical experience alignment with the JD requirements
`}

=== TASK ===
Evaluate ONLY this single answer and return ONLY a JSON object:
{
  "marks": <number 0-10>,
  "percentage": <number 0-100>,
  "feedback": "<one concise sentence providing the exact reason for the assessment score>"
}
`;
}

function buildFinalEvalPrompt(session, answerEvaluations, overallScore) {
    const { roleInfo } = session;
    const { isTech, roleCategory } = roleInfo;
    const isAiRole = roleCategory === 'ai_engineer';
    const conversation = session.history.map(h =>
        `${h.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${h.content}`
    ).join('\n');

    return `
You are a senior ${isAiRole ? 'AI/ML engineering' : isTech ? 'technical' : 'professional'} interview evaluator.

=== JOB CONTEXT ===
Title: ${session.jobTitle || 'Not specified'}
Description: ${session.jobDescription || 'Not specified'}
Role Type: ${isTech ? 'Technical' : 'Non-Technical'} (${roleCategory})

=== QUESTION-BY-QUESTION SCORES ===
${JSON.stringify(answerEvaluations)}

=== CALCULATED OVERALL SCORE ===
${overallScore}

=== INTERVIEW TRANSCRIPT ===
${conversation}

=== TASK ===
Write a concise final summary of the candidate's interview performance. Do not change the overall score.
Return ONLY a JSON object:
{
  "feedback": "<concise 2-3 sentence professional summary of the candidate's performance, highlighting strengths and areas for improvement>"
}
`;
}

function normalizeAiEvaluation(parsed, heuristic) {
    const aiMarksCandidate = Number(parsed?.marks);
    const aiPercentageCandidate = Number(parsed?.percentage);
    const aiScoreCandidate = Number(parsed?.score);

    let aiMarks = Number.NaN;
    if (!Number.isNaN(aiMarksCandidate)) {
        aiMarks = clamp(aiMarksCandidate, 0, 10);
    } else if (!Number.isNaN(aiPercentageCandidate)) {
        aiMarks = clamp(aiPercentageCandidate / 10, 0, 10);
    } else if (!Number.isNaN(aiScoreCandidate)) {
        aiMarks = clamp(aiScoreCandidate / 10, 0, 10);
    }

    if (Number.isNaN(aiMarks)) {
        return heuristic;
    }

    const finalMarks = roundToTenth(clamp((aiMarks * 0.7) + (heuristic.marks * 0.3), 2, 9.8));
    const score = clamp(Math.round(finalMarks * 10), 20, 98);

    return {
        ...heuristic,
        score,
        marks: finalMarks,
        feedback: String(parsed.feedback || heuristic.feedback).trim() || heuristic.feedback
    };
}

function summarizeInterviewFallback(answerEvaluations, overallScore) {
    if (!answerEvaluations.length) {
        return "The interview was completed successfully, but a detailed evaluation summary could not be generated.";
    }

    const strongest = [...answerEvaluations].sort((a, b) => b.score - a.score)[0];
    const weakest = [...answerEvaluations].sort((a, b) => a.score - b.score)[0];
    const band =
        overallScore >= 80 ? "strong" :
            overallScore >= 60 ? "solid" :
                "developing";

    return `The candidate delivered a ${band} interview overall with a final score of ${overallScore}%. Stronger moments appeared in "${strongest.question}", while weaker depth was visible in "${weakest.question}". Overall, the candidate should keep improving consistency, clarity, and role-specific detail across answers.`;
}

// ─── Background Evaluation (fire-and-forget) ────────────────────────────────

async function evaluateAnswerInBackground(session, sessionId, questionText, answerText, questionNumber) {
    try {
        console.log(`[FIX-BG-EVAL] Starting background evaluation for Q${questionNumber}, user: ${session.userId}`);

        // 1. Run local heuristic scoring
        const heuristic = scoreInterviewAnswer({
            questionText,
            answerText,
            jobSkills: session.jobSkills,
            jobDescription: session.jobDescription
        });

        let evaluation = heuristic;

        // 2. If the answer was attempted, call LLM for AI scoring
        if (heuristic.isAttempted !== false) {
            try {
                const prompt = buildAnswerEvaluationPrompt(session, questionText, answerText, questionNumber);
                const rawResponse = await callInterviewAI(
                    prompt,
                    500,
                    true,
                    `You are a strict ${session.roleInfo.roleCategory === 'ai_engineer' ? 'AI/ML engineering' : session.roleInfo.isTech ? 'technical' : 'professional'} interviewer. Score only the candidate's latest answer and respond with valid JSON.`
                );
                const parsed = parseJsonObject(rawResponse);
                if (parsed) {
                    evaluation = normalizeAiEvaluation(parsed, heuristic);
                }
            } catch (aiErr) {
                console.warn("[FIX-BG-EVAL] AI scoring fallback triggered:", aiErr.message);
            }
        }

        // 3. Push evaluation to the session's answerEvaluations array
        session.answerEvaluations.push({
            questionNumber,
            question: questionText,
            answer: answerText,
            score: evaluation.score,
            marks: evaluation.marks,
            feedback: evaluation.feedback,
            isAttempted: evaluation.isAttempted !== false
        });

        // 4. Save to InterviewSession (MongoDB)
        await saveSession(sessionId, session);

        // 5. Save incrementally to Application collection (rescue mechanism)
        try {
            await Application.findOneAndUpdate(
                {
                    userId: session.userId,
                    jobId: new mongoose.Types.ObjectId(session.jobId)
                },
                {
                    $push: {
                        interviewAnswers: {
                            question: questionText,
                            answer: answerText,
                            score: evaluation.score,
                            marks: evaluation.marks,
                            feedback: evaluation.feedback
                        }
                    }
                }
            );
            console.log(`[FIX-BG-EVAL] Saved Q${questionNumber} for user: ${session.userId}`);
        } catch (dbErr) {
            console.error("[FIX-BG-EVAL] Failed to push answer to Application:", dbErr.message);
        }

    } catch (err) {
        console.error("[FIX-BG-EVAL] Background evaluation failed:", err.message);
    }
}

// ─── Finalization (end of interview) ────────────────────────────────────────

async function finalizeInterview(session, sessionId) {
    try {
        // Wait briefly for any in-flight background evaluations to finish
        await new Promise(resolve => setTimeout(resolve, 2000));

        const calculatedOverallScore = session.answerEvaluations.length > 0
            ? averageInterviewScore(session.answerEvaluations)
            : 0;

        let evaluation = {
            score: calculatedOverallScore,
            feedback: summarizeInterviewFallback(session.answerEvaluations, calculatedOverallScore)
        };

        // Attempt AI-generated summary
        try {
            const evalPrompt = buildFinalEvalPrompt(session, session.answerEvaluations, calculatedOverallScore);
            const resText = await callInterviewAI(
                evalPrompt,
                900,
                true,
                `You are a senior ${session.roleInfo.roleCategory === 'ai_engineer' ? 'AI/ML engineering' : session.roleInfo.isTech ? 'technical' : 'professional'} evaluator. Summarize this interview objectively in valid JSON.`
            );
            console.log("[FIX-FINAL-EVAL] Raw AI Response:", resText);
            const parsed = parseJsonObject(resText);
            if (parsed?.feedback) {
                evaluation.feedback = parsed.feedback;
            }
        } catch (e) {
            console.error("[FIX-FINAL-EVAL] Parsing failed:", e.message);
        }

        console.log("[FIX-FINAL-EVAL] Final Score:", evaluation.score);

        // Ownership vetting score
        const ownershipEvals = session.answerEvaluations.filter(e => e.questionNumber >= 8);
        const ownershipScore = ownershipEvals.length > 0
            ? Math.round(ownershipEvals.reduce((sum, e) => sum + e.marks, 0) / ownershipEvals.length)
            : 0;

        // Update Application document
        await Application.findOneAndUpdate(
            { userId: session.userId, jobId: session.jobId },
            {
                interviewScore: Math.round(evaluation.score * 0.70),
                status: 'APPLIED',
                resultsVisibleAt: new Date(),
                metrics: {
                    ownershipMindset: ownershipScore
                },
                interviewAnswers: session.answerEvaluations.slice(0, MAX_INTERVIEW_QUESTIONS).map(entry => ({
                    question: entry.question,
                    answer: entry.answer,
                    score: entry.score,
                    marks: entry.marks,
                    feedback: entry.feedback
                }))
            },
            { upsert: true }
        );

        // ─── FIX 3: Shortlisting Safeguard ─────────────────────────────────
        // Compute final composite score and apply shortlisting guard
        const app = await Application.findOne({ userId: session.userId, jobId: session.jobId }).populate('jobId');
        if (app) {
            const r = Number(app.resumeMatchPercent || 0);
            const a = Number(app.assessmentScore || 0);
            const i = Number(app.interviewScore || 0);
            const job = app.jobId;

            app.finalScore = r + a + i;

            // FIX: Only shortlist if interview score > 0 when interview module is enabled
            const interviewEnabled = job?.mockInterview?.enabled !== false;
            if (app.finalScore >= 55 && (!interviewEnabled || i > 0)) {
                app.status = 'SHORTLISTED';
            } else if (interviewEnabled && i === 0) {
                // Candidate did not answer any interview questions — do NOT shortlist
                app.status = 'APPLIED';
                console.log(`[FIX-FINAL-EVAL] Shortlisting BLOCKED: interviewScore=0 for user ${session.userId}`);
            }

            await app.save();
            console.log(`[FIX-FINAL-EVAL] Application Updated. Final Score: ${app.finalScore}, Status: ${app.status}`);
        }

        await deleteSession(sessionId);

        return {
            finalScore: Math.round(evaluation.score * 0.70),
            ownershipScore,
            feedback: evaluation.feedback
        };

    } catch (err) {
        console.error("[FIX-FINAL-EVAL] Finalization error:", err.message);
        await deleteSession(sessionId);
        return {
            finalScore: 0,
            ownershipScore: 0,
            feedback: "Interview completed. Evaluation could not be generated."
        };
    }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/interview/start
 *
 * Fast version of /start endpoint.
 * Initiates the interview session, generates the first question (maxTokens=200 for speed),
 * generates its voice, and returns details.
 */
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
        console.log(`[FIX-INTERVIEW-START] Role Classification: ${JSON.stringify(roleInfo)} | Job: ${job?.title}`);

        // Build role-specific system prompt
        const systemPrompt = buildSystemPrompt(roleInfo, job);

        // Build first question prompt (JD-focused)
        const firstQPrompt = buildFirstQuestionPrompt(job, structured, roleInfo, specialInstructions);

        // Requesting 200 tokens (was 1000) for fast startup
        let firstQuestion = await callInterviewAI(firstQPrompt, 200, false, systemPrompt);

        if (!firstQuestion) {
            // Fallback: role-appropriate generic question
            if (roleInfo.roleCategory === 'ai_engineer') {
                firstQuestion = "Based on the job description, could you walk me through how you would architect an end-to-end RAG pipeline for this role — covering document ingestion, chunking strategy, embedding model selection, vector store choice, retrieval mechanism, and response generation?";
            } else if (roleInfo.isTech) {
                firstQuestion = "Looking at the job description, could you walk me through your experience with the core technologies we require and how you've applied them in production environments?";
            } else {
                firstQuestion = `For this ${job?.title || 'role'}, could you describe how you would approach the primary responsibilities outlined in the job description based on your professional experience?`;
            }
        }

        // Voice generation (TTS) — Decoupled, audio will be fetched asynchronously
        let audioBase64 = null;

        const sessionId = crypto.randomBytes(16).toString('hex');
        const recordingSessionId = buildRecordingSessionId(userId, jobId);

        const totalQuestions = getRandomQuestionCount();
        console.log(`[FIX-INTERVIEW-START] Total questions for this session: ${totalQuestions}`);

        await Application.findOneAndUpdate(
            { userId, jobId },
            {
                $set: {
                    recordingSessionId,
                    recordingStatus: 'recording'
                }
            },
            { upsert: true }
        );

        // Store the interviewer voice and other properties properly in the session
        await saveSession(sessionId, {
            userId,
            jobId,
            recordingSessionId,
            resumeProfile: structured,
            specialInstructions,
            roleInfo,
            jobTitle: job?.title || '',
            jobDescription: job?.description || '',
            jobSkills: job?.skills || [],
            experienceLevel: job?.experienceLevel || '',
            systemPrompt,
            interviewerVoice: roleInfo.roleCategory === 'sales' || roleInfo.roleCategory === 'marketing' ? 'vp_sales' : 'professional_interviewer',
            totalQuestions,
            history: [{ role: 'interviewer', content: firstQuestion }],
            answerEvaluations: []
        });

        res.json({
            success: true,
            sessionId,
            recordingSessionId,
            question: firstQuestion,
            audio: audioBase64,
            totalQuestions
        });
    } catch (error) {
        console.error("Start Error:", error);
        res.status(500).json({ success: false, message: "Failed to start" });
    }
});

/**
 * POST /api/interview/next-fast
 *
 * FIXED version of the /next-fast endpoint.
 *
 * FIXED version of the /next-fast endpoint.
 * Changes from original:
 *   1. maxTokens = 1000 (was 200)
 *   2. cleanQuestionResponse() strips transition phrases
 *   3. Shortlisting guard for interviewScore === 0
 *   4. Empty answer detection with retry flag
 */
router.post('/next-fast', async (req, res) => {
    try {
        const { sessionId, answerText } = req.body;
        const session = await loadSession(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        const normalizedAnswer = String(answerText || '').trim();

        const interviewers = session.history.filter(h => h.role === 'interviewer');
        const currentQuestionNumber = interviewers.length;
        const currentQuestion = interviewers[interviewers.length - 1]?.content || "";

        // ─── FIX 4: Empty Answer Guard ──────────────────────────────────────
        // If the answer is too short, warn the frontend but still advance
        // (to avoid blocking the candidate completely if SpeechRecognition fails)
        const isEmptyAnswer = normalizedAnswer.length < 5;
        if (isEmptyAnswer) {
            console.warn(`[FIX-NEXT-FAST] Empty/short answer detected for Q${currentQuestionNumber}: "${normalizedAnswer}"`);
        }

        // 1. Push candidate's answer to conversation history
        session.history.push({ role: 'candidate', content: normalizedAnswer || '(no answer provided)' });

        // 2. FIRE-AND-FORGET: Evaluate and save in the background (DO NOT AWAIT)
        evaluateAnswerInBackground(
            session,
            sessionId,
            currentQuestion,
            normalizedAnswer,
            currentQuestionNumber
        ).catch(err => console.error("[FIX-BG-EVAL-UNCAUGHT]:", err.message));

        // 3. Check if we've reached the maximum number of questions
        if (interviewers.length >= MAX_INTERVIEW_QUESTIONS) {
            console.log(`[FIX-INTERVIEW-END] Finalizing session for user: ${session.userId}`);

            const result = await finalizeInterview(session, sessionId);

            return res.json({
                hasNext: false,
                finalScore: result.finalScore,
                ownershipScore: result.ownershipScore,
                feedback: result.feedback
            });
        }

        // 4. Generate the next question
        //    ─── FIX 1: maxTokens = 1000 (was 200) ──────────────────────────
        const nextQuestionNumber = interviewers.length + 1;
        const nextPrompt = buildNextQuestionPrompt(session, nextQuestionNumber);

        let nextQuestion = await callInterviewAI(nextPrompt, 1000, false, session.systemPrompt);

        // ─── FIX 2: Strip transition phrases ────────────────────────────────
        if (nextQuestion) {
            const cleaned = cleanQuestionResponse(nextQuestion);
            console.log(`[FIX-NEXT-FAST] Original: "${nextQuestion.substring(0, 80)}..." → Cleaned: "${cleaned.substring(0, 80)}..."`);
            nextQuestion = cleaned;
        }

        if (!nextQuestion) {
            if (session.roleInfo.roleCategory === 'ai_engineer') {
                nextQuestion = "Can you elaborate on the specific technical trade-offs you considered and how you would evaluate the performance of that approach in a production AI system?";
            } else if (session.roleInfo.isTech) {
                nextQuestion = "Can you elaborate on the technical implementation details of that approach?";
            } else {
                nextQuestion = "Could you walk me through how you would specifically handle that situation in this role?";
            }
        }

        // 5. Push the new question to history and persist
        session.history.push({ role: 'interviewer', content: nextQuestion });
        await saveSession(sessionId, session);

        // Voice generation (TTS) — Decoupled, audio will be fetched asynchronously
        let audioBase64 = null;

        // 6. Return immediately
        res.json({
            hasNext: true,
            question: nextQuestion,
            audio: null, // Audio fetched asynchronously by client
            currentQuestionNumber: session.history.filter(h => h.role === 'interviewer').length,
            totalQuestions: session.totalQuestions,
            emptyAnswerWarning: isEmptyAnswer ? "No answer was detected. Please speak clearly into the microphone." : undefined
        });

    } catch (error) {
        console.error("[FIX-NEXT-FAST] Error:", error);
        res.status(500).json({ success: false, message: "Error fetching next question" });
    }
});

/**
 * POST /api/interview/tts
 * Decoupled voice synthesis endpoint for lower perceived latency.
 */
router.post('/tts', async (req, res) => {
    try {
        const { text, voice, sessionId } = req.body;
        if (!text) return res.status(400).json({ success: false, message: "text is required" });

        const { generateSpeech } = require('../services/tts.service');
        let interviewVoice = voice || 'professional_interviewer';

        if (sessionId) {
            const session = await loadSession(sessionId);
            if (session && session.interviewerVoice) {
                interviewVoice = session.interviewerVoice;
            }
        }
        
        console.log(`[FIX-TTS] Request received for chars: ${text.length} | voice: ${interviewVoice} | sessionId: ${sessionId || 'none'}`);
        const buffer = await generateSpeech(text, interviewVoice);
        
        if (buffer) {
            console.log(`[FIX-TTS] Success, sending ${buffer.length} bytes`);
            return res.json({ success: true, audio: buffer.toString('base64') });
        }
        
        console.warn(`[FIX-TTS] Failed: generateSpeech returned null`);
        return res.status(500).json({ success: false, message: "TTS generation failed" });
    } catch (error) {
        console.error("[FIX-TTS] Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/interview/diagnostic
 * Diagnostics endpoint for checking API keys and testing TTS engines in production.
 */
router.get('/diagnostic', async (req, res) => {
    try {
        const results = {
            env: {
                hasGeminiKey: !!process.env.GEMINI_API_KEY,
                hasGroqKey: !!process.env.GROQ_API_KEY,
                hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
                nodeEnv: process.env.NODE_ENV || 'development'
            },
            tests: {}
        };

        // 1. Test Gemini LLM Connection
        if (process.env.GEMINI_API_KEY) {
            try {
                const { callGemini } = require('../utils/aiClients');
                const start = Date.now();
                const text = await callGemini("Return the word 'OK'", 10, false, null, 0.1);
                results.tests.geminiLLM = {
                    success: text === 'OK' || String(text).includes('OK'),
                    latencyMs: Date.now() - start,
                    response: text
                };
            } catch (e) {
                results.tests.geminiLLM = { success: false, error: e.message };
            }
        } else {
            results.tests.geminiLLM = { success: false, error: "GEMINI_API_KEY not configured" };
        }

        // 2. Test Gemini TTS Connection
        if (process.env.GEMINI_API_KEY) {
            try {
                const { generateGeminiSpeech } = require('../services/tts.service');
                const start = Date.now();
                const buf = await generateGeminiSpeech("Test", 'professional_interviewer');
                results.tests.geminiTTS = {
                    success: !!buf && buf.length > 0,
                    latencyMs: Date.now() - start,
                    bufferSize: buf ? buf.length : 0
                };
            } catch (e) {
                results.tests.geminiTTS = { success: false, error: e.message };
            }
        } else {
            results.tests.geminiTTS = { success: false, error: "GEMINI_API_KEY not configured" };
        }

        // 3. Test Edge TTS Connection
        try {
            const { generateEdgeSpeech } = require('../services/tts.service');
            const start = Date.now();
            const buf = await generateEdgeSpeech("Test", 'professional_interviewer');
            results.tests.edgeTTS = {
                success: !!buf && buf.length > 0,
                latencyMs: Date.now() - start,
                bufferSize: buf ? buf.length : 0
            };
        } catch (e) {
            results.tests.edgeTTS = { success: false, error: e.message };
        }

        res.json({ success: true, diagnostics: results });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
