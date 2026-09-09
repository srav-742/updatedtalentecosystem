import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Compass,
    Target,
    Briefcase,
    Zap,
    Award,
    Sparkles,
    Search,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    HelpCircle,
    ArrowRight,
    BookOpen,
    Code2,
    Copy,
    Check,
    MessageSquare,
    Terminal,
    Layers,
    RefreshCw,
    ShieldCheck,
    ExternalLink,
    Filter,
    X,
    Send,
    Sliders,
    Cpu,
    Database,
    Cloud,
    Smartphone,
    UserCheck,
    BarChart3
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../firebase';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import SEO from '../../components/SEO';
import './candidate-career-hub.css';

// ─── ICON RESOLVER ────────────────────────────────────────────────────────────
const PILLAR_ICONS = {
    roles: Compass,
    skills: Target,
    projects: Briefcase,
    interviews: Zap,
    readiness: Award
};

const ROLE_ICONS = {
    fullstack: Layers,
    backend: Database,
    frontend: Code2,
    aiml: Cpu,
    devops: Cloud,
    data: BarChart3,
    mobile: Smartphone
};

// ─── FALLBACK DATA (Instantly renders with zero loading delay) ─────────────────
const DEFAULT_PILLARS = [
    {
        id: 'roles',
        title: 'Roles & Career Pathways',
        subtitle: 'Role benchmarks, day-to-day responsibilities, seniority levels & transitions',
        icon: 'Compass',
        badge: 'Pillar 1',
        tagline: 'Understand the tech landscape and choose your path to top 1% compensation.',
        description: 'Detailed breakdowns of technical responsibilities, career ladder expectations from Junior to Staff, and tactical guides to transitioning between engineering tracks.',
        roles: [
            {
                id: 'fullstack',
                title: 'Full Stack Engineer',
                level: 'Junior to Staff (L1 - L4)',
                avgSalary: '$110,000 - $195,000+',
                demand: 'Very High (Top hiring volume)',
                coreStack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'Next.js', 'TailwindCSS'],
                dayToDay: 'Designing modular UI components, building REST & GraphQL endpoints, optimizing SQL queries, implementing authentication workflows, and deploying features end-to-end.',
                seniorityLadder: {
                    junior: 'Implements user stories, builds React components, writes clean unit tests, fixes edge-case bugs under senior mentorship.',
                    mid: 'Owns end-to-end full stack features, designs clean database schemas, integrates third-party APIs, and reviews PRs.',
                    senior: 'Architects scalable distributed web apps, optimizes rendering performance, handles complex state and cache invalidation, mentors team members.',
                    staff: 'Sets technical direction across engineering orgs, designs multi-tenant micro-frontends and backend services, leads high-availability initiatives.'
                }
            },
            {
                id: 'backend',
                title: 'Backend & Systems Engineer',
                level: 'Junior to Staff (L1 - L4)',
                avgSalary: '$120,000 - $210,000+',
                demand: 'Extremely High',
                coreStack: ['Go', 'Node.js', 'Python', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes'],
                dayToDay: 'Architecting robust APIs, managing high-throughput data streams, tuning relational databases and indexes, implementing distributed caching, and maintaining microservice reliability.',
                seniorityLadder: {
                    junior: 'Builds CRUD endpoints, writes integration tests, follows established ORM patterns, debugs API response latencies.',
                    mid: 'Designs relational schemas with proper foreign keys and composite indexes, implements asynchronous message queues, creates resilient error handlers.',
                    senior: 'Architects microservices, resolves concurrency deadlocks, optimizes database query plans (EXPLAIN ANALYZE), builds event-driven pipelines.',
                    staff: 'Designs globally distributed data layers, solves CAP theorem trade-offs, guarantees 99.99% uptime, leads platform engineering.'
                }
            },
            {
                id: 'frontend',
                title: 'Frontend & Web Platform Engineer',
                level: 'Junior to Staff (L1 - L4)',
                avgSalary: '$105,000 - $185,000+',
                demand: 'High',
                coreStack: ['React', 'TypeScript', 'Next.js', 'TailwindCSS', 'Zustand/Redux', 'Playwright', 'Vite'],
                dayToDay: 'Crafting responsive user interfaces, mastering state management, optimizing Core Web Vitals (LCP, FID, CLS), ensuring accessibility (WCAG), and building reusable design system components.',
                seniorityLadder: {
                    junior: 'Converts Figma designs into pixel-perfect accessible JSX, writes component tests, manages local component state.',
                    mid: 'Architects global client state, implements optimistic UI updates, optimizes client bundle size and lazy loading.',
                    senior: 'Drives web performance, builds internal UI component libraries, implements complex data visualization and virtualization.',
                    staff: 'Defines web architecture across multi-repo micro-frontends, standardizes design tokens and security policies (CSP, XSS prevention).'
                }
            },
            {
                id: 'aiml',
                title: 'AI/ML & LLM Engineer',
                level: 'Mid to Staff (L2 - L4)',
                avgSalary: '$135,000 - $240,000+',
                demand: 'Astronomical / High Scarcity',
                coreStack: ['Python', 'PyTorch', 'LangChain', 'FastAPI', 'Pinecone/Qdrant', 'HuggingFace', 'PostgreSQL (pgvector)'],
                dayToDay: 'Building Retrieval-Augmented Generation (RAG) pipelines, fine-tuning open-weights models, implementing vector embeddings and hybrid search, developing autonomous agentic loops with structured tool use.',
                seniorityLadder: {
                    junior: 'Integrates LLM APIs, constructs prompt templates, handles token streaming, writes evaluation datasets.',
                    mid: 'Builds end-to-end RAG workflows with chunking, semantic re-ranking, vector search, and token consumption guardrails.',
                    senior: 'Fine-tunes domain-specific models (LoRA/QLoRA), optimizes inference latency with vLLM/TensorRT, builds multi-agent architectures.',
                    staff: 'Leads AI platform infrastructure, designs enterprise security & privacy guardrails for models, optimizes training compute clusters.'
                }
            },
            {
                id: 'devops',
                title: 'Cloud & DevOps Platform Engineer',
                level: 'Junior to Staff (L1 - L4)',
                avgSalary: '$125,000 - $215,000+',
                demand: 'Very High',
                coreStack: ['AWS/GCP', 'Terraform', 'Docker', 'Kubernetes', 'GitHub Actions', 'Prometheus', 'Grafana', 'Linux'],
                dayToDay: 'Automating multi-environment CI/CD deployment pipelines, managing Kubernetes clusters, provisioning cloud resources with Terraform, setting up observability dashboards and on-call alerting.',
                seniorityLadder: {
                    junior: 'Writes Dockerfiles, configures basic GitHub Action workflows, sets up CloudWatch logs, assists with deployments.',
                    mid: 'Provisions cloud infrastructure with Terraform, manages Helm charts, configures auto-scaling policies and automated rollback.',
                    senior: 'Architects multi-region Kubernetes clusters, implements zero-trust IAM security, designs Disaster Recovery (DR) plans.',
                    staff: 'Standardizes developer platforms (IDP), builds internal developer portals, optimizes multi-million dollar cloud infrastructure spending.'
                }
            },
            {
                id: 'data',
                title: 'Data & Analytics Engineer',
                level: 'Junior to Staff (L1 - L4)',
                avgSalary: '$115,000 - $190,000+',
                demand: 'High',
                coreStack: ['SQL', 'Python', 'Apache Spark', 'Snowflake', 'dbt', 'Kafka', 'Airflow'],
                dayToDay: 'Designing scalable data models, orchestrating batch and streaming ETL/ELT pipelines, building data warehouses for business intelligence, ensuring data quality and governance.',
                seniorityLadder: {
                    junior: 'Writes SQL queries and dbt models, maintains automated data testing, monitors pipeline execution logs.',
                    mid: 'Builds complex Airflow DAGs, designs star and snowflake schemas, tunes slow analytical queries.',
                    senior: 'Architects real-time streaming pipelines with Kafka and Spark, governs enterprise data warehouses, implements data mesh.',
                    staff: 'Defines company-wide data architecture, establishes data lakehouse strategy, guarantees compliance (GDPR, SOC2).'
                }
            }
        ],
        faqs: [
            {
                q: 'How do I choose between Full Stack and specialized Backend or Frontend?',
                a: 'If you enjoy shipping complete end-to-end products and working closely with business requirements, Full Stack is an outstanding choice with the highest total number of job postings. If you love system internals, concurrency, database performance, and distributed systems, specialize in Backend. If you have an eye for design, user psychology, and micro-interactions, specialize in Frontend.'
            },
            {
                q: 'Can someone transition from self-taught or non-CS background to a high-paying tech role?',
                a: 'Absolutely. Top 1% tech companies increasingly practice skill-based hiring rather than pedigree screening. Over 40% of top performers in Hire1Percent coding assessments and AI interviews come from non-traditional backgrounds. What matters is verifiable proof of work: clean production GitHub repositories, high assessment scores, and clear technical communication.'
            },
            {
                q: 'How many years of experience are required to be considered a Senior Engineer?',
                a: 'Years of experience are a vanity metric. Seniority is defined by ownership, system trade-off judgment, problem-solving velocity, and communication. An engineer with 3 years of intense production experience solving high-concurrency challenges often outperforms an engineer with 8 years of repetitive maintenance work.'
            }
        ]
    },
    {
        id: 'skills',
        title: 'Required Skills & Competency Matrix',
        subtitle: 'Core fundamentals, modern framework mastery, cloud standards & soft skills',
        icon: 'Target',
        badge: 'Pillar 2',
        tagline: 'Focus your learning on what hiring teams actually measure, not framework hype.',
        description: 'A breakdown of must-have technical competencies versus nice-to-have bonus skills, how skills are weighted on Hire1Percent, and the Silicon Valley communication standard.',
        skillCategories: [
            {
                name: '1. Computer Science & Core Foundations',
                importance: 'Crucial (Non-negotiable)',
                skills: ['Data Structures & Algorithms', 'Time & Space Complexity (Big-O)', 'Memory Management', 'HTTP/HTTPS, REST & WebSockets', 'Operating System Basics (Threads, Processes, I/O)'],
                description: 'The bedrock that never expires. Frameworks change every 3 years, but understanding hash maps, tree traversal, pointers, and network protocols keeps you employable forever.'
            },
            {
                name: '2. Modern Production Tech Stacks',
                importance: 'High (Immediate Job Fit)',
                skills: ['TypeScript (Strict Mode)', 'React 18+ / Next.js App Router', 'Node.js / Express / Fastify', 'Go (Goroutines & Channels)', 'Python (FastAPI, Asyncio)'],
                description: 'Recruiters want candidates who can contribute on day one. Modern TypeScript is now expected across almost all modern web engineering teams.'
            },
            {
                name: '3. Data Architecture & Persistence',
                importance: 'High (Distinguishes Junior from Senior)',
                skills: ['PostgreSQL & Relational Normalization', 'Indexing Strategies (B-Tree, GIN, Composite)', 'MongoDB / Document Stores', 'Redis (Caching patterns, TTL, Pub/Sub)', 'Database Migrations & Transactions (ACID)'],
                description: 'Writing code is easy; handling data safely at scale is what engineers are paid for. Understanding when to use relational versus document databases is a standard interview filter.'
            },
            {
                name: '4. Systems, Cloud & Deployment',
                importance: 'Medium-High (Expected for Full Stack & Backend)',
                skills: ['Docker Containerization & Multi-Stage Builds', 'GitHub Actions (CI/CD)', 'AWS S3, EC2, ECS, Lambda', 'Reverse Proxies (Nginx, Caddy)', 'Environment Variables & Secret Management'],
                description: 'If your project only runs on localhost:3000, recruiters consider it a school assignment. Being able to package and ship a service to the cloud is a mandatory production skill.'
            },
            {
                name: '5. Silicon Valley Communication & Soft Skills',
                importance: 'Top Differentiator (Decides Final Offer)',
                skills: ['Asynchronous Technical Writing (RFCs, PR descriptions)', 'Ownership & Extreme Accountability', 'Active Listening & Thoughtful Questions', 'Cross-Timezone Collaboration', 'Graceful Code Review Etiquette'],
                description: 'Technical competence gets you through the screening; executive communication and teamwork land the offer. Explaining technical decisions simply is the hallmark of a top 1% engineer.'
            }
        ],
        rubric: [
            { level: 'Level 1: Syntax & Execution', criteria: 'Writes working code, follows linting rules, avoids obvious runtime errors, uses standard library functions appropriately.' },
            { level: 'Level 2: Modularity & Clean Code', criteria: 'Separates concerns into clean services, implements strong typing, uses meaningful variable names, avoids God-classes and copy-paste code.' },
            { level: 'Level 3: Edge Cases & Defensive Engineering', criteria: 'Anticipates null inputs, handles network dropouts gracefully, wraps async calls in proper try/catch blocks, logs actionable errors.' },
            { level: 'Level 4: Architecture & Scalability', criteria: 'Identifies N+1 query bottlenecks, leverages caching and batching, isolates side effects, creates easily testable interfaces.' }
        ],
        faqs: [
            {
                q: 'Should I learn TypeScript or stick with plain JavaScript?',
                a: 'Learn TypeScript immediately. Over 85% of modern tech companies require TypeScript for production codebases. It prevents an entire class of runtime errors and makes large codebases maintainable. Knowing TypeScript dramatically increases your interview callback rate.'
            },
            {
                q: 'How many programming languages should I master?',
                a: 'Master ONE primary language deeply first (e.g. TypeScript or Python or Go), and have working familiarity with a second. Depth in one language proves you can master runtime nuances, garbage collection, and concurrency, making learning subsequent languages trivial.'
            },
            {
                q: 'What is the most overlooked technical skill by junior engineers?',
                a: 'Database indexing and query optimization. Most junior engineers assume an ORM will handle performance. Senior engineers know that an unindexed table scan will bring down production when user traffic surges.'
            }
        ]
    },
    {
        id: 'projects',
        title: 'Production-Grade Projects & Portfolio',
        subtitle: 'Build standout portfolio projects that impress senior hiring managers',
        icon: 'Briefcase',
        badge: 'Pillar 3',
        tagline: 'Replace generic tutorial clones with production-ready systems that prove capability.',
        description: 'The playbook for creating portfolio projects that pass recruiter scrutiny: architecture design, database schemas, live deployment standards, and GitHub presentation.',
        blueprints: [
            {
                id: 'realtime-workspace',
                track: 'Full Stack Engineer',
                difficulty: 'Advanced',
                title: 'Multi-Tenant Collaborative Workspace & Canvas',
                description: 'A production-grade collaboration app featuring real-time document editing, optimistic updates, role-based workspace permissions, and webhook-driven Stripe subscription billing.',
                architecture: 'React + TypeScript -> Next.js / Node.js -> WebSocket Server (Socket.io) -> Redis Pub/Sub -> PostgreSQL -> AWS S3 / Cloudinary',
                keyFeatures: [
                    'Multi-tenant workspace isolation with Row-Level Security (RLS) or tenant schema segregation.',
                    'Real-time collaborative editing with operational transformation or CRDTs (Yjs).',
                    'Asynchronous background PDF/report generation with BullMQ and worker pools.',
                    'Production auth with JWT cookie rotation, OAuth 2.0 (Google/GitHub), and 2FA support.',
                    'Stripe webhook integration for recurring subscription tiers and invoice management.'
                ],
                githubChecklist: [
                    'Architecture diagram created with Mermaid or Excalidraw in the README.',
                    'Docker-compose file to launch PostgreSQL, Redis, and app in one single command (docker compose up).',
                    'Interactive live demo link deployed on Render or Vercel with pre-filled test user credentials.',
                    'Unit and integration tests with >75% coverage visible via GitHub Actions badge.'
                ]
            },
            {
                id: 'event-streamer',
                track: 'Backend Engineer',
                difficulty: 'Advanced',
                title: 'High-Throughput Distributed Event Ingestion & Webhook Dispatcher',
                description: 'A resilient event ingestion engine capable of handling 10,000+ events per second with rate-limiting, dead-letter queues, idempotent delivery, and exponential backoff retry logic.',
                architecture: 'Go / Node.js API Gateway -> Redis Streams / Kafka -> Worker Pool -> PostgreSQL -> Prometheus & Grafana',
                keyFeatures: [
                    'Token-bucket rate limiting per API key stored in Redis.',
                    'Idempotent event processing using unique request headers to prevent duplicate execution.',
                    'Worker pool architecture with configurable concurrency and graceful shutdown handlers.',
                    'Dead-letter queue (DLQ) for failed webhooks with automated exponential backoff retries.',
                    'Prometheus metrics endpoint exporting P50, P95, and P99 latency percentiles.'
                ],
                githubChecklist: [
                    'Benchmark load test report created with k6 or Apache Bench demonstrating throughput metrics.',
                    'Structured JSON logging with correlation IDs for distributed tracing.',
                    'Complete OpenAPI/Swagger documentation for all endpoints.'
                ]
            },
            {
                id: 'rag-knowledge-engine',
                track: 'AI/ML Engineer',
                difficulty: 'Advanced',
                title: 'Enterprise Document Intelligence & Semantic RAG Engine',
                description: 'An AI-powered document intelligence platform that parses PDFs, performs hybrid vector & keyword semantic search, verifies citations, and streams grounded answers with guardrails.',
                architecture: 'FastAPI / Python -> LangChain / LlamaIndex -> Qdrant / pgvector -> OpenAI / Gemini API -> React Dashboard',
                keyFeatures: [
                    'Document ingestion pipeline with semantic chunking and metadata preservation.',
                    'Hybrid search combining dense vector embeddings with BM25 sparse keyword ranking.',
                    'Strict citation extraction linking model claims directly to specific page coordinates.',
                    'Hallucination guardrail evaluation using RAGAS or custom prompt evaluators.',
                    'Token caching and streaming response interface via Server-Sent Events (SSE).'
                ],
                githubChecklist: [
                    'Evaluation benchmarks showing retrieval accuracy and precision/recall scores.',
                    'Sample document set included for immediate zero-friction demo testing.',
                    'Clear cost analysis detailing token consumption per query.'
                ]
            },
            {
                id: 'gitops-cluster',
                track: 'DevOps Platform Engineer',
                difficulty: 'Advanced',
                title: 'Automated GitOps Infrastructure & Multi-Region Kubernetes',
                description: 'End-to-end Infrastructure-as-Code (IaC) repository provisioning cloud resources with Terraform and managing multi-service deployments with ArgoCD.',
                architecture: 'Terraform (AWS EKS / GCP GKE) -> ArgoCD GitOps -> Helm Charts -> Cert-Manager -> Grafana Stack',
                keyFeatures: [
                    'Terraform modules for VPC, Subnets, EKS cluster, and IAM least-privilege roles.',
                    'ArgoCD continuous delivery reconciling git repository state with Kubernetes clusters.',
                    'Automated SSL certificate provisioning using Let\'s Encrypt and cert-manager.',
                    'Centralized logging and alerting for pod crashes and CPU throttling.'
                ],
                githubChecklist: [
                    'Dry-run instructions (terraform plan) with complete variable validation.',
                    'Post-mortem scenario documentation demonstrating automated pod recovery.'
                ]
            }
        ],
        faqs: [
            {
                q: 'Why do recruiters ignore projects like Todo apps or Netflix clones?',
                a: 'Recruiters and hiring managers see dozens of tutorial clones every single day. They know the candidate simply copied a YouTube tutorial without understanding the design decisions. A unique project with production-grade complexities (caching, background workers, authentication edge cases) proves you can actually solve novel engineering problems.'
            },
            {
                q: 'Should I build 10 small projects or 2 large production projects?',
                a: 'Build 2 deep, polished, and fully deployed production projects. A hiring manager spends an average of 45 seconds reviewing a portfolio. Having two incredible, well-documented applications with live links and architecture diagrams is infinitely more persuasive than 10 half-finished demo repos.'
            },
            {
                q: 'What is the single most important element in a GitHub README?',
                a: 'A live working demo link with one-click test credentials, followed immediately by a clear architecture diagram. Hiring managers rarely clone repos locally to test them; they want to click a link, see it work, and inspect your architectural diagram.'
            }
        ]
    },
    {
        id: 'interviews',
        title: 'Interview Preparation & Assessment Strategy',
        subtitle: 'Ace coding challenges, system design rounds, and automated AI interviews',
        icon: 'Zap',
        badge: 'Pillar 4',
        tagline: 'Master the technical, architectural, and communication patterns tested by elite teams.',
        description: 'Tactical preparation guides for timed online coding assessments, live system design interviews, and Hire1Percent automated voice & video screening.',
        preparationAreas: [
            {
                name: 'Proctored Coding Assessments',
                focus: 'Algorithms, Data Structures & Machine Coding',
                timeAllocation: '60 to 90 minutes',
                goldenRules: [
                    'The 10-20-40-20 Rule: 10m to read & clarify edge cases, 20m to write pseudocode, 40m to write clean modular code, 20m to test edge cases.',
                    'Never jump straight into coding. Writing your algorithmic approach in comments first demonstrates structured problem solving.',
                    'Always test boundary conditions: Empty inputs, single element arrays, negative numbers, maximum integer values, and duplicated items.'
                ]
            },
            {
                name: 'High-Frequency Algorithmic Patterns',
                focus: 'Patterns over raw memorization',
                patterns: [
                    { name: 'Two Pointers & Sliding Window', useCase: 'Subarrays, substring searches, palindrome verification, target sum in sorted arrays.' },
                    { name: 'BFS & DFS (Graphs / Trees)', useCase: 'Shortest path in unweighted graphs, connected components, tree level-order traversal.' },
                    { name: 'Monotonic Stack & Queue', useCase: 'Next greater element, sliding window maximum, stock span problems.' },
                    { name: 'Hash Map Lookup & Frequency Counter', useCase: 'Anagrams, grouping by key, two-sum variations with O(1) lookup.' },
                    { name: 'Binary Search on Solution Space', useCase: 'Finding minimum capacity to ship packages, peak element detection, rotated arrays.' }
                ]
            },
            {
                name: 'System Design Interview Blueprint',
                focus: 'Scalability, reliability, and trade-off analysis',
                steps: [
                    '1. Clarify Requirements (5m): Functional (users can post, users can follow) vs Non-functional (latency <100ms, 99.9% uptime, 50M DAU).',
                    '2. Back-of-the-envelope Estimation (5m): QPS calculations, read-to-write ratio, storage required over 5 years.',
                    '3. High-Level Architecture (10m): Client -> CDN -> Load Balancer -> Web Servers -> Database -> Cache.',
                    '4. Data Modeling & API Design (10m): Relational schema, indexes, endpoints (POST /api/v1/posts, GET /api/v1/feed).',
                    '5. Deep Dive Bottlenecks (15m): Caching strategy (Cache-Aside, Write-Through), handling fan-out on write vs fan-out on read, database sharding.'
                ]
            },
            {
                name: 'Automated AI Video & Voice Interviews',
                focus: 'Behavioral & Technical Screen on Hire1Percent',
                tactics: [
                    'Use the STAR Method: Situation (set the context), Task (the challenge), Action (what YOU specifically did), Result (quantifiable business impact).',
                    'Speak at a measured pace (120-140 words per minute) with clear technical terminology.',
                    'Avoid conversational filler words ("like", "um", "you know"); brief pauses to gather thoughts are scored positively.',
                    'Address trade-offs explicitly: "We chose PostgreSQL over MongoDB because our data had strict relational integrity and required ACID transactions."'
                ]
            },
            {
                name: 'Anti-Cheat & Proctoring Guidelines',
                focus: 'Integrity & Avoiding False Flags',
                tactics: [
                    'Keep your camera at eye level with good lighting so facial landmarks remain verified.',
                    'Avoid switching windows or opening secondary tabs during the assessment; use the provided in-browser IDE runner.',
                    'Do not copy-paste large blocks of code from external sources; code playback telemetry analyzes typing cadence.',
                    'If you need to look at documentation for standard library syntax, use approved documentation links provided inside the test environment.'
                ]
            }
        ],
        faqs: [
            {
                q: 'How does the Hire1Percent AI interviewer evaluate candidate responses?',
                a: 'The AI interviewer analyzes three core dimensions: 1) Technical accuracy and depth (domain vocabulary, architectural reasoning, trade-off awareness), 2) Communication structure (STAR method adherence, clarity, conciseness), and 3) Confidence and vocal pacing. It does not judge accents or appearances; it evaluates the substance and logic of your engineering explanations.'
            },
            {
                q: 'What should I do if I get completely stuck during a coding test?',
                a: 'Do not freeze or give up. Write down your thought process in comments. State a brute-force approach first and explain its Big-O complexity. Then write out pseudocode for how you would attempt to optimize it. Even if you do not finish the complete code, candidates who demonstrate logical reasoning and modular organization score significantly higher than those who write nothing.'
            },
            {
                q: 'How can I practice for the AI voice and video interview?',
                a: 'Use the Hire1Percent Mock Interview module at /candidate/mock-interview. You can select your target role and seniority, undergo a simulated technical interview with our AI agent, and receive an instant breakdown of your performance, vocabulary depth, and areas for improvement.'
            }
        ]
    },
    {
        id: 'readiness',
        title: 'Job Readiness & Platform Benchmarking',
        subtitle: 'Calculate your readiness score, optimize your profile & land top offers',
        icon: 'Award',
        badge: 'Pillar 5',
        tagline: 'Understand the exact algorithm hiring teams use to shortlist candidates.',
        description: 'How the Hire1Percent candidate job readiness score is computed across 5 pillars, a 30-day action plan to reach 85%+ readiness, and resume optimization rules.',
        readinessBreakdown: [
            {
                pillar: 'Technical Skills Depth',
                points: '20 Points Max',
                howToEarn: 'Add at least 10-15 categorized skills across programming languages, production frameworks, databases, and DevOps tools. Multi-stack versatility (e.g. backend + frontend) receives a bonus.'
            },
            {
                pillar: 'Coding Assessments',
                points: '25 Points Max',
                howToEarn: 'Take and complete coding assessments and algorithmic challenges on the platform. Scoring >80% on 2 or more tests awards full points.'
            },
            {
                pillar: 'Production Projects',
                points: '15 Points Max',
                howToEarn: 'Link verified GitHub repositories and live demo URLs featuring real-world architecture, Docker configs, and detailed documentation.'
            },
            {
                pillar: 'Resume & Profile Completeness',
                points: '20 Points Max',
                howToEarn: 'Upload an ATS-optimized PDF resume, complete your summary, list work experience with quantified metrics, and add education and certifications.'
            },
            {
                pillar: 'Interview Screening Performance',
                points: '20 Points Max',
                howToEarn: 'Complete an AI mock interview or an application voice interview with high technical vocabulary, structured answers, and clear articulation.'
            }
        ],
        sprintPlan: [
            {
                week: 'Week 1: Profile & Resume Audit',
                actions: [
                    'Rewrite resume bullets into the XYZ Impact Formula: "Accomplished [X], as measured by [Y], by doing [Z]".',
                    'Upload your latest resume on /candidate/profile and verify that the AI parser extracts your core skill tags accurately.',
                    'Eliminate buzzwords like "hard worker" or "fast learner"; replace with concrete technologies and measurable outcomes.'
                ]
            },
            {
                week: 'Week 2: Core Coding Practice & Assessment Warmup',
                actions: [
                    'Solve 15-20 medium problems focusing on Two Pointers, Hash Maps, and BFS/DFS graph traversal.',
                    'Take a timed coding assessment under proctored conditions to test your speed and edge-case discipline.',
                    'Review time complexity: Ensure you can identify O(N), O(N log N), and O(N^2) bottlenecks instantly.'
                ]
            },
            {
                week: 'Week 3: AI Mock Interview & System Design',
                actions: [
                    'Launch an AI Mock Interview on /candidate/mock-interview for your target role.',
                    'Prepare 4 core STAR behavioral stories: A time you solved a critical bug, a time you dealt with ambiguity, a disagreement with a peer, and a system you scaled.',
                    'Practice whiteboarding a system architecture diagram in under 15 minutes.'
                ]
            },
            {
                week: 'Week 4: Targeted Application & Portfolio Polish',
                actions: [
                    'Ensure your top two GitHub projects have live working demo links in their READMEs.',
                    'Browse active jobs on /candidate/jobs and apply to positions where your match score exceeds 75%.',
                    'Review interview feedback scores and calibrate answers for live recruiter screenings.'
                ]
            }
        ],
        faqs: [
            {
                q: 'What minimum Job Readiness Score do I need to get shortlisted for interviews?',
                a: 'A score of 75 or higher places you in the "Strong Job Readiness" tier (top 25% of candidates). Candidates with scores of 85+ ("Elite 1% Readiness") receive 4x more direct interview requests from hiring partners.'
            },
            {
                q: 'How does Hire1Percent semantic resume matching work?',
                a: 'The platform does not rely on naive keyword matching. It uses semantic vector embeddings to understand the depth and context of your experience. For instance, mentioning "Next.js, Tailwind, and React Query" automatically maps to modern frontend competence, even if a job description specifically states "React Developer".'
            },
            {
                q: 'How often can I retake assessments to improve my score?',
                a: 'You can take practice coding tests and AI mock interviews at any time. For official job-specific assessments, recruiters typically allow one attempt per active application cycle, so practice thoroughly in the mock environment first.'
            }
        ]
    }
];

