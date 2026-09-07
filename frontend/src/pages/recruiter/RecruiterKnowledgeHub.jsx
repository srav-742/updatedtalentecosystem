import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Sparkles,
    Briefcase,
    Target,
    Zap,
    Mic,
    CheckCircle2,
    Search,
    ArrowRight,
    Copy,
    Check,
    Send,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    FileText,
    ShieldCheck,
    Users,
    Package,
    Compass,
    Sliders,
    Award,
    Info
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';
import './recruiter-theme.css';

// ─── Default Fallback Pillar Data if API Warmup is Pending ────────────────────
const DEFAULT_PILLARS = [
    {
        id: 'job-creation',
        title: 'Job Creation & Benchmarking',
        subtitle: 'Crafting high-converting JDs, skill weighting & setting match thresholds',
        icon: Briefcase,
        accent: 'blue',
        tag: 'Pillar 1',
        description: 'Design outcome-driven job requisitions that attract top 1% engineering talent while setting realistic, bias-free screening benchmarks.',
        benchmarks: {
            junior: '60% - 70% Match (Focus on core fundamentals & learning agility)',
            midLevel: '70% - 78% Match (Balanced production stack experience & problem-solving)',
            seniorLead: '78% - 85% Match (System architecture, trade-offs & domain leadership)',
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
                desc: 'Setting the minimum match above 85% for niche roles reduces applicants by up to 70%. Start at 70-75% and allow the automated screening assessment to surface hidden talent.'
            }
        ],
        templates: [
            {
                title: 'High-Converting Senior Full Stack JD Structure',
                preview: 'Role: Senior Full Stack Engineer (React/Node/Cloud)\nMission: Architect high-scale services processing 10M+ daily events...\nCore Stack: React, TypeScript, Node.js, PostgreSQL\nFirst 90 Days Objectives...'
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
        ],
        actionLink: '/recruiter/post-job',
        actionText: 'Create a New Job'
    },
    {
        id: 'skill-based-hiring',
        title: 'Skill-Based Hiring Playbook',
        subtitle: 'Eliminating pedigree bias, competency mapping & verifiable work',
        icon: Target,
        accent: 'teal',
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
        ],
        actionLink: '/recruiter/ai-search',
        actionText: 'Search Top 1% by Skill'
    },
    {
        id: 'assessments',
        title: 'Assessments & Proctoring',
        subtitle: 'Coding challenges, time allocation & anti-cheat telemetry',
        icon: Zap,
        accent: 'amber',
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
        ],
        actionLink: '/recruiter/my-jobs',
        actionText: 'Configure Coding Assessment'
    },
    {
        id: 'interviews',
        title: 'Interviews & Transcripts',
        subtitle: 'Voice screening, STAR technical questions & transcript analysis',
        icon: Mic,
        accent: 'indigo',
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
        ],
        actionLink: '/recruiter/applicants',
        actionText: 'Review Candidate Transcripts'
    },
    {
        id: 'candidate-evaluation',
        title: 'Candidate Evaluation Matrix',
        subtitle: 'Interpreting match scores, holistic rubrics & offer decisions',
        icon: CheckCircle2,
        accent: 'emerald',
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
        ],
        actionLink: '/recruiter/onboarding-kit',
        actionText: 'Open Onboarding Kit & Offer Letters'
    }
];

const QUICK_PROMPTS = [
    {
        category: 'job-creation',
        label: 'Benchmark for Senior Go/Python Role',
        prompt: 'What benchmark match percentage and core skills should I configure for a Senior Backend Engineer in Go and PostgreSQL?',
        roleContext: 'Senior Backend Engineer'
    },
    {
        category: 'skill-based-hiring',
        label: 'Evaluate Candidates Without CS Degrees',
        prompt: 'How do I design a fair, skill-based assessment for self-taught software engineers to evaluate production competence?',
        roleContext: 'Software Engineer'
    },
    {
        category: 'assessments',
        label: 'Interpret Tab-Switch Proctoring Warnings',
        prompt: 'A candidate has 4 tab switches flagged during a 45-minute coding test. How should I evaluate if this was cheating or harmless doc lookup?',
        roleContext: 'Technical Assessor'
    },
    {
        category: 'interviews',
        label: '5 Behavioral & Tech STAR Questions',
        prompt: 'Give me 5 high-impact STAR technical interview questions for a Full Stack React & Node.js Lead, with scoring criteria for good vs poor answers.',
        roleContext: 'Full Stack Tech Lead'
    },
    {
        category: 'candidate-evaluation',
        label: 'Multi-Factor Decision Rubric',
        prompt: 'How should I weigh a candidate with a 74% resume match but a 92% coding assessment score vs someone with a 90% resume match and 70% coding score?',
        roleContext: 'Senior Technical Role'
    }
];

