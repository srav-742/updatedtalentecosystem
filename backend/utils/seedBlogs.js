const BlogPost = require('../blog/models/BlogPost');
const BlogCategory = require('../blog/models/BlogCategory');
const User = require('../models/User');

const seedBlogs = async () => {
    try {
        // 1. Ensure default admin user for authorId reference
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.findOne({ email: 'sravyaadmin@gmail.com' });
        }
        if (!adminUser) {
            console.warn('[SEED-BLOGS] No admin user found yet. Skipping blog auto-seed until admin is created.');
            return;
        }

        // 2. Default Categories
        const categoriesData = [
            { name: 'Interview Prep', slug: 'technical-assessments', description: 'Technical assessment strategies, coding interviews, and system design guides.' },
            { name: 'Tech Recruiting', slug: 'ai-hiring', description: 'AI-driven recruiting, proctoring technology, and talent evaluation.' },
            { name: 'Engineering', slug: 'engineering-hiring', description: 'Engineering team scaling, code reliability, and backend architecture.' },
            { name: 'Product Updates', slug: 'product-updates', description: 'Latest Hire1percent features, AI interview agent upgrades, and platform releases.' }
        ];

        const categoryDocs = {};
        for (const cat of categoriesData) {
            let categoryDoc = await BlogCategory.findOne({ slug: cat.slug });
            if (!categoryDoc) {
                categoryDoc = await BlogCategory.create(cat);
                console.log(`[SEED-BLOGS] Created Blog Category: ${cat.name} (${cat.slug})`);
            }
            categoryDocs[cat.slug] = categoryDoc._id;
        }

        // 3. Seed Posts if no posts exist
        const postCount = await BlogPost.countDocuments();
        if (postCount === 0) {
            const initialPosts = [
                {
                    title: 'Top React & Node.js Technical Assessment Questions for 2026',
                    slug: 'top-react-node-interview-questions-2026',
                    subtitle: 'A comprehensive breakdown of state management, async patterns, and full-stack architecture queries.',
                    content: `## Essential Full-Stack Questions for Engineering Leads\n\nEvaluating technical talent requires more than simple syntax checks. Here are key areas to evaluate modern full-stack engineers:\n\n### 1. Concurrency and Async Event Loops\nHow does Node.js handle heavy I/O operations without blocking execution? Discuss worker threads vs event loop delegation.\n\n### 2. State Management at Scale\nWhen should you prefer server-side caching and state normalization over client Redux context management?\n\n### 3. Automated Code Quality Guards\nImplementing pre-commit linting, unit integration tests, and static type safety in CI/CD pipelines.`,
                    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
                    authorId: adminUser._id,
                    category: categoryDocs['technical-assessments'],
                    tags: ['React', 'Node.js', 'Interview Prep', 'Full-Stack'],
                    status: 'published',
                    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    seo: {
                        metaTitle: 'Top React & Node.js Technical Assessment Questions 2026',
                        metaDescription: 'Comprehensive guide to technical interview questions for React and Node.js developers.',
                        keywords: ['React', 'Node.js', 'Technical Interview', 'Hiring']
                    }
                },
                {
                    title: 'How AI Interview Agents Are Reshaping Technical Recruitment',
                    slug: 'how-ai-interview-agents-reshape-recruitment',
                    subtitle: 'Discover how automated technical assessments cut time-to-hire by 70% while improving candidate quality.',
                    content: `## The Evolution of Candidate Screening\n\nTraditional resume screening often misses top talent while overwhelming hiring teams with unqualified applicants.\n\n### Instant Proctoring & Fair Evaluation\nAI-powered voice and coding agents provide continuous, unbiased assessment with real-time feedback loops.\n\n### Scalable Technical Pipelines\nBy benchmarking candidates against standardized code challenges, engineering managers save hundreds of hours every quarter.`,
                    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
                    authorId: adminUser._id,
                    category: categoryDocs['ai-hiring'],
                    tags: ['AI Recruiting', 'Assessment', 'Talent Ecosystem', 'Tech Hiring'],
                    status: 'published',
                    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                    seo: {
                        metaTitle: 'How AI Interview Agents Reshape Technical Recruitment',
                        metaDescription: 'Learn how automated AI agents revolutionize technical screening and hiring speed.',
                        keywords: ['AI Recruiting', 'Talent Ecosystem', 'Proctoring']
                    }
                },
                {
                    title: 'Building High-Throughput Microservices: Lessons from Production',
                    slug: 'building-high-throughput-microservices',
                    subtitle: 'Architecting zero-downtime, sub-100ms latency backend services for enterprise talent ecosystems.',
                    content: `## High Availability Architecture Patterns\n\nDesigning robust API gateways and backend microservices requires strict fault isolation and rate limiting.\n\n### Key Principles\n1. Stateless API Routing\n2. Resilience with Circuit Breakers\n3. Optimized Database Indexing & Connection Pooling`,
                    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
                    authorId: adminUser._id,
                    category: categoryDocs['engineering-hiring'],
                    tags: ['Microservices', 'Architecture', 'Performance', 'Backend'],
                    status: 'published',
                    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
                    seo: {
                        metaTitle: 'Building High-Throughput Microservices in Production',
                        metaDescription: 'Best practices for scalable microservice design, low latency, and zero downtime.',
                        keywords: ['Microservices', 'System Design', 'Backend']
                    }
                },
                {
                    title: 'Introducing Automated AI Assessment Pipelines in Hire1Percent',
                    slug: 'introducing-automated-ai-assessment-pipelines',
                    subtitle: 'Streamlined proctoring, instant code scoring, and deep candidate analytics in version 2.0.',
                    content: `## What is New in Hire1Percent 2.0?\n\nWe are excited to launch our automated assessment pipeline engine!\n\n- Standardized Scoring Matrix\n- Real-time Anti-cheating & Proctoring Analysis\n- One-click Candidate Export to HR Systems`,
                    coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
                    authorId: adminUser._id,
                    category: categoryDocs['product-updates'],
                    tags: ['Product Update', 'Hire1Percent', 'Proctoring', 'AI'],
                    status: 'published',
                    publishedAt: new Date(),
                    seo: {
                        metaTitle: 'Hire1Percent 2.0 - Automated AI Assessment Pipelines',
                        metaDescription: 'Explore the new AI assessment pipelines and candidate evaluation features in Hire1Percent.',
                        keywords: ['Hire1Percent', 'Release', 'Product Update']
                    }
                }
            ];

            await BlogPost.insertMany(initialPosts);
            console.log(`[SEED-BLOGS] Seeded ${initialPosts.length} initial published blog posts.`);
        }
    } catch (err) {
        console.error('[SEED-BLOGS] Error auto-seeding blogs:', err.message);
    }
};

module.exports = seedBlogs;
