const { callGemini, callSkillAI } = require('../utils/aiClients');

// ─── Curated Knowledge Base & Guides across 5 Pillars ─────────────────────────
const KNOWLEDGE_TOPICS = [
    {
        id: 'job-creation',
        title: 'Job Creation & Benchmarking',
        subtitle: 'Crafting high-converting JDs, skill weighting & setting match thresholds',
        icon: 'Briefcase',
        tag: 'Pillar 1',
        description: 'Design outcome-driven job requisitions that attract top 1% engineering talent while setting realistic, bias-free screening benchmarks.',
        benchmarks: {
            junior: '60% - 70% Match (Focus on core fundamentals & learning agility)',
            midLevel: '70% - 80% Match (Balanced production stack experience & problem-solving)',
            seniorLead: '80% - 88% Match (System architecture, trade-offs & domain leadership)',
            staffPrincipal: '85%+ Match (Cross-functional impact & distributed systems depth)'
        },
        keyPractices: [
            {
                title: 'Outcome-Oriented Descriptions',
                desc: 'State what the candidate will achieve in 30, 60, and 90 days rather than a rigid laundry list of 15 years of framework experience.'
            },
            {
                title: 'Core vs. Bonus Skill Tagging',
                desc: 'Keep primary skills to 3-4 core technologies (e.g. Go, PostgreSQL, Docker) and mark tools like Kubernetes or GraphQL as bonus to prevent pipeline choke.'
            },
            {
                title: 'Calibrating Benchmark %',
                desc: 'Setting the minimum match above 85% for niche roles reduces applicants by up to 70%. Start at 70-75% and allow the screening assessment to surface hidden talent.'
            }
        ],
        templates: [
            {
                title: 'High-Converting Senior Full Stack JD Structure',
                preview: 'Role: Senior Full Stack Engineer (React/Node/Cloud)\nMission: Architect high-scale services processing 10M+ daily events...\nCore Stack: React, TypeScript, Node.js, PostgreSQL\nFirst 90 Days Objectives...'
            },
            {
                title: 'Skill Benchmark Calibration Matrix',
                preview: 'Entry Level: 60% Benchmark | 30m Coding Test\nMid Level: 75% Benchmark | 45m Coding Test + Voice Screen\nSenior: 80% Benchmark | 60m System Design + Proctored Coding'
            }
        ],
        faqs: [
            {
                q: 'What minimum percentage match should I set on Hire1Percent?',
                a: 'For most mid-to-senior technical roles, 70% to 75% is the sweet spot. A 75% match ensures strong foundational overlap while welcoming candidates with adjacent stack expertise (e.g. Kotlin to Java, Vue to React) who quickly excel.'
            },
            {
                q: 'How do skill tags influence the automated candidate matching engine?',
                a: 'The platform uses semantic skill clustering rather than raw string matching. For instance, tagging "React" also understands "Next.js", "Redux", and modern frontend architecture, matching candidates on conceptual competency rather than resume keyword stuffing.'
            }
        ]
    },
    {
        id: 'skill-based-hiring',
        title: 'Skill-Based Hiring',
        subtitle: 'Eliminating pedigree bias, competency mapping & verifiable work',
        icon: 'Target',
        tag: 'Pillar 2',
        description: 'Transition from degree and prestige company pedigree to demonstrable engineering capabilities, code quality, and structured problem-solving.',
        keyPractices: [
            {
                title: 'De-Biasing the Top of Funnel',
                desc: 'Evaluate candidates on standardized coding assessments and proctored technical evaluations before screening for university names or previous company prestige.'
            },
            {
                title: 'Competency Frameworks Over Years of Exp',
                desc: 'A candidate with 3 years of intense high-load production engineering often out-performs a 7-year candidate in legacy maintenance. Measure actual problem-solving throughput.'
            },
            {
                title: 'Transparent Rubrics',
                desc: 'Use predefined rubrics for code clarity, error handling, edge cases, and testability to ensure every candidate is evaluated with equal fairness.'
            }
        ],
        templates: [
            {
                title: '5-Level Engineering Competency Grid',
                preview: '1. Foundation (Syntax & Basic Algorithms)\n2. Execution (Clean APIs, Error Handling, Testing)\n3. Architecture (Data Modeling, Concurrency, Caching)\n4. System Design (Fault Tolerance, Scalability)\n5. Leadership (Mentorship, Design RFCs)'
            }
        ],
        faqs: [
            {
                q: 'How does skill-based hiring improve retention and quality of hire?',
                a: 'Pedigree-based hiring often yields high attrition when candidates struggle in real codebases. Skill-based assessments verify actual coding ability, reducing bad-hire turnover by over 45%.'
            },
            {
                q: 'Can a candidate without a Computer Science degree succeed on our platform?',
                a: 'Yes. Over 40% of top performers in coding challenges and structured technical interviews are self-taught or bootcamp graduates who excel at modern frameworks, practical debugging, and delivery.'
            }
        ]
    },
    {
        id: 'assessments',
        title: 'Assessments & Proctoring',
        subtitle: 'Coding challenges, time allocation & anti-cheat telemetry',
        icon: 'Zap',
        tag: 'Pillar 3',
        description: 'Configure automated proctored coding assessments, set balanced difficulty curves, and accurately interpret anti-cheat telemetry without false accusations.',
        keyPractices: [
            {
                title: 'Practical Problems Over LeetCode Esoterica',
                desc: 'Test real-world tasks (e.g. debugging an async API, fixing a race condition, writing a CRUD route with tests) instead of obscure dynamic programming brainteasers.'
            },
            {
                title: 'Anti-Cheat Integrity Interpretation',
                desc: 'Hire1Percent monitors tab switching, webcam presence, and copy-paste velocity. A single tab switch may just be checking official docs; continuous background switches flag review.'
            },
            {
                title: 'Time Limits & Fatigue',
                desc: 'Keep assessments under 45-60 minutes. Excessive 3-hour tests cause candidate drop-off rates exceeding 65%, particularly among top-tier employed engineers.'
            }
        ],
        templates: [
            {
                title: 'Coding Assessment Config Checklist',
                preview: 'Duration: 45-60 mins | Languages: Multi-language enabled\nAnti-Cheat: Web-switch monitor + full screen lock\nEvaluation: 70% Unit Test pass + 30% Code Style & Modularity'
            }
        ],
        faqs: [
            {
                q: 'What should I do if a candidate has 2-3 tab switches flagged in proctoring?',
                a: 'Check the proctoring report event timeline. If the switches lasted only 5-10 seconds, the candidate was likely referencing MDN, language syntax docs, or API documentation. If accompanied by sudden large block copy-pastes, flag for manual review.'
            },
            {
                q: 'How is the technical coding assessment score calculated?',
                a: 'The score combines automated test case passing rate (hidden + visible test suites), time complexity/efficiency, edge-case coverage, and code cleanliness.'
            }
        ]
    },
    {
        id: 'interviews',
        title: 'Interviews & Transcripts',
        subtitle: 'Voice screening, STAR technical questions & transcript analysis',
        icon: 'Mic',
        tag: 'Pillar 4',
        description: 'Leverage autonomous voice & conversational screening, generate role-specific STAR scenario questions, and quickly extract key candidate signals from transcripts.',
        keyPractices: [
            {
                title: 'Autonomous First-Round Screening',
                desc: 'Use automated voice screening for round 1. It asks technical and behavioral questions, probes deeper when answers are vague, and generates a structured transcript and score.'
            },
            {
                title: 'STAR Scenario Questions',
                desc: 'Structure questions around Situation, Task, Action, Result. E.g.: "Describe a production outage you caused or triaged: how did you identify root cause and mitigate?"'
            },
            {
                title: 'Transcript Skimming & Highlighting',
                desc: 'Review the automated executive summary first, then jump directly to flagged timestamps in the transcript where the candidate discussed architecture or problem-solving.'
            }
        ],
        templates: [
            {
                title: 'STAR Technical Interview Question Bank',
                preview: 'System Design: "Tell me about a time an API you built failed under unexpected load."\nCollaboration: "How do you handle a strong technical disagreement during code review?"\nAdaptability: "Describe learning a new framework on a 2-week deadline."'
            }
        ],
        faqs: [
            {
                q: 'How does the voice interview evaluate candidate responses?',
                a: 'The platform evaluates response relevance, technical depth, communication clarity, problem-solving reasoning, and confidence based on verified transcript analysis.'
            },
            {
                q: 'Can I customize the interview questions asked by the interview agent?',
                a: 'Yes. When posting a job or configuring assessment rounds, you can define required focus areas, custom question prompts, and technical depth criteria.'
            }
        ]
    },
    {
        id: 'candidate-evaluation',
        title: 'Candidate Evaluation & Decisions',
        subtitle: 'Interpreting match scores, holistic rubrics & offer decisions',
        icon: 'CheckCircle2',
        tag: 'Pillar 5',
        description: 'Synthesize resume match, coding assessment scores, and interview transcripts into confident hiring decisions while avoiding false negatives.',
        keyPractices: [
            {
                title: 'The Multi-Factor Hiring Formula',
                desc: 'Weight candidate performance holistically: 40% Practical Coding Score + 30% Voice / Technical Screen + 30% Resume Core Skill Match.'
            },
            {
                title: 'Watch for the 75% Hidden Gem',
                desc: 'A candidate with a 75% resume match who scores 92% on coding challenges is often a significantly better hire than a 95% keyword-stuffed resume who scores 65% on coding.'
            },
            {
                title: 'Rapid Feedback Loop',
                desc: 'Candidates who receive interview feedback within 48 hours accept offers at a 40% higher rate. Use Onboarding Kit templates to extend offers swiftly.'
            }
        ],
        templates: [
            {
                title: 'Candidate Evaluation Scorecard Template',
                preview: 'Category 1: Core Engineering Skill (1-5)\nCategory 2: Code Quality & Architecture (1-5)\nCategory 3: Communication & Problem Solving (1-5)\nCategory 4: Learning Velocity & Team Fit (1-5)\nDecision: Strong Hire / Hire / Re-test / Decline'
            }
        ],
        faqs: [
            {
                q: 'When should I shortlist a candidate?',
                a: 'Shortlist candidates whose combined assessment score meets or exceeds your job benchmark, and whose proctoring report shows no critical integrity violations.'
            },
            {
                q: 'How can I reject candidates without damaging our employer brand?',
                a: 'Provide constructive feedback citing specific competencies (e.g. "We encourage strengthening asynchronous concurrency and distributed caching concepts before reapplying in 6 months").'
            }
        ]
    }
];