// ─── Robust Markdown Renderer Component (Eliminates raw ### and #### symbols) ─
const MarkdownRenderer = ({ text }) => {
    if (!text) return null;

    const renderFormattedLine = (line) => {
        // Strip any residual leading/trailing # or markdown symbols
        let clean = line.replace(/^#+\s*/, '').replace(/\s*#+$/, '');

        // Handle bold markdown **text**
        let parts = [clean];
        if (clean.includes('**')) {
            const split = clean.split('**');
            parts = split.map((chunk, i) =>
                i % 2 === 1 ? (
                    <strong key={i} className="font-extrabold text-slate-900 bg-slate-100/90 px-1 py-0.5 rounded">
                        {chunk}
                    </strong>
                ) : (
                    chunk
                )
            );
        }
        return parts;
    };

    const lines = text.split('\n');

    return (
        <div className="space-y-2.5 text-xs md:text-sm text-slate-700 leading-relaxed font-normal">
            {lines.map((line, idx) => {
                const trimmed = line.trim();

                // Robust headings check for any number of # (e.g. #, ##, ###, ####, #####)
                const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
                if (headingMatch) {
                    const level = headingMatch[1].length;
                    const content = headingMatch[2].replace(/\s*#+$/, '');

                    if (level === 1) {
                        return (
                            <h1 key={idx} className="text-xl md:text-2xl font-black text-slate-900 pt-3 pb-2 border-b border-slate-200/80">
                                {renderFormattedLine(content)}
                            </h1>
                        );
                    }
                    if (level === 2) {
                        return (
                            <h2 key={idx} className="text-lg md:text-xl font-extrabold text-slate-900 pt-3 pb-1">
                                {renderFormattedLine(content)}
                            </h2>
                        );
                    }
                    if (level === 3) {
                        return (
                            <h3 key={idx} className="text-base md:text-lg font-bold text-slate-900 pt-2 pb-1 border-b border-slate-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                <span>{renderFormattedLine(content)}</span>
                            </h3>
                        );
                    }
                    // Level 4, 5, 6: Sub-sections with clean pill styling (NO ### or #### visible)
                    return (
                        <h4 key={idx} className="text-sm md:text-base font-bold text-slate-900 pt-2 pb-0.5 flex items-center gap-2 text-indigo-950">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                            <span>{renderFormattedLine(content)}</span>
                        </h4>
                    );
                }

                // Bullet points: -, *, •
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                    const bulletText = trimmed.replace(/^[-*•]\s+/, '');
                    return (
                        <div key={idx} className="flex items-start gap-2 ml-2 my-1">
                            <span className="text-indigo-500 mt-1 font-bold text-xs">•</span>
                            <span className="flex-1">{renderFormattedLine(bulletText)}</span>
                        </div>
                    );
                }

                // Numbered list: 1., 2., 3., 1), 2)
                const numMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)$/);
                if (numMatch) {
                    return (
                        <div key={idx} className="flex items-start gap-2.5 ml-2 my-1.5">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold shrink-0 mt-0.5">
                                {numMatch[1]}
                            </span>
                            <span className="flex-1">{renderFormattedLine(numMatch[2])}</span>
                        </div>
                    );
                }

                if (trimmed === '') {
                    return <div key={idx} className="h-2" />;
                }

                return (
                    <p key={idx} className="leading-relaxed">
                        {renderFormattedLine(line)}
                    </p>
                );
            })}
        </div>
    );
};

