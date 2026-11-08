const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = "gemini-flash-latest";

// Matching agentController.js config for consistency
const getJsonConfig = () => ({
  temperature: 0.1,
  responseMimeType: "application/json",
});

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalize(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase()
        .replace(/[-_./\\(),]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Canonical skill synonyms mapping
const SKILL_SYNONYMS = {
    'react': ['react', 'react js', 'reactjs', 'react.js'],
    'react native': ['react native', 'react-native'],
    'nextjs': ['next js', 'nextjs', 'next.js'],
    'vue': ['vue', 'vue js', 'vuejs', 'vue.js', 'vue 3', 'vue2', 'element plus'],
    'angular': ['angular', 'angularjs', 'angular.js', 'angular 2+'],
    'javascript': ['javascript', 'js', 'es6', 'es6+', 'vanilla js', 'javascript (es6+)'],
    'typescript': ['typescript', 'ts'],
    'nodejs': ['node js', 'nodejs', 'node.js', 'node'],
    'golang': ['golang', 'go', 'go (golang)', 'go lang'],
    'java': ['java', 'core java', 'java 8', 'java 8+', 'java 11', 'j2ee'],
    'c': ['c', 'c language', 'c programming'],
    'c++': ['c++', 'cpp', 'c/c++'],
    'c#': ['c#', 'c-sharp', 'c sharp', '.net'],
    'python': ['python', 'python 3', 'py'],
    'docker': ['docker', 'docker compose', 'containerization'],
    'kubernetes': ['kubernetes', 'k8s', 'helm', 'eks', 'gke', 'aks'],
    'ci cd': ['ci cd', 'ci/cd', 'continuous integration', 'cicd', 'jenkins', 'github actions', 'gitlab ci'],
    'html': ['html', 'html5', 'html/css', 'html 5'],
    'css': ['css', 'css3', 'tailwind', 'tailwind css', 'bootstrap', 'sass', 'scss', 'css 3'],
    'mongodb': ['mongodb', 'mongo', 'nosql'],
    'postgresql': ['postgresql', 'postgres', 'psql'],
    'sql': ['sql', 'mysql', 'postgresql', 'sqlite', 'oracle sql', 'sql server', 'mssql', 'dbms'],
    'aws': ['aws', 'amazon web services', 'ec2', 's3', 'lambda'],
    'azure': ['azure', 'azure devops'],
    'gcp': ['gcp', 'google cloud', 'google cloud platform'],
    'mlops': ['mlops', 'mlflow', 'kubeflow', 'dvc'],
    'machine learning': ['machine learning', 'ml', 'deep learning', 'scikit learn', 'tensorflow', 'pytorch', 'keras', 'nlp'],
    'data science': ['data science', 'pandas', 'numpy', 'scipy', 'data analysis', 'statistics'],
    'fastapi': ['fastapi', 'fast api'],
    'django': ['django', 'drf', 'django rest framework'],
    'flask': ['flask'],
    'spring boot': ['spring boot', 'spring', 'spring mvc', 'spring data jpa', 'hibernate'],
    'blockchain': ['blockchain', 'smart contract', 'smart contracts', 'solidity', 'web3', 'hyperledger', 'ethereum'],
    'devops': ['devops', 'sre', 'site reliability', 'infrastructure', 'platform engineer', 'terraform', 'ansible']
};

// Disallowed substring false positives
const DISALLOWED_SUBSTRING_COLLISIONS = [
    { a: 'java', b: 'javascript' },
    { a: 'c', b: 'css' },
    { a: 'c', b: 'c++' },
    { a: 'c', b: 'c#' },
    { a: 'r', b: 'react' },
    { a: 'r', b: 'rust' },
    { a: 'r', b: 'ruby' },
    { a: 'go', b: 'google' },
    { a: 'go', b: 'django' },
    { a: 'go', b: 'mongodb' },
    { a: 'ts', b: 'postman' },
    { a: 'ui', b: 'quick' }
];

function isCollision(cNorm, tNorm) {
    for (const { a, b } of DISALLOWED_SUBSTRING_COLLISIONS) {
        if ((cNorm === a && b.includes(tNorm)) || (tNorm === a && b.includes(cNorm))) return true;
        if ((cNorm === a && tNorm === b) || (tNorm === a && cNorm === b)) return true;
    }
    return false;
}

function skillsMatch(candidateSkill, targetSkill) {
    const cNorm = normalize(candidateSkill);
    const tNorm = normalize(targetSkill);
    if (!cNorm || !tNorm) return false;

    // Direct exact match
    if (cNorm === tNorm) return true;

    // Disallow false positive collisions
    if (isCollision(cNorm, tNorm)) return false;

    // Check synonym group
    for (const [, syns] of Object.entries(SKILL_SYNONYMS)) {
        const cMatches = syns.some(s => s === cNorm);
        const tMatches = syns.some(s => s === tNorm);
        if (cMatches && tMatches) return true;
    }

    // Short strings (<= 3 chars): strict exact word boundary match only
    if (tNorm.length <= 3 || cNorm.length <= 3) {
        if (cNorm === tNorm) return true;
        const regex = new RegExp(`(^|\\s)${escapeRegex(tNorm)}($|\\s)`, 'i');
        return regex.test(cNorm);
    }

    // Longer strings: word boundary or multi-word substring
    if (tNorm.length >= 4 && cNorm.length >= 4) {
        if (cNorm.includes(tNorm) || tNorm.includes(cNorm)) {
            if (isCollision(cNorm, tNorm)) return false;
            return true;
        }
    }

    return false;
}

const ROLE_TAXONOMY = {
    frontend: {
        canonical: 'Frontend Development',
        roles: ['frontend developer', 'front-end developer', 'frontend engineer', 'front-end engineer', 'ui developer', 'ui engineer', 'web developer', 'full stack developer', 'fullstack developer', 'react developer', 'angular developer', 'vue developer', 'javascript developer'],
        coreSkills: ['react', 'react.js', 'next.js', 'vue', 'vue.js', 'angular', 'angularjs', 'javascript', 'typescript', 'html', 'html5', 'css', 'css3', 'redux', 'tailwind', 'bootstrap'],
        conflictingDesignations: ['devops engineer', 'site reliability engineer', 'data scientist', 'mlops engineer', 'cloud platform engineer', 'sre', 'rust backend engineer']
    },
    backend: {
        canonical: 'Backend Development',
        roles: ['backend developer', 'back-end developer', 'backend engineer', 'server engineer', 'api developer', 'full stack developer', 'software engineer', 'sde', 'backend software engineer'],
        coreSkills: ['node.js', 'express', 'express.js', 'python', 'django', 'fastapi', 'flask', 'golang', 'java', 'spring boot', 'postgresql', 'mongodb', 'mysql', 'redis', 'rest apis', 'microservices'],
        conflictingDesignations: []
    },
    fullstack: {
        canonical: 'Full Stack Development',
        roles: ['full stack developer', 'fullstack developer', 'full stack engineer', 'software engineer', 'sde', 'web developer'],
        coreSkills: ['javascript', 'typescript', 'react', 'react.js', 'node.js', 'express', 'python', 'mongodb', 'sql', 'html', 'css', 'next.js'],
        conflictingDesignations: []
    },
    devops: {
        canonical: 'DevOps & Cloud Infrastructure',
        roles: ['devops engineer', 'site reliability engineer', 'sre', 'cloud engineer', 'infrastructure engineer', 'platform engineer', 'systems engineer'],
        coreSkills: ['docker', 'kubernetes', 'terraform', 'aws', 'azure', 'gcp', 'jenkins', 'ci/cd', 'ansible', 'helm', 'prometheus', 'grafana', 'linux', 'bash'],
        conflictingDesignations: ['frontend developer', 'ui developer', 'data scientist']
    },
    mlops: {
        canonical: 'MLOps',
        roles: ['mlops engineer', 'machine learning operations', 'ai platform engineer', 'data platform engineer'],
        coreSkills: ['mlflow', 'kubeflow', 'dvc', 'airflow', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'python'],
        conflictingDesignations: ['frontend developer', 'ui developer']
    },
    datascience: {
        canonical: 'Data Science & AI/ML',
        roles: ['data scientist', 'machine learning engineer', 'ai engineer', 'ai/ml engineer', 'nlp engineer', 'data analyst'],
        coreSkills: ['python', 'machine learning', 'data science', 'sql', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras', 'langchain'],
        conflictingDesignations: ['devops engineer', 'frontend developer']
    },
    golang: {
        canonical: 'Golang Development',
        roles: ['golang developer', 'go developer', 'golang engineer', 'backend developer', 'software engineer', 'software backend developer'],
        coreSkills: ['golang', 'go', 'gin', 'gorilla mux', 'echo', 'fiber', 'gorm', 'concurrency', 'goroutines', 'microservices'],
        conflictingDesignations: []
    },
    blockchain: {
        canonical: 'Blockchain & Web3',
        roles: ['blockchain developer', 'smart contract developer', 'web3 developer', 'solidity developer', 'blockchain engineer'],
        coreSkills: ['solidity', 'blockchain', 'web3', 'hyperledger', 'smart contracts', 'hardhat', 'foundry', 'rust'],
        conflictingDesignations: []
    }
};

const cleanJson = (str) => {
    let cleaned = str.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
    }
    return cleaned;
};

async function parseSearchIntent(query) {
    const prompt = `
You are an expert technical recruiting AI. Analyze this candidate search query and extract structured criteria.

QUERY: "${query}"

Respond with ONLY a JSON object matching this schema:
{
  "roleCategories": ["frontend" | "backend" | "fullstack" | "devops" | "mlops" | "datascience" | "golang" | "blockchain"],
  "targetRoles": ["exact role titles matching the query, e.g. Frontend Developer, React Developer, Web Developer"],
  "primarySkills": ["core required technical skills, e.g. React, JavaScript, TypeScript, HTML, CSS, Next.js"],
  "secondarySkills": ["complementary skills"],
  "minExperienceYears": 0,
  "domainKeywords": ["domain keywords if specified like fintech, ecommerce"],
  "reasoning": "A concise 1-sentence explanation of what kind of talent the recruiter wants"
}
`;

    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: getJsonConfig()
        });
        const text = cleanJson(result.response.text());
        return JSON.parse(text);
    } catch (e) {
        console.error("[AI-SEARCH] Gemini Intent Parse Fallback:", e.message);
        const lower = query.toLowerCase();
        let cats = [];
        for (const [cat, data] of Object.entries(ROLE_TAXONOMY)) {
            if (data.roles.some(r => lower.includes(r)) || data.coreSkills.some(s => lower.includes(s))) {
                cats.push(cat);
            }
        }
        return {
            roleCategories: cats.length ? cats : ['backend'],
            targetRoles: [query],
            primarySkills: query.split(/\s+/).filter(w => w.length > 2),
            secondarySkills: [],
            minExperienceYears: 0,
            domainKeywords: [],
            reasoning: `Searching candidates matching "${query}".`
        };
    }
}