// ─── Quick Prompt Chips across Domains ─────────────────────────────────────────
const QUICK_PROMPTS = [
    {
        category: 'job-creation',
        label: 'Benchmark for Senior Go/Python Role',
        prompt: 'What benchmark match percentage and core skills should I configure for a Senior Backend Engineer in Go and PostgreSQL?'
    },
    {
        category: 'skill-based-hiring',
        label: 'Evaluate Candidates Without CS Degrees',
        prompt: 'How do I design a fair, skill-based assessment for self-taught software engineers to evaluate production competence?'
    },
    {
        category: 'assessments',
        label: 'Interpret Tab-Switch Proctoring Warnings',
        prompt: 'A candidate has 4 tab switches flagged during a 45-minute coding test. How should I evaluate if this was cheating or harmless doc lookup?'
    },
    {
        category: 'interviews',
        label: '5 Behavioral & Tech STAR Questions',
        prompt: 'Give me 5 high-impact STAR technical interview questions for a Full Stack React & Node.js Lead, with scoring criteria for good vs poor answers.'
    },
    {
        category: 'candidate-evaluation',
        label: 'Multi-Factor Decision Rubric',
        prompt: 'How should I weigh a candidate with a 74% resume match but a 92% coding assessment score vs someone with a 90% resume match and 70% coding score?'
    }
];