// ─── Main Recruiter Knowledge Hub Component ────────────────────────────────────
const RecruiterKnowledgeHub = () => {
    const navigate = useNavigate();

    // Active state
    const [activePillar, setActivePillar] = useState('job-creation');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchFilter, setSearchFilter] = useState('');

    // Recruiter Assistant state
    const [questionInput, setQuestionInput] = useState('');
    const [roleContextInput, setRoleContextInput] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [assistantResponse, setAssistantResponse] = useState(null);
    const [copied, setCopied] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState(null);

    // Dynamic data with fallback
    const [pillars, setPillars] = useState(DEFAULT_PILLARS);
    const [quickPrompts, setQuickPrompts] = useState(QUICK_PROMPTS);

    // Fetch topics from backend on mount
    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await axios.get(`${API_URL}/recruiter-knowledge/topics`);
                if (res.data?.success && Array.isArray(res.data.topics)) {
                    const iconMap = {
                        'job-creation': Briefcase,
                        'skill-based-hiring': Target,
                        'assessments': Zap,
                        'interviews': Mic,
                        'candidate-evaluation': CheckCircle2
                    };
                    const mapped = res.data.topics.map((t, idx) => ({
                        ...t,
                        icon: iconMap[t.id] || DEFAULT_PILLARS[idx]?.icon || BookOpen,
                        accent: DEFAULT_PILLARS[idx]?.accent || 'indigo',
                        actionLink: DEFAULT_PILLARS[idx]?.actionLink || '/recruiter',
                        actionText: DEFAULT_PILLARS[idx]?.actionText || 'Take Action'
                    }));
                    setPillars(mapped);
                    if (res.data.quickPrompts) {
                        setQuickPrompts(res.data.quickPrompts);
                    }
                }
            } catch (err) {
                console.warn('[KNOWLEDGE-HUB] Using local fallback pillar dataset:', err.message);
            }
        };
        fetchTopics();
    }, []);

    // Current active pillar object
    const currentPillar = useMemo(() => {
        return pillars.find((p) => p.id === activePillar) || pillars[0];
    }, [pillars, activePillar]);

    // Handle submit question to Recruiter Assistant
    const handleAskQuestion = async (queryText, categoryParam, roleParam) => {
        const q = (queryText || questionInput).trim();
        if (!q) return;

        const effectiveRole = roleParam !== undefined ? roleParam : roleContextInput.trim();

        setIsAsking(true);
        setAssistantResponse(null);
        setCopied(false);

        try {
            const res = await axios.post(`${API_URL}/recruiter-knowledge/ask`, {
                question: q,
                category: categoryParam || selectedCategory,
                roleContext: effectiveRole,
                conversationHistory: assistantResponse ? [
                    { role: 'user', content: assistantResponse.question },
                    { role: 'assistant', content: assistantResponse.answer }
                ] : []
            });

            if (res.data?.success) {
                setAssistantResponse({
                    question: q,
                    answer: res.data.answer,
                    category: res.data.category || selectedCategory,
                    roleContext: res.data.roleContext || effectiveRole,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            } else {
                throw new Error(res.data?.message || 'Failed to get answer');
            }
        } catch (err) {
            console.error('[KNOWLEDGE-HUB] Assistant request failed:', err);
            setAssistantResponse({
                question: q,
                answer: `### Recommendations for: "${q}"\n\n` +
                    `1. **Practical Verification**: When evaluating candidates, weight verified coding and proctored interview performance over resume keywords.\n` +
                    `2. **Benchmark Setting**: Maintain a 70%-75% match benchmark for mid-to-senior technical roles to avoid eliminating strong engineers with adjacent stack capability.\n` +
                    `3. **Proctoring Telemetry**: Review web-switch timestamps before judging candidates—short duration switches typically indicate normal API/documentation lookups.\n\n` +
                    `*Recommended Action: Configure this role's benchmark and skill tags directly in the Post Job dashboard.*`,
                category: selectedCategory,
                roleContext: effectiveRole,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        } finally {
            setIsAsking(false);
        }
    };

    // Quick prompt chip click
    const handlePromptChipClick = (promptItem) => {
        setQuestionInput(promptItem.prompt);
        if (promptItem.roleContext) {
            setRoleContextInput(promptItem.roleContext);
        }
        setSelectedCategory(promptItem.category || 'all');
        if (promptItem.category && promptItem.category !== 'all') {
            setActivePillar(promptItem.category);
        }
        handleAskQuestion(promptItem.prompt, promptItem.category, promptItem.roleContext);
    };

    // Copy response to clipboard
    const handleCopyResponse = () => {
        if (!assistantResponse?.answer) return;
        navigator.clipboard.writeText(assistantResponse.answer);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // Filter FAQs by search query if present
    const filteredFaqs = useMemo(() => {
        if (!currentPillar?.faqs) return [];
        if (!searchFilter.trim()) return currentPillar.faqs;
        const q = searchFilter.toLowerCase();
        return currentPillar.faqs.filter(
            (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
        );
    }, [currentPillar, searchFilter]);

    return (
        <div id="recruiter-knowledge-hub-root" className="space-y-8 pb-14 max-w-7xl mx-auto">
            {/* 1. Hero Banner */}
            <div className="rec-hero p-7 md:p-9 relative">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
                    <div className="space-y-3 max-w-3xl">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-slate-900 text-white shadow-xs">
                                <Sparkles size={12} className="text-amber-400" />
                                <span>Recruiter Knowledge Hub</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                <BookOpen size={13} className="text-slate-400" />
                                5 Core Hiring Pillars & Recruiter Assistant
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            Recruiter <span className="rec-text-gradient">Intelligence & Knowledge Hub</span>
                        </h1>

                        <p className="text-sm md:text-base text-slate-600 leading-relaxed font-normal">
                            Get instant answers, authoritative benchmarks, and actionable playbooks on 
                            <strong> Job Creation</strong>, <strong>Skill-Based Hiring</strong>, <strong>Assessments</strong>, 
                            <strong> Structured Interviews</strong>, and <strong>Candidate Evaluation</strong>.
                        </p>
                    </div>

                    {/* Quick Stats or Platform Shortcuts */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            onClick={() => navigate('/recruiter/post-job')}
                            className="rec-btn-primary flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                            <Briefcase size={15} />
                            <span>Post Job</span>
                        </button>
                        <button
                            onClick={() => navigate('/recruiter/applicants')}
                            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Users size={15} className="text-teal-600" />
                            <span>Applicants</span>
                        </button>
                        <button
                            onClick={() => navigate('/recruiter/onboarding-kit')}
                            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Package size={15} className="text-amber-600" />
                            <span>Onboarding Kit</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Interactive Recruiter Assistant Question Engine */}
            <div className="rec-card p-6 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Sparkles size={18} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recruiter Knowledge & Advisory Assistant</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Ask anything about candidate rubrics, assessment setups, anti-cheat detection, or interview techniques.
                        </p>
                    </div>

                    {/* Category Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Domain:</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-slate-400"
                        >
                            <option value="all">All Hiring Domains</option>
                            <option value="job-creation">Job Creation & Benchmarking</option>
                            <option value="skill-based-hiring">Skill-Based Hiring</option>
                            <option value="assessments">Assessments & Proctoring</option>
                            <option value="interviews">Interviews & Transcripts</option>
                            <option value="candidate-evaluation">Candidate Evaluation Matrix</option>
                        </select>
                    </div>
                </div>

                {/* Input Controls */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={questionInput}
                                onChange={(e) => setQuestionInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isAsking) {
                                        handleAskQuestion();
                                    }
                                }}
                                placeholder="Ask a hiring question (e.g., How should I interpret a candidate with 75% match score?)"
                                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs md:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all shadow-inner"
                            />
                        </div>

                        {/* Enhanced Role Context Input with Icon & Tooltip */}
                        <div 
                            className="relative sm:w-64" 
                            title="Target Role & Seniority: Calibrates benchmarks, coding test depth, and interview questions specifically to the role."
                        >
                            <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={roleContextInput}
                                onChange={(e) => setRoleContextInput(e.target.value)}
                                placeholder="Target Role (e.g. Senior Go Lead)"
                                className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs md:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all shadow-inner"
                            />
                        </div>

                        <button
                            onClick={() => handleAskQuestion()}
                            disabled={isAsking || !questionInput.trim()}
                            className="rec-btn-primary px-6 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {isAsking ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={15} />
                                    <span>Ask Assistant</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Role Context Explanatory Helper Note */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-1">
                        <Info size={12} className="text-indigo-500 shrink-0" />
                        <span><strong>Role Context:</strong> Specify the job title & seniority (e.g., <em>Senior Go Lead</em>, <em>Junior React Developer</em>) to calibrate exact passing benchmarks and tailored interview questions.</span>
                    </div>

                    {/* Quick Starter Prompts Chips */}
                    <div className="pt-2">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Compass size={13} className="text-slate-400" />
                            <span>Quick Questions & Templates:</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {quickPrompts.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handlePromptChipClick(item)}
                                    className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-xl border border-slate-200/80 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                                >
                                    <Sparkles size={11} className="text-indigo-500 shrink-0" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Assistant Response Output Box */}
                <AnimatePresence>
                    {assistantResponse && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-6 md:p-7 rounded-[1.75rem] bg-gradient-to-br from-slate-50 to-[#faf8f5] border border-slate-200 shadow-sm space-y-4"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Advisory Recommendation</span>
                                    <span className="text-[10px] text-slate-500 font-medium">({assistantResponse.timestamp})</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopyResponse}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                        title="Copy answer to clipboard"
                                    >
                                        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                        <span>{copied ? 'Copied!' : 'Copy Answer'}</span>
                                    </button>

                                    <button
                                        onClick={() => setAssistantResponse(null)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                        title="Clear answer"
                                    >
                                        <RotateCcw size={13} />
                                        <span>Clear</span>
                                    </button>
                                </div>
                            </div>

                            {/* User Question Echo with Role Context Badge */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500 bg-white/80 p-3 rounded-xl border border-slate-200/60">
                                <div>
                                    <span className="text-slate-400 uppercase tracking-wider text-[10px]">Your Question: </span>
                                    <span className="text-slate-900">"{assistantResponse.question}"</span>
                                </div>
                                {assistantResponse.roleContext && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100/80">
                                        <Briefcase size={12} className="text-indigo-500" />
                                        <span>Calibrated for: {assistantResponse.roleContext}</span>
                                    </span>
                                )}
                            </div>

                            {/* Markdown Rendered Content (No raw ### or ####) */}
                            <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-inner">
                                <MarkdownRenderer text={assistantResponse.answer} />
                            </div>

                            {/* Action Quick Links */}
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <span className="text-slate-500 font-medium">Ready to apply this insight?</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate('/recruiter/post-job')}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                                    >
                                        <span>Post or Edit Job</span>
                                        <ArrowRight size={13} />
                                    </button>
                                    <span className="text-slate-300">•</span>
                                    <button
                                        onClick={() => navigate('/recruiter/applicants')}
                                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-800 transition cursor-pointer"
                                    >
                                        <span>Check Applicants</span>
                                        <ArrowRight size={13} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 3. The 5 Pillar Navigation Cards */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Curated Recruitment Playbooks</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Explore best practices, benchmarks, and rubrics across each core hiring pillar</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                        5 Pillars Available
                    </span>
                </div>

                {/* 5 Pillar Horizontal Tab Switcher */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {pillars.map((pillar) => {
                        const IconComponent = pillar.icon || BookOpen;
                        const isActive = activePillar === pillar.id;

                        return (
                            <button
                                key={pillar.id}
                                onClick={() => {
                                    setActivePillar(pillar.id);
                                    setSelectedCategory(pillar.id);
                                }}
                                className={`
                                    p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between group
                                    ${isActive 
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md transform -translate-y-0.5' 
                                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80 hover:border-slate-300'}
                                `}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                                        isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                        <IconComponent size={18} />
                                    </div>
                                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {pillar.tag}
                                    </span>
                                </div>
                                <div>
                                    <h3 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                        {pillar.title.split(' ')[0]} {pillar.title.split(' ')[1] || ''}
                                    </h3>
                                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                                        {pillar.subtitle.split(',')[0]}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 4. Active Pillar Deep Dive View */}
            <motion.div
                key={currentPillar.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
            >
                {/* Pillar Header Card */}
                <div className="rec-card p-7 md:p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-100">
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white">
                                    {currentPillar.tag}
                                </span>
                                <h2 className="text-2xl font-bold text-slate-900">{currentPillar.title}</h2>
                            </div>
                            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                                {currentPillar.description}
                            </p>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                            <button
                                onClick={() => navigate(currentPillar.actionLink)}
                                className="rec-btn-primary flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                <span>{currentPillar.actionText}</span>
                                <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Benchmark Guidelines Strip (if present) */}
                    {currentPillar.benchmarks && (
                        <div className="mt-6 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                            <div className="flex items-center gap-2">
                                <Sliders size={16} className="text-indigo-600" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Recommended Match Benchmarks by Seniority</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {Object.entries(currentPillar.benchmarks).map(([level, desc], idx) => (
                                    <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/60 text-xs">
                                        <span className="font-extrabold text-slate-900 uppercase tracking-wider block mb-1">
                                            {level.replace(/([A-Z])/g, ' $1')}
                                        </span>
                                        <p className="text-slate-600 text-[11px] leading-relaxed">{desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Best Practice Framework Grid */}
                    <div className="mt-7 space-y-3">
                        <div className="flex items-center gap-2">
                            <Award size={16} className="text-amber-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Core Hiring Principles</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {currentPillar.keyPractices?.map((practice, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                            {idx + 1}
                                        </span>
                                        <h5 className="text-xs font-bold text-slate-900">{practice.title}</h5>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-normal">{practice.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Templates Preview (if present) */}
                    {currentPillar.templates && currentPillar.templates.length > 0 && (
                        <div className="mt-7 space-y-3">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-teal-600" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Ready-to-Use Reference Structure</h4>
                            </div>
                            <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed space-y-2">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                    <span className="text-[11px] font-bold text-amber-400">{currentPillar.templates[0].title}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(currentPillar.templates[0].preview);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                    >
                                        <Copy size={11} />
                                        <span>Copy Structure</span>
                                    </button>
                                </div>
                                <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-300">
                                    {currentPillar.templates[0].preview}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* 5. Pillar FAQ Accordion */}
                <div className="rec-card p-7 md:p-8 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <HelpCircle size={18} className="text-indigo-600" />
                            <h3 className="text-lg font-bold text-slate-900">Frequently Asked Recruiter Questions</h3>
                        </div>

                        {/* Search in FAQs */}
                        <div className="relative min-w-[220px]">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search questions..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:outline-none focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((faq, idx) => {
                                const isOpen = expandedFaq === idx;
                                return (
                                    <div
                                        key={idx}
                                        className="border border-slate-200 rounded-2xl overflow-hidden bg-white transition-all"
                                    >
                                        <button
                                            onClick={() => setExpandedFaq(isOpen ? null : idx)}
                                            className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer"
                                        >
                                            <span className="text-xs md:text-sm font-bold text-slate-900">{faq.q}</span>
                                            {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                                        </button>
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50 font-normal"
                                                >
                                                    {faq.a}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-6 text-xs text-slate-500">
                                No questions found matching "{searchFilter}".
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* 6. Recruiter Ecosystem Quick Actions Bar */}
            <div className="p-7 rounded-[2rem] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-1.5 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        <ShieldCheck size={18} className="text-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Ready to hire?</span>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">Put this knowledge into practice on Hire1Percent</h3>
                    <p className="text-xs text-slate-400 max-w-xl">
                        Publish your job requisition, configure automated proctored coding assessments, and review top 1% candidate transcripts.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                        onClick={() => navigate('/recruiter/post-job')}
                        className="px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md"
                    >
                        Create New Job
                    </button>
                    <button
                        onClick={() => navigate('/recruiter/ai-search')}
                        className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer border border-white/15"
                    >
                        Talent Search
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecruiterKnowledgeHub;