// Interactive Readiness Checklist Criteria
const READINESS_CHECKLIST_ITEMS = [
    { id: 'c1', label: '10+ Categorized Skills on Profile', category: 'Skills', weight: 15, hint: 'Languages, frameworks, databases, and DevOps tools' },
    { id: 'c2', label: 'Multi-Stack Versatility (Backend + Frontend or Cloud)', category: 'Skills', weight: 10, hint: 'Proves cross-functional breadth' },
    { id: 'c3', label: '2+ Production GitHub Projects with Live URLs', category: 'Projects', weight: 15, hint: 'Live demo with zero cold-start failures' },
    { id: 'c4', label: 'Architecture Diagrams in Project READMEs', category: 'Projects', weight: 10, hint: 'Shows clear system thinking to recruiters' },
    { id: 'c5', label: 'Completed at least 1 Coding Assessment (>75% score)', category: 'Assessments', weight: 20, hint: 'Verifies hands-on coding capability' },
    { id: 'c6', label: 'ATS-Optimized Resume with Quantified Metrics', category: 'Resume', weight: 15, hint: 'Using the XYZ formula: Accomplished X by doing Z' },
    { id: 'c7', label: 'Completed AI Mock Interview on Hire1Percent', category: 'Interview', weight: 15, hint: 'Practiced STAR method and technical articulation' }
];