function evaluateCandidate(candidate, intent) {
    let score = 0;
    const matchedPrimarySkills = new Set();
    const matchedOtherSkills = new Set();
    const matchBadges = [];

    const candidateSkills = (candidate.skills || []);
    const candidateDesignationNorm = normalize(candidate.designation);
    const candidateBioNorm = normalize(candidate.bio);
    const candidateRoles = (candidate.experience || []).map(e => normalize(e.role || e.position)).filter(Boolean);
    const candidateCompanies = (candidate.experience || []).map(e => normalize(e.company)).filter(Boolean);

    // 1. Primary Skills Match
    const primarySkills = intent.primarySkills || [];
    for (const pSkill of primarySkills) {
        const matched = candidateSkills.find(cs => skillsMatch(cs, pSkill));
        if (matched) {
            matchedPrimarySkills.add(matched);
            score += 45; // 45 points per matched primary skill
        }
    }

    // 2. Secondary Skills Match
    const secondarySkills = intent.secondarySkills || [];
    for (const sSkill of secondarySkills) {
        const matched = candidateSkills.find(cs => skillsMatch(cs, sSkill));
        if (matched && !matchedPrimarySkills.has(matched)) {
            matchedOtherSkills.add(matched);
            score += 15;
        }
    }

    // 3. Taxonomy Core Skills Match
    if (intent.roleCategories && intent.roleCategories.length > 0) {
        for (const cat of intent.roleCategories) {
            const tax = ROLE_TAXONOMY[cat];
            if (tax && tax.coreSkills) {
                for (const tSkill of tax.coreSkills) {
                    const matched = candidateSkills.find(cs => skillsMatch(cs, tSkill));
                    if (matched && !matchedPrimarySkills.has(matched) && !matchedOtherSkills.has(matched)) {
                        matchedOtherSkills.add(matched);
                        score += 10;
                    }
                }
            }
        }
    }

    // 4. Role & Designation Match
    let roleMatched = false;
    let designationMatched = false;
    const targetRoles = (intent.targetRoles || []).map(r => normalize(r));
    
    // Add taxonomy roles
    if (intent.roleCategories) {
        for (const cat of intent.roleCategories) {
            const tax = ROLE_TAXONOMY[cat];
            if (tax && tax.roles) {
                targetRoles.push(...tax.roles.map(r => normalize(r)));
            }
        }
    }

    for (const tRole of targetRoles) {
        if (candidateDesignationNorm && (candidateDesignationNorm.includes(tRole) || tRole.includes(candidateDesignationNorm))) {
            score += 70; // Big boost for exact designation match
            designationMatched = true;
            roleMatched = true;
            matchBadges.push(`Role: ${candidate.designation}`);
            break;
        }
    }

    if (!designationMatched) {
        for (const tRole of targetRoles) {
            const pastRoleMatch = candidateRoles.find(cr => cr && (cr.includes(tRole) || tRole.includes(cr)));
            if (pastRoleMatch) {
                score += 45;
                roleMatched = true;
                matchBadges.push(`Past Role: ${pastRoleMatch}`);
                break;
            }
        }
    }

    // 5. Conflicting Designation Penalty
    if (intent.roleCategories) {
        for (const cat of intent.roleCategories) {
            const tax = ROLE_TAXONOMY[cat];
            if (tax && tax.conflictingDesignations) {
                const isConflicting = tax.conflictingDesignations.some(cd => candidateDesignationNorm.includes(normalize(cd)));
                if (isConflicting) {
                    if (matchedPrimarySkills.size === 0) {
                        return { score: 0, isQualified: false, matchedSkills: [], matchBadges: [] };
                    }
                    score -= 120;
                }
            }
        }
    }

    // 6. Domain / Industry Keywords Match
    if (intent.domainKeywords && intent.domainKeywords.length > 0) {
        for (const d of intent.domainKeywords) {
            const dNorm = normalize(d);
            const inCompany = candidateCompanies.some(c => c.includes(dNorm));
            const inBio = candidateBioNorm.includes(dNorm);
            const inDesig = candidateDesignationNorm.includes(dNorm);
            if (inCompany || inBio || inDesig) {
                score += 30;
                matchBadges.push(`Domain: ${d}`);
            }
        }
    }

    // 7. Experience Match
    if (intent.minExperienceYears > 0) {
        const expYears = candidate.experienceYears || candidate.experience?.length || 0;
        if (expYears >= intent.minExperienceYears) {
            score += 25;
            matchBadges.push(`${expYears}+ yrs exp`);
        }
    }

    // 8. Quality Gate:
    // Candidate MUST have at least 1 verified primary skill match OR a direct designation/role match!
    const allMatchedSkills = [...Array.from(matchedPrimarySkills), ...Array.from(matchedOtherSkills)];
    const isQualified = (matchedPrimarySkills.size >= 1 || (designationMatched && allMatchedSkills.length >= 1) || roleMatched) && score >= 40;

    if (!isQualified) {
        return { score: 0, isQualified: false, matchedSkills: [], matchBadges: [] };
    }

    if (allMatchedSkills.length > 0) {
        matchBadges.unshift(`Skills: ${allMatchedSkills.slice(0, 4).join(', ')}`);
    }

    return {
        score: Math.max(score, 0),
        isQualified: true,
        matchedSkills: allMatchedSkills,
        matchBadges
    };
}

