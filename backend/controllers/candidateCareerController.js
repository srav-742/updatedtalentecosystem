const { callGemini, callSkillAI } = require('../utils/aiClients');

// ─── Curated Candidate Career Knowledge Base Across 5 Core Pillars ────────────
const CAREER_PILLARS = [
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
                    staff: 'Designs globally distributed distributed data layers, solves CAP theorem trade-offs, guarantees 99.99% uptime, leads platform engineering.'
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
                description: 'If your project only runs on `localhost:3000`, recruiters consider it a school assignment. Being able to package and ship a service to the cloud is a mandatory production skill.'
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
                    'Docker-compose file to launch PostgreSQL, Redis, and app in one single command (`docker compose up`).',
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
                    'Dry-run instructions (`terraform plan`) with complete variable validation.',
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
                    '4. Data Modeling & API Design (10m): Relational schema, indexes, endpoints (`POST /api/v1/posts`, `GET /api/v1/feed`).',
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
                a: 'Use the Hire1Percent Mock Interview module at `/candidate/mock-interview`. You can select your target role and seniority, undergo a simulated technical interview with our AI agent, and receive an instant breakdown of your performance, vocabulary depth, and areas for improvement.'
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
                    'Upload your latest resume on `/candidate/profile` and verify that the AI parser extracts your core skill tags accurately.',
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
                    'Launch an AI Mock Interview on `/candidate/mock-interview` for your target role.',
                    'Prepare 4 core STAR behavioral stories: A time you solved a critical bug, a time you dealt with ambiguity, a disagreement with a peer, and a system you scaled.',
                    'Practice whiteboarding a system architecture diagram in under 15 minutes.'
                ]
            },
            {
                week: 'Week 4: Targeted Application & Portfolio Polish',
                actions: [
                    'Ensure your top two GitHub projects have live working demo links in their READMEs.',
                    'Browse active jobs on `/candidate/jobs` and apply to positions where your match score exceeds 75%.',
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

// ─── Curated Quick Search Questions Index ────────────────────────────────────
const QUICK_QUESTIONS = [
    {
        id: 'q1',
        category: 'roles',
        question: 'What is the difference between a Full Stack Engineer and a Backend Engineer?',
        answer: 'A Full Stack Engineer works across the entire product lifecycle—from responsive UI and client state management to server endpoints and databases. A Backend Engineer focuses deeply on distributed systems, concurrency, database performance, caching, microservices, and high-throughput data pipelines.',
        tags: ['Full Stack', 'Backend', 'Architecture']
    },
    {
        id: 'q2',
        category: 'skills',
        question: 'What skills are required to become an AI/ML Engineer in 2026?',
        answer: 'Modern AI/ML engineering requires strong Python programming, proficiency in building RAG (Retrieval-Augmented Generation) pipelines, vector database querying (pgvector, Pinecone, Qdrant), API integration (OpenAI, Gemini), model fine-tuning techniques (LoRA/QLoRA), and agentic tool-use frameworks like LangChain or LlamaIndex.',
        tags: ['AI/ML', 'Python', 'RAG', 'LLMs']
    },
    {
        id: 'q3',
        category: 'projects',
        question: 'What makes a portfolio project stand out to top 1% recruiters?',
        answer: 'Top recruiters look for: 1) Real architectural complexity (background worker queues, caching with Redis, optimistic UI updates), 2) Production authentication with JWTs and RBAC, 3) Automated testing with CI/CD badges, and 4) A live deployed URL with pre-filled test credentials and a clean architectural diagram in the README.',
        tags: ['Portfolio', 'Projects', 'GitHub', 'Recruiters']
    },
    {
        id: 'q4',
        category: 'interviews',
        question: 'How should I structure my answers in an automated AI video interview?',
        answer: 'Use the STAR method: Situation (set the business context), Task (the problem you were assigned), Action (the specific engineering choices YOU made), and Result (the quantifiable impact, e.g. reduced latency by 40%). Speak clearly at 130 WPM, articulate trade-offs, and use precise technical terminology.',
        tags: ['Interview Prep', 'STAR Method', 'AI Interview']
    },
    {
        id: 'q5',
        category: 'readiness',
        question: 'How is the Candidate Job Readiness Score calculated on Hire1Percent?',
        answer: 'The score is out of 100 points across 5 pillars: Technical Skills (20 pts), Coding Assessments (25 pts), Production Projects (15 pts), Resume Completeness (20 pts), and Interview Screening Performance (20 pts). Scoring 75+ places you in the recommended candidate tier for top hiring partners.',
        tags: ['Job Readiness', 'Scoring', 'Profile']
    },
    {
        id: 'q6',
        category: 'skills',
        question: 'Is it better to learn Go or Node.js for modern backend development?',
        answer: 'Both are industry standards. Node.js with TypeScript is ideal for rapid development, rich npm ecosystem, and full stack synergy. Go is unmatched for high-concurrency microservices, network tools, low memory footprint, and cloud-native infrastructure. If you want maximum job openings, TypeScript/Node.js leads; for high-scale distributed systems, Go is in massive demand.',
        tags: ['Go', 'Node.js', 'Backend', 'Languages']
    },
    {
        id: 'q7',
        category: 'interviews',
        question: 'What triggers an anti-cheat warning during proctored coding assessments?',
        answer: 'Warnings are triggered by frequent tab switches, losing browser window focus, copying and pasting large foreign blocks of code, or multiple faces appearing in the webcam feed. To prevent false flags, take assessments in a quiet private room, close background applications, and code directly inside the provided IDE runner.',
        tags: ['Proctoring', 'Anti-Cheat', 'Assessments']
    },
    {
        id: 'q8',
        category: 'projects',
        question: 'Can I use free tiers (Render, Vercel, Supabase) to host my portfolio projects?',
        answer: 'Yes! Vercel, Render, Railway, Fly.io, and Supabase are industry-accepted. To prevent the cold-start delay common on free tiers, ensure you warm up your server or note in the README that the first request might take 15 seconds to boot.',
        tags: ['Hosting', 'Deployment', 'Free Tier', 'Projects']
    }
];

// ─── CONTROLLER HANDLERS ──────────────────────────────────────────────────────

/**
 * Returns curated career topics, pillars, roles, blueprints, and FAQ guides.
 */
exports.getCareerTopics = (req, res) => {
    try {
        return res.json({
            success: true,
            pillars: CAREER_PILLARS,
            quickQuestions: QUICK_QUESTIONS,
            totalPillars: CAREER_PILLARS.length,
            totalQuestions: QUICK_QUESTIONS.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CANDIDATE-CAREER] Error fetching topics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve career topics.',
            error: error.message
        });
    }
};

/**
 * Returns curated project blueprints for portfolio building.
 */
exports.getProjectBlueprints = (req, res) => {
    try {
        const projectPillar = CAREER_PILLARS.find(p => p.id === 'projects');
        return res.json({
            success: true,
            blueprints: projectPillar?.blueprints || [],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CANDIDATE-CAREER] Error fetching blueprints:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve project blueprints.',
            error: error.message
        });
    }
};