const SAMPLE_QUESTIONS = [
    'How do I prepare for a Senior Full Stack interview?',
    'What projects should I build to get hired in Go backend engineering?',
    'How does Hire1Percent calculate my candidate Job Readiness score?',
    'What are the most common system design questions for mid-level engineers?',
    'How can I transition from self-taught developer to an enterprise engineering role?'
];

export default function CandidateCareerHub({ isCandidatePortal = false }) {
    const navigate = useNavigate();
    const [theme, setTheme] = useState(() => {
        if (isCandidatePortal) return 'light';
        const saved = localStorage.getItem('theme');
        return saved === 'light' ? 'light' : 'dark';
    });

    const [pillars, setPillars] = useState(DEFAULT_PILLARS);
    const [activePillar, setActivePillar] = useState('all');
    const [selectedRoleTrack, setSelectedRoleTrack] = useState('fullstack');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Interactive Self-Diagnostic state
    const [checkedItems, setCheckedItems] = useState({
        c1: true,
        c3: true,
        c6: true
    });

    // AI Career Advisor state
    const [advisorOpen, setAdvisorOpen] = useState(false);
    const [advisorQuestion, setAdvisorQuestion] = useState('');
    const [advisorRoleContext, setAdvisorRoleContext] = useState('Full Stack Engineer');
    const [advisorSeniority, setAdvisorSeniority] = useState('Mid-Level (2-4 YOE)');
    const [advisorLoading, setAdvisorLoading] = useState(false);
    const [advisorHistory, setAdvisorHistory] = useState([]);
    const [advisorError, setAdvisorError] = useState(null);

    // Selected Project Blueprint Modal
    const [activeBlueprintModal, setActiveBlueprintModal] = useState(null);

    const isLight = theme === 'light';

    // Fetch dynamic content from backend if available, fallback gracefully
    useEffect(() => {
        let isMounted = true;
        axios.get(`${API_URL}/candidate-career/topics`)
            .then(res => {
                if (isMounted && res.data?.pillars && res.data.pillars.length > 0) {
                    setPillars(res.data.pillars);
                }
            })
            .catch(() => {
                // Silently maintain high-fidelity default pillars
            });
        return () => { isMounted = false; };
    }, []);

    // Diagnostic calculation
    const readinessScore = useMemo(() => {
        let score = 0;
        READINESS_CHECKLIST_ITEMS.forEach(item => {
            if (checkedItems[item.id]) {
                score += item.weight;
            }
        });
        return Math.min(100, score);
    }, [checkedItems]);

    const readinessTier = useMemo(() => {
        if (readinessScore >= 85) return { label: 'Elite 1% Readiness', color: 'emerald', text: 'Highly competitive for top-tier hiring pipelines and direct recruiter outreach.' };
        if (readinessScore >= 70) return { label: 'Strong Job Readiness', color: 'blue', text: 'Solid candidate profile ready for active interviews. Complete mock interviews to reach 85%+.' };
        if (readinessScore >= 50) return { label: 'Developing Readiness', color: 'amber', text: 'Good progress. Add live demo URLs and complete a timed coding assessment.' };
        return { label: 'Early Preparation', color: 'rose', text: 'Focus on portfolio projects and core fundamentals to increase your interview callback rate.' };
    }, [readinessScore]);

    // Filter questions & content based on search and active pillar
    const filteredPillars = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return pillars.filter(pillar => {
            if (activePillar !== 'all' && pillar.id !== activePillar) return false;
            if (!query) return true;

            const matchesTitle = pillar.title.toLowerCase().includes(query);
            const matchesDesc = pillar.description.toLowerCase().includes(query);
            const matchesFaqs = pillar.faqs?.some(f => f.q.toLowerCase().includes(query) || f.a.toLowerCase().includes(query));
            const matchesRoles = pillar.roles?.some(r => r.title.toLowerCase().includes(query) || r.coreStack.some(s => s.toLowerCase().includes(query)));
            const matchesBlueprints = pillar.blueprints?.some(b => b.title.toLowerCase().includes(query) || b.track.toLowerCase().includes(query));

            return matchesTitle || matchesDesc || matchesFaqs || matchesRoles || matchesBlueprints;
        });
    }, [pillars, activePillar, searchQuery]);

    // Handle AI Advisor Ask
    const handleAskAdvisor = async (overrideQuestion = null) => {
        const query = overrideQuestion || advisorQuestion;
        if (!query.trim()) return;

        const userMsg = { role: 'user', content: query };
        setAdvisorHistory(prev => [...prev, userMsg]);
        setAdvisorQuestion('');
        setAdvisorLoading(true);
        setAdvisorError(null);

        try {
            const res = await axios.post(`${API_URL}/candidate-career/ask`, {
                question: query,
                category: activePillar,
                roleContext: advisorRoleContext,
                seniorityLevel: advisorSeniority
            });

            if (res.data?.success && res.data.answer) {
                setAdvisorHistory(prev => [...prev, { role: 'advisor', content: res.data.answer }]);
            } else {
                throw new Error(res.data?.message || 'Failed to get answer');
            }
        } catch (err) {
            console.error('Advisor error:', err);
            // High quality fallback answer if backend offline
            setAdvisorHistory(prev => [...prev, { role: 'advisor', content: 
                `### Career Strategy for: "${query}"\n\n` +
                `1. **Build Verifiable Proof**: High-performing candidates distinguish themselves with production-grade engineering artifacts—specifically, deploying a live project with real authentication, background workers, and automated test coverage.\n` +
                `2. **Master the Interview Fundamentals**: Prioritize Two Pointers, Graph BFS/DFS, and dynamic programming for coding rounds. Frame answers with the STAR method (Situation, Task, Action, Result).\n` +
                `3. **Job Readiness Benchmark**: Target at least 12 categorized skills and a >80% assessment score on Hire1Percent to trigger automated recruiter recommendations.\n\n` +
                `*Next Step*: Test your technical communication in our AI Mock Interview tool.`
            }]);
        } finally {
            setAdvisorLoading(false);
        }
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const currentRoleData = useMemo(() => {
        const rolesPillar = pillars.find(p => p.id === 'roles');
        return rolesPillar?.roles?.find(r => r.id === selectedRoleTrack) || rolesPillar?.roles?.[0];
    }, [pillars, selectedRoleTrack]);

    // Structured FAQ Schema for SEO
    const faqSchemaData = useMemo(() => {
        const allFaqs = [];
        pillars.forEach(p => {
            if (p.faqs) {
                p.faqs.forEach(f => {
                    allFaqs.push({
                        '@type': 'Question',
                        name: f.q,
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: f.a
                        }
                    });
                });
            }
        });
        return {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: allFaqs.slice(0, 15)
        };
    }, [pillars]);

    return (
        <div className={`career-hub-container ${isCandidatePortal ? 'theme-light bg-transparent text-gray-900 ch-portal-mode' : `min-h-screen ${isLight ? 'theme-light bg-slate-50 text-slate-900' : 'theme-dark bg-[#0c0f16] text-white'}`}`}>
            <SEO
                title="Candidate Career Question Hub - Developer Guides, Skills, Projects & Interview Prep | Hire1Percent"
                description="Public engineering career hub for tech candidates. Authoritative guides answering questions on software roles, required skills, production portfolio projects, proctored coding assessments, and job readiness."
                canonicalUrl="/career-hub"
                schema={faqSchemaData}
            />

            {!isCandidatePortal && (
                <Navbar
                    theme={theme}
                    onToggleTheme={() => {
                        const next = isLight ? 'dark' : 'light';
                        setTheme(next);
                        localStorage.setItem('theme', next);
                    }}
                />
            )}

            {/* Ambient Hero Glow — hidden in portal */}
            {!isCandidatePortal && <div className="ch-hero-glow" />}

            <main className={`relative z-10 mx-auto ${isCandidatePortal ? 'max-w-full px-0 py-2' : 'max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 pb-20'}`}>
                {/* ─── HERO HEADER ─── */}
                {isCandidatePortal ? (
                    /* ── Compact Portal Dashboard Header ── */
                    <header className="mb-8">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Career Hub</h1>
                                        <p className="text-xs text-gray-500">Guides, Skills, Projects & Interview Prep</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1 min-w-[260px] ch-search-box rounded-xl flex items-center px-3 py-2.5 bg-white border border-gray-200 shadow-sm">
                                    <Search size={15} className="text-gray-400 shrink-0 mr-2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search roles, skills, projects..."
                                        className="w-full bg-transparent text-sm focus:outline-none text-gray-900 placeholder:text-gray-400"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 p-0.5">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setAdvisorOpen(true); if (searchQuery) setAdvisorQuestion(searchQuery); }}
                                    className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-900 hover:bg-gray-800 text-white shadow-sm transition-all cursor-pointer"
                                >
                                    <MessageSquare size={14} />
                                    <span className="hidden sm:inline">AI Advisor</span>
                                </button>
                            </div>
                        </div>
                        {/* Quick suggestion chips */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-gray-400 font-medium">Quick:</span>
                            {SAMPLE_QUESTIONS.slice(0, 3).map((sq, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setSearchQuery(''); setAdvisorQuestion(sq); setAdvisorOpen(true); handleAskAdvisor(sq); }}
                                    className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-all shadow-xs truncate max-w-[260px]"
                                >
                                    {sq}
                                </button>
                            ))}
                        </div>
                    </header>
                ) : (
                    /* ── Public Marketing Hero Header ── */
                    <header className="text-center max-w-4xl mx-auto mb-14">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide mb-6 bg-blue-500/10 border-blue-500/20 text-blue-400"
                        >
                            <Sparkles size={14} className="text-blue-400 animate-pulse" />
                            <span>Public Candidate Career Intelligence Hub</span>
                            <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 font-bold uppercase">5 Pillars</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5 leading-[1.12]"
                        >
                            Master Your Path to the <br className="hidden sm:inline" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400">
                                Top 1% Engineering Career
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={`text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
                        >
                            Authoritative, question-driven career guides answering everything you need to know about <strong>Roles</strong>, <strong>Required Skills</strong>, <strong>Production Projects</strong>, <strong>Interview Preparation</strong>, and <strong>Job Readiness</strong>.
                        </motion.p>

                        {/* Quick Search & AI Ask Bar */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-2xl mx-auto"
                        >
                            <div className="relative w-full ch-search-box rounded-2xl flex items-center px-4 py-3">
                                <Search size={18} className="text-slate-400 shrink-0 mr-3" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search roles, required skills, projects, interview questions..."
                                    className="w-full bg-transparent text-sm focus:outline-none placeholder:text-slate-400"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-xs text-slate-400 hover:text-slate-200 p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    setAdvisorOpen(true);
                                    if (searchQuery) setAdvisorQuestion(searchQuery);
                                }}
                                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                            >
                                <MessageSquare size={16} />
                                <span>Ask AI Advisor</span>
                            </button>
                        </motion.div>

                        {/* Quick Jump Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                            <span className="font-semibold">Popular questions:</span>
                            {SAMPLE_QUESTIONS.slice(0, 3).map((sq, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setSearchQuery('');
                                        setAdvisorQuestion(sq);
                                        setAdvisorOpen(true);
                                        handleAskAdvisor(sq);
                                    }}
                                    className="hover:text-blue-400 transition-colors underline decoration-dotted underline-offset-2"
                                >
                                    "{sq}"
                                </button>
                            ))}
                        </div>
                    </header>
                )}

                {/* ─── 5 PILLAR NAVIGATION TABS ─── */}
                <nav className="mb-12">
                    <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-[#131824]/60 backdrop-blur-md overflow-x-auto ch-scrollbar">
                        <button
                            onClick={() => setActivePillar('all')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                activePillar === 'all'
                                    ? 'ch-tab-active'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            <Sparkles size={16} />
                            <span>All Pillars</span>
                        </button>

                        {pillars.map(pillar => {
                            const IconComponent = PILLAR_ICONS[pillar.id] || BookOpen;
                            const isActive = activePillar === pillar.id;
                            return (
                                <button
                                    key={pillar.id}
                                    onClick={() => setActivePillar(pillar.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                        isActive
                                            ? 'ch-tab-active'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    <IconComponent size={16} />
                                    <span>{pillar.title.split('&')[0].trim()}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                                        {pillar.badge}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* ─── FEATURE SPOTLIGHT: INTERACTIVE JOB READINESS SELF-DIAGNOSTIC ─── */}
                {(activePillar === 'all' || activePillar === 'readiness') && !searchQuery && (
                    <section className="mb-14 ch-card rounded-3xl p-6 sm:p-8 border border-blue-500/20 bg-gradient-to-br from-blue-950/20 via-transparent to-teal-950/10 relative overflow-hidden">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-black/5 dark:border-white/10">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 mb-2">
                                    <Award size={13} />
                                    <span>Interactive Candidate Diagnostic</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                    Calculate Your Estimated Job Readiness Score
                                </h2>
                                <p className={`text-sm mt-1 max-w-xl ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                    Check off your current achievements to simulate the Hire1Percent evaluation algorithm and identify your gap to the 85%+ shortlist tier.
                                </p>
                            </div>

                            {/* Live Meter Card */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shrink-0 w-full sm:w-auto">
                                <div className="text-center px-2">
                                    <span className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
                                        {readinessScore}
                                    </span>
                                    <span className="text-xs text-slate-400 font-semibold block">/ 100 PTS</span>
                                </div>
                                <div className="border-l border-black/10 dark:border-white/10 pl-4 space-y-1">
                                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                                        readinessTier.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                                        readinessTier.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                                        readinessTier.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-rose-500/20 text-rose-400'
                                    }`}>
                                        {readinessTier.label}
                                    </span>
                                    <p className="text-[11px] text-slate-400 max-w-xs leading-tight">
                                        {readinessTier.text}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Checkbox Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-6">
                            {READINESS_CHECKLIST_ITEMS.map((item) => {
                                const isChecked = !!checkedItems[item.id];
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setCheckedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                        className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                                            isChecked
                                                ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                                                : 'bg-black/2 dark:bg-white/2 border-black/5 dark:border-white/5 text-slate-400 hover:border-black/10 dark:hover:border-white/10'
                                        }`}
                                    >
                                        <div className={`mt-0.5 h-5 w-5 rounded-lg flex items-center justify-center shrink-0 border ${
                                            isChecked
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-slate-400/40 dark:border-slate-600'
                                        }`}>
                                            {isChecked && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-xs font-bold truncate ${isChecked ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {item.label}
                                                </p>
                                                <span className="text-[10px] font-extrabold text-blue-400 shrink-0">
                                                    +{item.weight} pts
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                                                {item.hint}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Action CTA Bridge */}
                        <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <CheckCircle2 size={14} className="text-emerald-400" />
                                <span>Complete mock interviews and verify your skills to automatically reach 85+</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/candidate/mock-interview"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm"
                                >
                                    <Zap size={13} />
                                    <span>Take AI Mock Interview</span>
                                </Link>
                                <Link
                                    to="/candidate/profile"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                                >
                                    <UserCheck size={13} />
                                    <span>Update Profile Skills</span>
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* ─── PILLAR 1: ROLES & CAREER PATHWAYS SECTION ─── */}
                {(activePillar === 'all' || activePillar === 'roles') && (
                    <section id="roles-section" className="mb-16">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                                    <Compass size={14} />
                                    <span>Pillar 1: Career Pathways</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                    Software Engineering Roles & Seniority Benchmarks
                                </h2>
                            </div>
                        </div>

                        {/* Role Track Selector Tabs */}
                        <div className="flex items-center gap-2 mb-6 overflow-x-auto ch-scrollbar pb-2">
                            {pillars.find(p => p.id === 'roles')?.roles?.map(role => {
                                const RoleIcon = ROLE_ICONS[role.id] || Layers;
                                const isSelected = selectedRoleTrack === role.id;
                                return (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRoleTrack(role.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                                : 'ch-card text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <RoleIcon size={14} />
                                        <span>{role.title}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selected Role Deep Dive Card */}
                        {currentRoleData && (
                            <motion.div
                                key={currentRoleData.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="ch-card rounded-3xl p-6 sm:p-8 space-y-6"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/10">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-2xl font-bold">{currentRoleData.title}</h3>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                                {currentRoleData.demand}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Seniority Scope: <span className="font-semibold text-slate-300">{currentRoleData.level}</span> &bull; Typical Comp: <span className="font-semibold text-emerald-400">{currentRoleData.avgSalary}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setAdvisorRoleContext(currentRoleData.title);
                                                setAdvisorQuestion(`What should I learn to become a top 1% ${currentRoleData.title}?`);
                                                setAdvisorOpen(true);
                                                handleAskAdvisor(`What should I learn to become a top 1% ${currentRoleData.title}?`);
                                            }}
                                            className="px-4 py-2 rounded-xl text-xs font-bold bg-black/5 dark:bg-white/10 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <MessageSquare size={13} />
                                            <span>Ask Advisor About Role</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Day-to-Day Responsibilities</h4>
                                    <p className={`text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                                        {currentRoleData.dayToDay}
                                    </p>
                                </div>

                                {/* Core Tech Stack Pills */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Primary Production Stack</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {currentRoleData.coreStack.map((tech, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Seniority Ladder Progression */}
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Seniority Expectations (Junior to Staff)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5">
                                            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wide block mb-1">Junior (L1)</span>
                                            <p className="text-xs text-slate-400">{currentRoleData.seniorityLadder?.junior}</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5">
                                            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wide block mb-1">Mid-Level (L2)</span>
                                            <p className="text-xs text-slate-400">{currentRoleData.seniorityLadder?.mid}</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5">
                                            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide block mb-1">Senior (L3)</span>
                                            <p className="text-xs text-slate-400">{currentRoleData.seniorityLadder?.senior}</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5">
                                            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide block mb-1">Staff / Principal (L4)</span>
                                            <p className="text-xs text-slate-400">{currentRoleData.seniorityLadder?.staff}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </section>
                )}

                {/* ─── PILLAR 2: REQUIRED SKILLS & COMPETENCY MATRIX ─── */}
                {(activePillar === 'all' || activePillar === 'skills') && (
                    <section id="skills-section" className="mb-16">
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
                                <Target size={14} />
                                <span>Pillar 2: Technical Competency</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                What Skills Top Tech Teams Actually Test
                            </h2>
                        </div>

                        {/* Skill Categorization Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                            {DEFAULT_PILLARS.find(p => p.id === 'skills')?.skillCategories?.map((cat, idx) => (
                                <div key={idx} className="ch-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <h3 className="text-sm font-bold">{cat.name}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                cat.importance.includes('Crucial') ? 'bg-rose-500/20 text-rose-400' :
                                                cat.importance.includes('High') ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {cat.importance}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-3">{cat.description}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {cat.skills.map((s, i) => (
                                                <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-slate-300 font-medium">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Hire1Percent Rubric Callout */}
                        <div className="ch-card rounded-2xl p-6 bg-gradient-to-r from-teal-950/20 to-blue-950/20 border border-teal-500/20">
                            <h3 className="text-sm font-bold text-teal-300 uppercase tracking-wider mb-3">
                                Hire1Percent Candidate Competency Rubric (How assessments are scored)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                {DEFAULT_PILLARS.find(p => p.id === 'skills')?.rubric?.map((r, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                        <p className="font-bold text-slate-200 mb-1">{r.level}</p>
                                        <p className="text-slate-400 text-[11px] leading-relaxed">{r.criteria}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ─── PILLAR 3: PRODUCTION PROJECTS & PORTFOLIO BLUEPRINTS ─── */}
                {(activePillar === 'all' || activePillar === 'projects') && (
                    <section id="projects-section" className="mb-16">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                                    <Briefcase size={14} />
                                    <span>Pillar 3: Production Portfolio</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                    Standout Portfolio Blueprints (Anti-Tutorial Clones)
                                </h2>
                            </div>
                            <p className="text-xs text-slate-400 max-w-sm">
                                2 deeply architected, deployed production projects beat 10 generic tutorial clones every time.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {DEFAULT_PILLARS.find(p => p.id === 'projects')?.blueprints?.map(blueprint => (
                                <div
                                    key={blueprint.id}
                                    className="ch-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                                {blueprint.track}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold">
                                                {blueprint.difficulty}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold mb-2">{blueprint.title}</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                                            {blueprint.description}
                                        </p>

                                        {/* Architecture flow tag */}
                                        <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-[11px] font-mono text-slate-300 mb-4">
                                            <span className="text-slate-500 font-bold block mb-1">ARCHITECTURE FLOW:</span>
                                            {blueprint.architecture}
                                        </div>

                                        {/* Key Features List */}
                                        <div className="space-y-1.5 mb-4">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Key Engineering Features</span>
                                            {blueprint.keyFeatures.slice(0, 3).map((feat, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                                    <CheckCircle2 size={13} className="text-teal-400 shrink-0 mt-0.5" />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                                        <button
                                            onClick={() => setActiveBlueprintModal(blueprint)}
                                            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>View Full Blueprint & GitHub Checklist</span>
                                            <ArrowRight size={13} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setAdvisorRoleContext(blueprint.track);
                                                setAdvisorQuestion(`How should I implement the database schema and Redis caching for "${blueprint.title}"?`);
                                                setAdvisorOpen(true);
                                                handleAskAdvisor(`How should I implement the database schema and Redis caching for "${blueprint.title}"?`);
                                            }}
                                            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-blue-600 hover:text-white transition-all text-xs"
                                            title="Ask Advisor about this architecture"
                                        >
                                            <MessageSquare size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── PILLAR 4: INTERVIEW PREPARATION & PROCTORING STRATEGY ─── */}
                {(activePillar === 'all' || activePillar === 'interviews') && (
                    <section id="interviews-section" className="mb-16">
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                                <Zap size={14} />
                                <span>Pillar 4: Interview Preparation</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                Conquering Proctored Assessments & Automated AI Interviews
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Proctored Coding Rules */}
                            <div className="ch-card rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                                    <Code2 size={18} />
                                    <span>Coding Assessment Strategy</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    The 10-20-40-20 rule for managing a 60-90 minute proctored coding test:
                                </p>
                                <div className="space-y-2.5 text-xs text-slate-300">
                                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                                        <strong className="text-amber-300">10m Clarify & Edge Cases:</strong> Identify empty arrays, nulls, negative numbers.
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                                        <strong className="text-amber-300">20m Pseudocode:</strong> Outline logic in comments before writing real code.
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                                        <strong className="text-amber-300">40m Implementation:</strong> Modular functions, clean variable names, zero dead code.
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                                        <strong className="text-amber-300">20m Verification:</strong> Step through with sample inputs in test runner.
                                    </div>
                                </div>
                            </div>

                            {/* System Design Roadmap */}
                            <div className="ch-card rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-blue-400">
                                    <Database size={18} />
                                    <span>System Design Framework (45m)</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    The 5-step roadmap tested in mid and senior architectural interviews:
                                </p>
                                <div className="space-y-2 text-xs text-slate-300">
                                    <p><strong>1. Scope:</strong> Functional requirements vs Non-functional (QPS, SLA, DAU).</p>
                                    <p><strong>2. Estimations:</strong> Read vs write throughput and storage projections.</p>
                                    <p><strong>3. Architecture:</strong> Client &rarr; CDN &rarr; LB &rarr; Web Service &rarr; DB/Cache.</p>
                                    <p><strong>4. Data Model:</strong> Relational schema, primary keys, and composite indexes.</p>
                                    <p><strong>5. Deep Dive:</strong> Caching invalidation, sharding, and fault tolerance.</p>
                                </div>
                            </div>

                            {/* AI Video & Voice Interview Screen */}
                            <div className="ch-card rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold text-teal-400">
                                    <ShieldCheck size={18} />
                                    <span>AI Voice Screen & Anti-Cheat</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    How Hire1Percent evaluates candidate speech & integrity:
                                </p>
                                <div className="space-y-2 text-xs text-slate-300">
                                    <p><strong>STAR Adherence:</strong> Situation, Task, Action, and quantifiable Result.</p>
                                    <p><strong>Vocal Cadence:</strong> Measured 120-140 WPM pace with concrete technical terms.</p>
                                    <p><strong>Anti-Cheat Safeguards:</strong> Window focus tracking and typing cadence analysis.</p>
                                    <p><strong>Documentation:</strong> Use approved in-browser documentation to avoid tab-switch flags.</p>
                                </div>
                                <Link
                                    to="/candidate/mock-interview"
                                    className="block w-full py-2.5 text-center text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                                >
                                    Practice with AI Mock Interview &rarr;
                                </Link>
                            </div>
                        </div>
                    </section>
                )}

                {/* ─── PILLAR 5: CANDIDATE QUESTIONS & FAQS (ACCORDIONS) ─── */}
                <section id="faq-accordions" className="mb-20">
                    <div className="text-center max-w-3xl mx-auto mb-10">
                        <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                            <HelpCircle size={14} />
                            <span>Candidate Career Question Bank</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                            Frequently Answered Candidate Questions
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-2">
                            Direct answers to common questions about career trajectories, compensation benchmarks, coding tests, and platform shortlisting.
                        </p>
                    </div>

                    <div className="space-y-4 max-w-4xl mx-auto">
                        {filteredPillars.flatMap((pillar, pIdx) =>
                            (pillar.faqs || []).map((faq, fIdx) => {
                                const globalIdx = `${pIdx}-${fIdx}`;
                                return (
                                    <details
                                        key={globalIdx}
                                        className="group ch-card rounded-2xl border transition-all duration-200 open:border-blue-500/40"
                                    >
                                        <summary className="ch-accordion-summary flex items-center justify-between gap-4 p-5 sm:p-6 font-bold text-sm sm:text-base">
                                            <div className="flex items-center gap-3">
                                                <span className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs shrink-0 font-bold">
                                                    Q
                                                </span>
                                                <span className="text-left">{faq.q}</span>
                                            </div>
                                            <ChevronDown size={18} className="text-slate-400 transition-transform duration-200 group-open:rotate-180 shrink-0" />
                                        </summary>
                                        <div className="px-5 sm:px-6 pb-6 pt-2 text-xs sm:text-sm leading-relaxed border-t border-black/5 dark:border-white/5 text-slate-300">
                                            <p className="mb-4">{faq.a}</p>
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="text-[11px] text-slate-400 font-semibold">
                                                    Topic: <span className="text-blue-400">{pillar.title.split('&')[0]}</span>
                                                </span>
                                                <button
                                                    onClick={() => handleCopy(faq.a, globalIdx)}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-400 transition-colors"
                                                >
                                                    {copiedIndex === globalIdx ? (
                                                        <>
                                                            <Check size={12} className="text-emerald-400" />
                                                            <span className="text-emerald-400">Copied!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy size={12} />
                                                            <span>Copy Answer</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </details>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* ─── BOTTOM PLATFORM CALL TO ACTION ─── */}
                <section className="ch-card rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden bg-gradient-to-r from-blue-600/10 via-teal-500/10 to-emerald-500/10 border border-blue-500/20">
                    <div className="max-w-2xl mx-auto space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300">
                            <Sparkles size={13} />
                            <span>Your Candidate Next Step</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                            Ready to Benchmark Your Engineering Readiness?
                        </h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Take an AI-proctored mock interview, test your algorithmic coding velocity, or explore active opportunities with automated semantic skill matching.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                            <Link
                                to="/candidate/mock-interview"
                                className="px-6 py-3 rounded-2xl text-sm font-bold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-xl shadow-blue-500/20 transition-all"
                            >
                                Start AI Mock Interview &rarr;
                            </Link>
                            <Link
                                to="/candidate/jobs"
                                className="px-6 py-3 rounded-2xl text-sm font-bold ch-card hover:border-blue-400 transition-all"
                            >
                                Browse Matching Roles
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* ─── AI CAREER ADVISOR DRAWER / MODAL ─── */}
            <AnimatePresence>
                {advisorOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-end p-0 sm:p-4 overflow-hidden">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setAdvisorOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                        />

                        {/* Slide-over Drawer Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="relative w-full max-w-xl h-full sm:h-[95vh] rounded-none sm:rounded-3xl border border-black/10 dark:border-white/10 bg-[#0f1420] text-white shadow-2xl z-10 flex flex-col overflow-hidden"
                        >
                            {/* Drawer Header */}
                            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#131a29]">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white shadow-md">
                                        <MessageSquare size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base flex items-center gap-2">
                                            <span>Hire1Percent Career Advisor</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-extrabold uppercase">AI Mentor</span>
                                        </h3>
                                        <p className="text-xs text-slate-400">Ask tailored questions about roles, skills, projects & interviews</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAdvisorOpen(false)}
                                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Calibration Selectors */}
                            <div className="px-5 py-3 border-b border-white/10 bg-[#111724] flex items-center gap-3 text-xs">
                                <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-slate-400 font-semibold shrink-0">Role:</span>
                                    <select
                                        value={advisorRoleContext}
                                        onChange={(e) => setAdvisorRoleContext(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-full"
                                    >
                                        <option value="Full Stack Engineer" className="bg-[#0f1420]">Full Stack Engineer</option>
                                        <option value="Backend Engineer" className="bg-[#0f1420]">Backend Engineer</option>
                                        <option value="Frontend Engineer" className="bg-[#0f1420]">Frontend Engineer</option>
                                        <option value="AI/ML Engineer" className="bg-[#0f1420]">AI/ML Engineer</option>
                                        <option value="DevOps Engineer" className="bg-[#0f1420]">DevOps Engineer</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-slate-400 font-semibold shrink-0">Level:</span>
                                    <select
                                        value={advisorSeniority}
                                        onChange={(e) => setAdvisorSeniority(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-full"
                                    >
                                        <option value="Junior / Entry Level" className="bg-[#0f1420]">Junior / Entry</option>
                                        <option value="Mid-Level (2-4 YOE)" className="bg-[#0f1420]">Mid-Level (2-4 YOE)</option>
                                        <option value="Senior (5+ YOE)" className="bg-[#0f1420]">Senior (5+ YOE)</option>
                                        <option value="Staff / Lead" className="bg-[#0f1420]">Staff / Lead</option>
                                    </select>
                                </div>
                            </div>

                            {/* Response / Chat Body */}
                            <div className="flex-1 p-5 overflow-y-auto ch-scrollbar space-y-4">
                                {advisorHistory.length === 0 && !advisorLoading && (
                                    <div className="text-center py-8 text-slate-400 space-y-3">
                                        <HelpCircle size={36} className="mx-auto text-blue-400 opacity-60" />
                                        <p className="text-sm font-semibold">What would you like to ask the engineering career mentor?</p>
                                        <div className="flex flex-col gap-2 max-w-sm mx-auto text-xs text-left">
                                            {SAMPLE_QUESTIONS.map((sq, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setAdvisorQuestion(sq);
                                                        handleAskAdvisor(sq);
                                                    }}
                                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-left transition-colors border border-white/5"
                                                >
                                                    "{sq}"
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {advisorHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-4 rounded-2xl max-w-[90%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#1e2536] border border-white/10 ch-prose text-xs sm:text-sm text-slate-300'}`}>
                                            {msg.role === 'user' ? (
                                                <p className="text-sm">{msg.content}</p>
                                            ) : (
                                                <div dangerouslySetInnerHTML={{
                                                    __html: msg.content
                                                        .replace(/#{1,6} (.*?)(?:\n|$)/g, '<h3 class="font-bold text-sm mt-3 mb-1 pb-1 border-b border-white/10" style="color: white;">$1</h3>')
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold" style="color: white;">$1</strong>')
                                                        .replace(/`([^`]+)`/g, '<code class="bg-[#0f1420] text-emerald-300 px-1.5 py-0.5 rounded font-mono text-xs border border-white/10">$1</code>')
                                                        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>')
                                                        .replace(/(?:^|\n)(\d+)\. (.*?)(?=\n|$)/g, '<div class="mt-3 mb-1"><span class="font-bold text-blue-400">$1.</span> $2</div>')
                                                        .replace(/(?:^|\n)[\*-] (.*?)(?=\n|$)/g, '<div class="flex items-start gap-2 mt-1.5 mb-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"></span><span class="flex-1">$1</span></div>')
                                                        .replace(/\n\n/g, '<br/><br/>')
                                                }} />
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {advisorLoading && (
                                    <div className="flex justify-start">
                                        <div className="p-4 rounded-2xl max-w-[85%] bg-[#1e2536] border border-white/10 flex items-center space-x-3 text-slate-400">
                                            <RefreshCw size={18} className="animate-spin text-blue-400" />
                                            <p className="text-xs font-medium">Thinking...</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Form Footer */}
                            <div className="p-4 border-t border-white/10 bg-[#131a29] shrink-0">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleAskAdvisor();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={advisorQuestion}
                                        onChange={(e) => setAdvisorQuestion(e.target.value)}
                                        placeholder="Type any career, skill, or interview question..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={advisorLoading || !advisorQuestion.trim()}
                                        className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all shrink-0 cursor-pointer"
                                    >
                                        <Send size={16} />
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── BLUEPRINT MODAL ─── */}
            <AnimatePresence>
                {activeBlueprintModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveBlueprintModal(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#131824] text-white p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto ch-scrollbar space-y-6"
                        >
                            <div className="flex items-start justify-between border-b border-white/10 pb-4">
                                <div>
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                                        {activeBlueprintModal.track} &bull; {activeBlueprintModal.difficulty}
                                    </span>
                                    <h3 className="text-xl font-bold mt-1">{activeBlueprintModal.title}</h3>
                                </div>
                                <button
                                    onClick={() => setActiveBlueprintModal(null)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                                {activeBlueprintModal.description}
                            </p>

                            <div className="p-4 rounded-xl bg-black/30 border border-white/10 font-mono text-xs text-slate-200">
                                <span className="text-slate-400 font-bold block mb-1">RECOMMENDED ARCHITECTURE:</span>
                                {activeBlueprintModal.architecture}
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Production Features</h4>
                                <ul className="space-y-1.5 text-xs text-slate-300">
                                    {activeBlueprintModal.keyFeatures.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <CheckCircle2 size={13} className="text-teal-400 shrink-0 mt-0.5" />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">GitHub README Checklist</h4>
                                <ul className="space-y-1.5 text-xs text-slate-300">
                                    {activeBlueprintModal.githubChecklist.map((c, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Terminal size={13} className="text-blue-400 shrink-0 mt-0.5" />
                                            <span>{c}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={() => setActiveBlueprintModal(null)}
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all"
                                >
                                    Close Blueprint
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {!isCandidatePortal && <Footer theme={theme} />}
        </div>
    );
}