const searchCandidates = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({ error: "Query is required" });
        }

        console.log(`[AI-SEARCH] Incoming Query: "${query}"`);

        // 1. AI Intent Analysis
        const intent = await parseSearchIntent(query.trim());
        console.log("[AI-SEARCH] Parsed Intent:", JSON.stringify(intent));

        // 2. Aggregate candidates joining User and ResumeProfile
        const allCandidates = await User.aggregate([
            { $match: { role: "candidate" } },
            {
                $lookup: {
                    from: "resumeprofiles",
                    localField: "uid",
                    foreignField: "userId",
                    as: "resumeDoc"
                }
            },
            {
                $unwind: {
                    path: "$resumeDoc",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    uid: "$uid",
                    name: { $ifNull: [ "$name", "$resumeDoc.basics.name" ] },
                    email: { $ifNull: [ "$email", "$resumeDoc.basics.email" ] },
                    profilePic: "$profilePic",
                    githubUrl: "$githubUrl",
                    linkedinUrl: "$linkedinUrl",
                    role: "$role",
                    skills: {
                        $setUnion: [
                            { $ifNull: [ "$skills", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.programming", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.frameworks", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.databases", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.tools", [] ] },
                            { $ifNull: [ "$resumeDoc.skills.soft", [] ] }
                        ]
                    },
                    bio: { $ifNull: [ "$bio", "$resumeDoc.summary", "" ] },
                    experienceYears: { $ifNull: [ "$resumeDoc.experienceYears", { $size: { $ifNull: [ "$experience", [] ] } } ] },
                    designation: {
                        $cond: {
                            if: {
                                $and: [
                                    { $eq: [ { $type: "$designation" }, "string" ] },
                                    { $ne: [ "$designation", "" ] }
                                ]
                            },
                            then: "$designation",
                            else: {
                                $ifNull: [
                                    {
                                        $let: {
                                            vars: {
                                                firstExp: { $arrayElemAt: [ { $ifNull: [ "$resumeDoc.workExperience", [] ] }, 0 ] }
                                            },
                                            in: "$$firstExp.position"
                                        }
                                    },
                                    "$resumeDoc.basics.location",
                                    ""
                                ]
                            }
                        }
                    },
                    experience: {
                        $cond: {
                            if: { $gt: [ { $size: { $ifNull: [ "$experience", [] ] } }, 0 ] },
                            then: "$experience",
                            else: {
                                $map: {
                                    input: { $ifNull: [ "$resumeDoc.workExperience", [] ] },
                                    as: "exp",
                                    in: {
                                        company: "$$exp.company",
                                        role: "$$exp.position",
                                        duration: { $concat: [ "$$exp.startYear", " - ", { $ifNull: [ "$$exp.endYear", "Present" ] } ] },
                                        description: "$$exp.description"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]);

        // 3. Multi-Factor Scoring & Precision Matching
        const scoredCandidates = [];
        for (const candidate of allCandidates) {
            const evaluation = evaluateCandidate(candidate, intent);
            if (evaluation.isQualified && evaluation.score > 0) {
                scoredCandidates.push({
                    ...candidate,
                    matchScore: evaluation.score,
                    matchedSkills: evaluation.matchedSkills,
                    matchBadges: evaluation.matchBadges
                });
            }
        }

        // 4. Sort by Match Score Descending & Limit to Top Results
        scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
        const topCandidates = scoredCandidates.slice(0, 24);

        console.log(`[AI-SEARCH] Matched ${topCandidates.length} qualified candidate(s) for "${query}"`);

        res.json({
            candidates: topCandidates,
            analysis: {
                reasoning: intent.reasoning,
                filter: intent,
                roleCategories: intent.roleCategories,
                primarySkills: intent.primarySkills,
                targetRoles: intent.targetRoles,
                totalMatches: scoredCandidates.length
            }
        });

    } catch (err) {
        console.error("[AI-SEARCH] Fatal Error:", err);
        res.status(500).json({ error: "Search failed", detail: err.message });
    }
};

module.exports = { searchCandidates };