// ─── Controller Methods ───────────────────────────────────────────────────────

/**
 * GET /api/recruiter-knowledge/topics
 * Returns curated pillar guides, benchmarks, FAQs, and prompt templates
 */
exports.getTopicsAndGuides = async (req, res) => {
    try {
        res.json({
            success: true,
            topics: KNOWLEDGE_TOPICS,
            quickPrompts: QUICK_PROMPTS,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[KNOWLEDGE-HUB] Error fetching topics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load knowledge topics',
            error: error.message
        });
    }
};

/**
 * POST /api/recruiter-knowledge/ask
 * Recruiter Knowledge Assistant Q&A endpoint
 */
exports.askQuestion = async (req, res) => {
    try {
        const { question, category = 'all', roleContext = '', conversationHistory = [] } = req.body;

        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid question.'
            });
        }

        const trimmedQuestion = question.trim();

        // Construct a specialized, executive recruiter assistant prompt
        const systemPrompt = `
You are the Senior Talent Advisory & Technical Recruitment Expert for the "Hire1Percent / Talent Ecosystem" platform.
Your mission is to provide world-class, authoritative, and immediately actionable advice to recruiters and hiring managers.

Your core expertise spans the 5 pillars of modern hiring:
1. JOB CREATION & BENCHMARKING: Writing magnetic, outcome-focused job descriptions, defining core vs. bonus skills, setting fair minimum match thresholds (60-88%), and salary banding.
2. SKILL-BASED HIRING: Eliminating credential/pedigree bias, measuring verifiable engineering capability, designing competency frameworks, and promoting equity.
3. ASSESSMENTS & PROCTORING: Configuring hands-on coding tests, setting realistic time limits, analyzing anti-cheat telemetry (tab switches, webcam tracking, code playback), and distinguishing normal doc lookup from cheating.
4. INTERVIEWS & TRANSCRIPTS: Conducting structured automated voice and technical interviews, crafting role-specific STAR scenario questions, extracting nuance from interview transcripts, and evaluating problem-solving velocity.
5. CANDIDATE EVALUATION & DECISION MAKING: Combining platform match scores, coding test results, and interview performance into a fair hiring decision, spotting false positives/negatives, and extending competitive offers.

CRITICAL FORMATTING & STYLE RULES:
- DO NOT start with introductory filler like "As the Chief Talent Officer...", "As your assistant...", or "I am here to help...". Start IMMEDIATELY with the answer and recommendations.
- NEVER output raw markdown formatting symbols like "####" or multiple deep hash symbols. Use clean "### " for main section headings, numbered points (1., 2., 3.), and bullet points for details.
- Avoid buzzwords like "Copilot" or "AI Copilot". Refer to yourself simply as "Recruiter Assistant", "Talent Advisor", or "the platform".
- If a target role context is provided, calibrate your response (benchmarks, questions, rubrics) specifically for that exact role and seniority.
- Be clear, practical, structured, and executive-ready.
- When relevant, provide ready-to-use templates, question banks, or decision rubrics.
- Include a brief "Recommended Platform Action" section at the end (e.g. advising the recruiter to configure a benchmark on Post Job, review the Applicants tab, or launch a Talent Search).
`;

        let userPrompt = `Recruiter Question: "${trimmedQuestion}"`;
        if (category && category !== 'all') {
            userPrompt += `\nPrimary Focus Pillar: ${category}`;
        }
        if (roleContext) {
            userPrompt += `\nTarget Role & Seniority Context: ${roleContext}`;
        }

        // Include last 2 turns of conversation history if provided for context
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-4).map(turn => 
                `${turn.role === 'user' ? 'Recruiter' : 'Advisor'}: ${turn.content}`
            ).join('\n');
            userPrompt = `Prior Discussion:\n${recentHistory}\n\n${userPrompt}`;
        }

        // Execute primary AI call with Gemini 2.5 Flash, with Groq fallback
        let responseText = await callGemini(userPrompt, 1800, false, systemPrompt, 0.7);

        // Fallback to Groq if Gemini is unavailable
        if (!responseText) {
            console.log('[KNOWLEDGE-HUB] Gemini failed or busy, falling back to callSkillAI...');
            responseText = await callSkillAI(
                `${systemPrompt}\n\n${userPrompt}`,
                1800,
                0.7
            );
        }

        // Default graceful fallback if all AI providers are unreachable
        if (!responseText) {
            responseText = `### Recommendations for: "${trimmedQuestion}"\n\n` +
                `1. **Focus on Verified Capabilities**: Prioritize practical coding assessments and structured interview transcripts over resume keywords.\n` +
                `2. **Benchmark Setting**: We recommend a 70-75% match threshold for mid-level roles and 80-85% for lead engineering positions.\n` +
                `3. **Proctoring Review**: Check the event log on candidate transcripts before judging tab-switch warnings—reference lookups are standard in production engineering.\n\n` +
                `*Tip: Try rephrasing or selecting one of our prompt templates above for detailed templates.*`;
        }

        return res.json({
            success: true,
            answer: responseText,
            category,
            roleContext,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[KNOWLEDGE-HUB] Error processing question:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate answer. Please try again.',
            error: error.message
        });
    }
};