/**
 * Interactive Candidate Career Copilot / AI Advisor endpoint.
 * Answers custom candidate questions regarding tech roles, skills, projects, and interview prep.
 */
exports.askCareerAdvisor = async (req, res) => {
    try {
        const { question, category, roleContext, seniorityLevel, conversationHistory } = req.body;

        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid question.'
            });
        }

        const trimmedQuestion = question.trim().slice(0, 1000);

        const systemPrompt = `
You are the Chief Engineering Career Mentor and Principal Technical Talent Advisor at Hire1Percent.
Your mission is to provide world-class, authoritative, empowering, and immediately actionable career advice to ambitious tech candidates striving to join the top 1% of software engineers.

Your expertise spans the 5 pillars of candidate success:
1. ROLES & CAREER PATHWAYS: Full Stack, Backend, Frontend, AI/ML, DevOps, Data, and Mobile. Guiding candidates on level expectations (Junior to Staff), day-to-day responsibilities, and smooth track transitions.
2. REQUIRED SKILLS & BENCHMARKS: Core CS fundamentals (DSA, systems, networking), modern production stacks (TypeScript, Go, Python, React, Next.js, Node.js), data persistence (PostgreSQL, Redis, indexing), and Silicon Valley communication standards.
3. PRODUCTION PORTFOLIO PROJECTS: Designing standout portfolio projects that prove real-world engineering (real-time WebSockets, background queues, auth, CI/CD, Docker) over generic tutorial clones.
4. INTERVIEW PREPARATION: Conquering proctored coding assessments, algorithmic problem-solving patterns, system design frameworks (HLD/LLD), automated AI video interviews, and the STAR method.
5. JOB READINESS & BENCHMARKING: Helping candidates optimize their resumes, achieve an 85%+ Job Readiness Score on Hire1Percent, navigate proctoring telemetry safely, and land top offers.

CRITICAL FORMATTING & STYLE RULES:
- DO NOT start with cheesy boilerplate like "Hello candidate!", "As your AI mentor...", or "I would be happy to help you with that!". Jump DIRECTLY into the structured answer.
- Format with clean "### " headers, numbered action items (1., 2., 3.), bold technology names, and bullet points.
- Never output raw formatting garbage or multiple deep hash symbols like "####".
- If a target role or seniority is specified, calibrate your technical recommendations (tools, system trade-offs, project complexity) to that exact level.
- Provide concrete, copy-pasteable examples where applicable (e.g. sample architecture flow, resume bullet formula, or code pattern).
- At the end, include a brief "Next Action Step on Hire1Percent" (e.g. advising them to test their skills on the Mock Interview tool, update their portfolio on their profile, or check matching roles).
`;

        let userPrompt = `Candidate Question: "${trimmedQuestion}"`;
        if (category && category !== 'all') {
            userPrompt += `\nTopic Focus: ${category}`;
        }
        if (roleContext) {
            userPrompt += `\nTarget Role: ${roleContext}`;
        }
        if (seniorityLevel) {
            userPrompt += `\nTarget Seniority: ${seniorityLevel}`;
        }

        // Include conversation history if provided
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-4).map(turn =>
                `${turn.role === 'user' ? 'Candidate' : 'Mentor'}: ${turn.content}`
            ).join('\n');
            userPrompt = `Prior Discussion Context:\n${recentHistory}\n\n${userPrompt}`;
        }

        // Execute primary AI call with Gemini 2.5 Flash, with Groq fallback
        let responseText = await callGemini(userPrompt, 1800, false, systemPrompt, 0.7);

        // Fallback to Groq if Gemini is unavailable
        if (!responseText) {
            console.log('[CANDIDATE-CAREER] Gemini unavailable, falling back to callSkillAI...');
            responseText = await callSkillAI(
                `${systemPrompt}\n\n${userPrompt}`,
                1800,
                0.7
            );
        }

        // Graceful default fallback if all AI APIs are unreachable
        if (!responseText) {
            responseText = `### Strategic Action Plan for: "${trimmedQuestion}"\n\n` +
                `1. **Focus on Production Evidence**: Replace generic tutorial clones with projects featuring real authentication, relational databases with indexing, and live automated deployments.\n` +
                `2. **Master the High-Frequency Patterns**: Focus on Two Pointers, Sliding Window, and Graph BFS/DFS for coding assessments. Understand time and space complexity thoroughly.\n` +
                `3. **Optimize Your Presentation**: Use the XYZ formula on your resume: "Accomplished [X], as measured by [Y], by doing [Z]".\n` +
                `4. **Practice Mock Interviews**: Build confidence with the Hire1Percent AI Mock Interview to sharpen your STAR method answers.\n\n` +
                `*Next Action Step on Hire1Percent*: Visit the Mock Interview tab to test your responses in a real-time simulated technical screen.`;
        }

        return res.json({
            success: true,
            answer: responseText,
            category,
            roleContext,
            seniorityLevel,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[CANDIDATE-CAREER] Error processing advisor question:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate answer. Please try again.',
            error: error.message
        });
    }
};
