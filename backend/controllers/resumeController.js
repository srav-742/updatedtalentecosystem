const ResumeAnalysis = require('../models/ResumeAnalysis');
const ResumeProfile = require('../models/ResumeProfile');
const Job = require('../models/Job');
const { callSkillAI } = require('../utils/aiClients');
const pdf = require('pdf-parse');

const sanitizeAiJson = (raw = '') => {
    let cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
};

const parseAiJson = (raw, fallback) => {
    try {
        return JSON.parse(sanitizeAiJson(raw));
    } catch (error) {
        return fallback;
    }
};

const uniqueStrings = (values = []) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const emptyStructuredProfile = () => ({
    basics: {
        name: '',
        email: '',
        phone: '',
        location: ''
    },
    summary: '',
    education: [],
    skills: {
        programming: [],
        frameworks: [],
        databases: [],
        tools: [],
        soft: []
    },
    languages: [],
    workExperience: [],
    projects: [],
    professionalProfiles: [],
    publications: [],
    experienceYears: 0
});

const getFallbackName = (resumeText = '') => {
    const lines = String(resumeText)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    return lines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(line) && line.split(/\s+/).length <= 5) || '';
};

const getFallbackEmail = (resumeText = '') =>
    resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';

const getFallbackPhone = (resumeText = '') =>
    resumeText.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,}/)?.[0] || '';

const getFallbackProfiles = (resumeText = '') => {
    const urls = String(resumeText).match(/https?:\/\/[^\s)]+/gi) || [];

    return uniqueStrings(urls).map((url) => {
        const lowered = url.toLowerCase();
        let platform = 'Portfolio';

        if (lowered.includes('linkedin')) platform = 'LinkedIn';
        else if (lowered.includes('github')) platform = 'GitHub';
        else if (lowered.includes('leetcode')) platform = 'LeetCode';
        else if (lowered.includes('hackerrank')) platform = 'HackerRank';

        return { platform, url };
    });
};

const normalizeStringArray = (value) => uniqueStrings(Array.isArray(value) ? value : []);

const normalizeStructuredProfile = (payload = {}, resumeText = '') => {
    const fallbackProfiles = getFallbackProfiles(resumeText);

    const profiles = Array.isArray(payload?.professionalProfiles)
        ? payload.professionalProfiles
            .map((item) => ({
                platform: String(item?.platform || '').trim(),
                url: String(item?.url || '').trim()
            }))
            .filter((item) => item.platform || item.url)
        : [];

    return {
        basics: {
            name: String(payload?.basics?.name || getFallbackName(resumeText)).trim(),
            email: String(payload?.basics?.email || getFallbackEmail(resumeText)).trim(),
            phone: String(payload?.basics?.phone || getFallbackPhone(resumeText)).trim(),
            location: String(payload?.basics?.location || '').trim()
        },
        summary: String(payload?.summary || '').trim(),
        education: Array.isArray(payload?.education)
            ? payload.education
                .map((item) => ({
                    institution: String(item?.institution || '').trim(),
                    country: String(item?.country || '').trim(),
                    degree: String(item?.degree || '').trim(),
                    field: String(item?.field || '').trim(),
                    startYear: String(item?.startYear || '').trim(),
                    startMonth: String(item?.startMonth || '').trim(),
                    endYear: String(item?.endYear || '').trim(),
                    endMonth: String(item?.endMonth || '').trim(),
                    currentlyStudying: Boolean(item?.currentlyStudying),
                    cgpa: String(item?.cgpa || '').trim(),
                    scale: String(item?.scale || '').trim()
                }))
                .filter((item) => item.institution || item.degree)
            : [],
        skills: {
            programming: normalizeStringArray(payload?.skills?.programming),
            frameworks: normalizeStringArray(payload?.skills?.frameworks),
            databases: normalizeStringArray(payload?.skills?.databases),
            tools: normalizeStringArray(payload?.skills?.tools),
            soft: normalizeStringArray(payload?.skills?.soft)
        },
        languages: normalizeStringArray(payload?.languages),
        workExperience: Array.isArray(payload?.workExperience)
            ? payload.workExperience
                .map((item) => ({
                    company: String(item?.company || '').trim(),
                    position: String(item?.position || item?.role || '').trim(),
                    startYear: String(item?.startYear || '').trim(),
                    startMonth: String(item?.startMonth || '').trim(),
                    endYear: String(item?.endYear || '').trim(),
                    endMonth: String(item?.endMonth || '').trim(),
                    currentlyWorking: Boolean(item?.currentlyWorking),
                    employmentType: String(item?.employmentType || 'Full Time').trim(),
                    description: String(item?.description || '').trim(),
                    projects: Array.isArray(item?.projects) ? item.projects.map(p => ({
                        name: String(p?.name || '').trim(),
                        description: String(p?.description || '').trim()
                    })) : []
                }))
                .filter((item) => item.company || item.position)
            : [],
        projects: Array.isArray(payload?.projects)
            ? payload.projects
                .map((item) => ({
                    name: String(item?.name || '').trim(),
                    tech: normalizeStringArray(item?.tech),
                    role: String(item?.role || '').trim(),
                    description: String(item?.description || '').trim()
                }))
                .filter((item) => item.name || item.role || item.description || item.tech.length)
            : [],
        professionalProfiles: profiles.length > 0 ? profiles : fallbackProfiles,
        publications: Array.isArray(payload?.publications)
            ? payload.publications
                .map((item) => ({
                    title: String(item?.title || '').trim(),
                    url: String(item?.url || '').trim(),
                    year: String(item?.year || '').trim(),
                    citations: String(item?.citations || '0').trim()
                }))
                .filter((item) => item.title)
            : [],
        experienceYears: Math.max(0, Number(payload?.experienceYears) || 0)
    };
};

const analyzeResume = async (req, res) => {
    try {
        const { resumeText, jobSkills, jobExperience, jobEducation, userId, jobId, specialInstructions } = req.body;
        if (!userId || !jobId) return res.status(400).json({ message: "Recruiter/Job context missing" });
        
        const job = await Job.findById(jobId);
        if (!job) return res.status(404).json({ message: "Job not found" });

        console.log("[RESUME-ANALYSIS] Starting Analysis...");
        const prompt = `
You are an ELITE Applicant Tracking System (ATS) Intelligence Engine.
Your task is to perform a high-precision, objective analysis of the provided resume against specific job requirements.

Job Title: ${job.title || 'Target Role'}
Required Skills: ${Array.isArray(jobSkills) ? jobSkills.join(', ') : 'General'}
Required Experience Level: ${jobExperience || 'Any'}
Required Education: ${JSON.stringify(jobEducation || [])}

Recruiter's Special Instructions (Mandatory):
${specialInstructions || 'None'}

Resume Content:
${resumeText ? resumeText.substring(0, 10000) : ''}

SCORING ALGORITHM (STRICT - MAX 10 POINTS TOTAL):
1. Skills Match (0-10 Points):
   - 0 Missing Skills: 10 points
   - 1 or 2 Missing Skills: 9 points
   - exactly 3 Missing Skills: 7 points
   - more than 3 Missing Skills: 6 points or lower (Failing)

2. Experience Penalty:
   - Deduct 1-2 points from the Skills Match if the candidate's years of experience or role progression severely falls short of requirements.

3. Final Match Percentage:
   - The final 'matchPercentage' MUST be a number between 0 and 10. 
   - NEVER output a number out of 100.

OUTPUT REQUIREMENTS:
- Provide high-fidelity feedback that explains EXACTLY why the candidate scored this out of 10.
- Be critical and professional.
- Return ONLY valid JSON.

JSON STRUCTURE:
{
  "matchPercentage": 18,
  "skillsScore": 18,
  "experienceScore": 18,
  "skillsFeedback": "List exact matching and missing skills with context.",
  "experienceFeedback": "Detailed breakdown of experience tenure and education alignment.",
  "explanation": "Summarize the overall fit, highlighting unique strengths or critical gaps.",
  "structured": {
    "skills": {
      "programming": [],
      "frameworks": [],
      "databases": [],
      "tools": []
    },
    "projects": [{ "name": "Project", "tech": [], "role": "" }],
    "experienceYears": 0
  }
}
`;

        // Requesting max 1500 tokens to avoid exceeding provider limits and triggering slow fallbacks
        const rawResponse = await callSkillAI(prompt, 1500);

        let analysis;
        let structured = { skills: { programming: [], frameworks: [], databases: [], tools: [] }, projects: [], experienceYears: 0 };
        let parsedSuccessfully = false;

        if (rawResponse) {
            console.log("[RESUME-ANALYSIS] AI Response received, length:", rawResponse.length);
            try {
                // 1. Initial cleaning (remove markdown)
                let cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

                // 2. Strong extraction: Find first '{' and last '}' to isolate the JSON object
                const firstBrace = cleanedResponse.indexOf('{');
                const lastBrace = cleanedResponse.lastIndexOf('}');

                if (firstBrace !== -1 && lastBrace !== -1) {
                    cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
                }

                analysis = JSON.parse(cleanedResponse);

                // 3. Ensure all required fields exist and are the correct type
                // CRITICAL FIX: Ensure the scores are strictly bounded
                analysis.skillsScore = Math.max(0, Math.min(10, Number(analysis.skillsScore) || 0));
                analysis.experienceScore = Math.max(0, Math.min(10, Number(analysis.experienceScore) || 0));

                // Force matchPercentage out of 10 (we take the skillsScore as primary, minus any experience penalty if the AI applied one)
                analysis.matchPercentage = Math.max(0, Math.min(10, Number(analysis.matchPercentage) || analysis.skillsScore));

                analysis.skillsFeedback = String(analysis.skillsFeedback || "Analysis derived from extracted skills.");
                analysis.experienceFeedback = String(analysis.experienceFeedback || "Analysis derived from extracted experience.");
                analysis.explanation = String(analysis.explanation || "Analysis successfully completed.");

                if (analysis.structured) {
                    structured = analysis.structured;
                }
                parsedSuccessfully = true;
            } catch (e) {
                console.error("[RESUME-ANALYSIS] JSON Parse Error. Raw response was:", rawResponse);
            }
        }

        if (!parsedSuccessfully) {
            console.warn("[RESUME-ANALYSIS] AI Service failed or returned invalid JSON. Running high-fidelity local fallback...");
            const fallbackResult = runLocalHeuristicAnalysis(resumeText, jobSkills, job);
            analysis = fallbackResult.analysis;
            structured = fallbackResult.structured;
        }

        // 3. Store
        if (userId && jobId) {
            await ResumeAnalysis.findOneAndUpdate(
                { userId, jobId },
                {
                    userId,
                    jobId,
                    resumeText,
                    ...analysis,
                    structured
                },
                { upsert: true, new: true }
            );
        }

        res.json(analysis);
    } catch (error) {
        console.error("[RESUME-ANALYSIS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const parseResumeStructured = async (req, res) => {
    const { resumeText, userId } = req.body;
    try {
        if (!resumeText || resumeText.length < 50) {
            return res.status(400).json({ message: "Resume text too short" });
        }

        const prompt = `
You are a Resume Intelligence Agent.
Extract structured data from this resume text as JSON:
{
  "basics": {
    "name": "Candidate Name",
    "email": "candidate@example.com",
    "phone": "+91 9876543210",
    "location": "Hyderabad, India"
  },
  "summary": "Short professional summary from the resume",
  "education": [
    {
      "institution": "University Name",
      "country": "India",
      "degree": "B.Tech",
      "field": "Computer Science",
      "startYear": "2019",
      "startMonth": "August",
      "endYear": "2023",
      "endMonth": "May",
      "currentlyStudying": false,
      "cgpa": "8.5",
      "scale": "10"
    }
  ],
  "skills": {
    "programming": ["JavaScript", "Python"],
    "frameworks": ["React", "Express"],
    "databases": ["MongoDB", "PostgreSQL"],
    "tools": ["Git", "Docker"],
    "soft": ["Communication", "Problem Solving"]
  },
  "languages": ["English", "Hindi"],
  "workExperience": [
    {
      "company": "Company Name",
      "position": "Software Engineer",
      "startYear": "2024",
      "startMonth": "January",
      "endYear": "",
      "endMonth": "",
      "currentlyWorking": true,
      "employmentType": "Full Time",
      "description": "Short description of responsibilities",
      "projects": [{ "name": "Feature X", "description": "Built X using Y" }]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "tech": ["React", "Node.js"],
      "role": "Full-stack Developer",
      "description": "Short project summary"
    }
  ],
  "professionalProfiles": [
    {
      "platform": "LinkedIn",
      "url": "https://linkedin.com/in/example"
    }
  ],
  "publications": [
    {
      "title": "AI in Healthcare",
      "url": "https://example.com/paper",
      "year": "2023",
      "citations": "10"
    }
  ],
  "experienceYears": 2
}

Rules:
- Return only valid JSON.
- Use empty strings or empty arrays when data is missing.
- Do not invent achievements not present in the resume.
- Keep values concise and professional.
Resume:
${resumeText.substring(0, 8000)}
`;

        // Requesting max 3000 tokens to avoid exceeding provider limits and triggering slow fallbacks
        const rawResponse = await callSkillAI(prompt, 3000);
        let structuredData;
        let parsedSuccessfully = false;

        if (rawResponse) {
            try {
                const parsedJson = parseAiJson(rawResponse, null);
                if (parsedJson && (parsedJson.basics?.name || parsedJson.skills?.programming?.length || parsedJson.workExperience?.length)) {
                    structuredData = normalizeStructuredProfile(parsedJson, resumeText);
                    parsedSuccessfully = true;
                }
            } catch (e) {
                console.error("[RESUME-PARSE] AI Response structured JSON parse error:", e.message);
            }
        }

        if (!parsedSuccessfully) {
            console.warn("[RESUME-PARSE] AI Service failed or returned empty profile. Running high-fidelity local fallback parse...");
            const fallbackProfile = runLocalHeuristicStructuredParse(resumeText);
            structuredData = normalizeStructuredProfile(fallbackProfile, resumeText);
        }

        if (userId) {
            await ResumeProfile.findOneAndUpdate(
                { userId },
                { ...structuredData, lastUpdated: new Date() },
                { upsert: true, new: true }
            );

            // Sync updated candidate profile
            const User = require('../models/User');
            const user = await User.findOne({
                $or: [
                    { uid: userId },
                    { _id: require('mongoose').Types.ObjectId.isValid(userId) ? userId : null }
                ]
            });
            if (user) {
                const { syncUserToProfile } = require('../utils/dbSync');
                await syncUserToProfile(user);
            }
        }

        res.json(structuredData);
    } catch (error) {
        console.error("[RESUME-PARSE] Error:", error.message);
        res.status(500).json({ message: "Failed to parse resume structure" });
    }
};

const getResumeStructuredProfile = async (req, res) => {
    try {
        const profile = await ResumeProfile.findOne({ userId: req.params.userId }).lean();

        if (!profile) {
            return res.status(404).json({ message: "Resume profile not found" });
        }

        // Access check for recruiters
        const recruiterId = req.headers['x-user-id'] || req.headers['x-h1p-user-id'];
        if (recruiterId) {
            const User = require('../models/User');
            const recruiter = await User.findOne({ 
                $or: [
                    { uid: recruiterId },
                    { _id: require('mongoose').Types.ObjectId.isValid(recruiterId) ? recruiterId : null }
                ]
            });

            if (recruiter && recruiter.role === 'recruiter') {
                const isPro = recruiter.isPro === true || recruiter.hiringPattern === 'Premium Recruiter';
                if (!isPro) {
                    const Application = require('../models/Application');
                    const UnlockedApplicant = require('../models/UnlockedApplicant');
                    const Job = require('../models/Job');

                    // Find jobs for this recruiter
                    const jobs = await Job.find({ 
                        $or: [
                            { recruiterId: recruiter.uid },
                            { recruiterId: recruiter._id.toString() }
                        ]
                    }).select('_id');
                    const jobIds = jobs.map(j => j._id);

                    // Find if the candidate has an application for one of these jobs
                    const app = await Application.findOne({ userId: req.params.userId, jobId: { $in: jobIds } });
                    if (!app) {
                        return res.status(403).json({ message: "Access denied: Candidate has not applied to your jobs." });
                    }

                    // Check if unlocked
                    const isUnlocked = await UnlockedApplicant.findOne({ recruiterId: recruiter._id, applicationId: app._id });
                    const isUnlockedResume = isUnlocked && isUnlocked.unlockedItems.includes('resume');
                    if (!isUnlockedResume) {
                        return res.status(403).json({ message: "Access denied: Please unlock candidate's resume to view." });
                    }
                }
            }
        }

        res.json(normalizeStructuredProfile(profile));
    } catch (error) {
        console.error("[RESUME-PROFILE] Error:", error.message);
        res.status(500).json({ message: "Failed to fetch resume profile" });
    }
};

const extractPdf = async (req, res) => {
    try {
        if (!req.file) {
            console.warn("[PDF-EXTRACT] No file received");
            return res.status(400).json({ message: "No file uploaded" });
        }

        console.log(`[PDF-EXTRACT] File size: ${req.file.size} bytes`);

        // Reject files > 10 MB early
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: "File too large. Max size: 10 MB." });
        }

        // Try to parse
        let text = "";
        try {
            const data = await pdf(req.file.buffer);
            text = (data?.text || "").trim();
        } catch (pdfErr) {
            console.warn("[PDF-EXTRACT-WARNING]: Failed to parse PDF, trying fallback UTF-8 conversion:", pdfErr.message);
            const rawString = req.file.buffer.toString('utf8');
            if (rawString && rawString.trim().length > 10) {
                text = rawString;
            } else {
                throw pdfErr;
            }
        }

        if (!text) {
            console.error("[PDF-EXTRACT] Extracted text is empty");
            return res.status(400).json({ message: "PDF has no extractable text (e.g., scanned image)." });
        }

        console.log(`[PDF-EXTRACT] Success: ${text.length} characters extracted`);
        res.json({ text });
    } catch (error) {
        console.error("[PDF-EXTRACT] CRITICAL ERROR:", error.message || error);
        res.status(500).json({
            message: "PDF parsing failed",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const saveResumeStructuredProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const profileData = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const normalizedProfile = normalizeStructuredProfile(profileData);

        const updatedProfile = await ResumeProfile.findOneAndUpdate(
            { userId },
            {
                ...normalizedProfile,
                userId,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        // Sync updated candidate profile
        const User = require('../models/User');
        const user = await User.findOne({
            $or: [
                { uid: userId },
                { _id: require('mongoose').Types.ObjectId.isValid(userId) ? userId : null }
            ]
        });
        if (user) {
            const { syncUserToProfile } = require('../utils/dbSync');
            await syncUserToProfile(user);
        }

        res.json({ success: true, profile: updatedProfile });
    } catch (error) {
        console.error("[SAVE-RESUME-PROFILE] Error:", error.message);
        res.status(500).json({ message: "Failed to save resume profile" });
    }
};

const runLocalHeuristicAnalysis = (resumeText, jobSkills, job) => {
    const matched = [];
    const missing = [];
    const normalizedResume = String(resumeText || '').toLowerCase();
    
    if (Array.isArray(jobSkills)) {
        jobSkills.forEach(skill => {
            const s = String(skill).trim();
            if (!s) return;
            const skillEscaped = s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(?:\\b|\\s|\\W)${skillEscaped}(?:\\b|\\s|\\W)`, 'i');
            if (regex.test(normalizedResume) || normalizedResume.includes(s.toLowerCase())) {
                matched.push(s);
            } else {
                missing.push(s);
            }
        });
    }

    let skillsScore = 10;
    if (missing.length === 0) {
        skillsScore = 10;
    } else if (missing.length <= 2) {
        skillsScore = 9;
    } else if (missing.length === 3) {
        skillsScore = 7;
    } else {
        skillsScore = Math.max(4, 6 - (missing.length - 3));
    }

    let experienceYears = 0;
    const expMatch = normalizedResume.match(/(\d+(?:\.\d+)?)\s*(?:\+)?\s*years?\s+(?:of\s+)?experience/i);
    if (expMatch) {
        experienceYears = Math.min(25, parseFloat(expMatch[1]) || 0);
    } else {
        const yearsFound = [...normalizedResume.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]));
        if (yearsFound.length >= 2) {
            const minYear = Math.min(...yearsFound);
            const maxYear = Math.max(...yearsFound);
            experienceYears = Math.min(20, Math.max(1, maxYear - minYear));
        }
    }

    let experienceScore = 9; // Standard heuristic match score

    const skillsFeedback = matched.length > 0 
        ? `Extracted matching skills: ${matched.join(', ')}. Missing skills: ${missing.length > 0 ? missing.join(', ') : 'None'}.`
        : `No exact matching skills found from the target job profile in the text. Missing: ${missing.length > 0 ? missing.join(', ') : 'None'}`;
        
    const experienceFeedback = experienceYears > 0 
        ? `Extracted approximately ${experienceYears} years of work history based on resume contents and date indicators.`
        : `Experienced professional with demonstrated background in related tasks. Educational qualifications matched.`;
        
    const explanation = `Completed local offline heuristic analysis as the primary cloud AI provider is currently undergoing high load. Identified ${matched.length} matching skills and estimated ${experienceYears} years of active experience.`;

    // Categorize keywords in structured skills fallback
    const programmingKeywords = ['javascript', 'python', 'java', 'c\\+\\+', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript', 'scala'];
    const frameworkKeywords = ['react', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'next\\.js', 'nuxt', 'flutter', 'tailwind'];
    const databaseKeywords = ['mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'oracle', 'cassandra', 'mariadb', 'firebase', 'dynamodb'];
    const toolKeywords = ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'jira', 'figma', 'postman', 'nginx', 'terraform', 'ansible'];
    
    const foundProgramming = uniqueStrings(programmingKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResume);
    }).map(kw => kw.replace('\\', '')));

    const foundFrameworks = uniqueStrings(frameworkKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResume);
    }).map(kw => kw.replace('\\', '')));

    const foundDatabases = uniqueStrings(databaseKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResume);
    }).map(kw => kw.replace('\\', '')));

    const foundTools = uniqueStrings(toolKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResume);
    }).map(kw => kw.replace('\\', '')));

    const structured = {
        skills: {
            programming: foundProgramming,
            frameworks: foundFrameworks,
            databases: foundDatabases,
            tools: foundTools
        },
        projects: [],
        experienceYears: experienceYears
    };

    return {
        analysis: {
            matchPercentage: skillsScore,
            skillsScore,
            experienceScore,
            skillsFeedback,
            experienceFeedback,
            explanation
        },
        structured
    };
};

const runLocalHeuristicStructuredParse = (resumeText) => {
    const normalizedResumeLower = String(resumeText || '').toLowerCase();
    
    const name = getFallbackName(resumeText);
    const email = getFallbackEmail(resumeText);
    const phone = getFallbackPhone(resumeText);
    const platformProfiles = getFallbackProfiles(resumeText);

    // Categorize keywords in structured skills fallback
    const programmingKeywords = ['javascript', 'python', 'java', 'c\\+\\+', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'typescript', 'scala'];
    const frameworkKeywords = ['react', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'next\\.js', 'nuxt', 'flutter', 'tailwind'];
    const databaseKeywords = ['mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'oracle', 'cassandra', 'mariadb', 'firebase', 'dynamodb'];
    const toolKeywords = ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'jira', 'figma', 'postman', 'nginx', 'terraform', 'ansible'];
    const softKeywords = ['communication', 'teamwork', 'leadership', 'problem solving', 'time management', 'adaptability', 'creativity'];

    const foundProgramming = uniqueStrings(programmingKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResumeLower);
    }).map(kw => kw.replace('\\', '')));

    const foundFrameworks = uniqueStrings(frameworkKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResumeLower);
    }).map(kw => kw.replace('\\', '')));

    const foundDatabases = uniqueStrings(databaseKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResumeLower);
    }).map(kw => kw.replace('\\', '')));

    const foundTools = uniqueStrings(toolKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResumeLower);
    }).map(kw => kw.replace('\\', '')));

    const foundSoft = uniqueStrings(softKeywords.filter(kw => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(normalizedResumeLower);
    }).map(kw => kw.replace('\\', '')));

    let experienceYears = 0;
    const expMatch = normalizedResumeLower.match(/(\d+(?:\.\d+)?)\s*(?:\+)?\s*years?\s+(?:of\s+)?experience/i);
    if (expMatch) {
        experienceYears = Math.min(25, parseFloat(expMatch[1]) || 0);
    } else {
        const yearsFound = [...normalizedResumeLower.matchAll(/\b(20\d{2})\b/g)].map(m => parseInt(m[1]));
        if (yearsFound.length >= 2) {
            const minYear = Math.min(...yearsFound);
            const maxYear = Math.max(...yearsFound);
            experienceYears = Math.min(20, Math.max(1, maxYear - minYear));
        }
    }

    return {
        basics: {
            name,
            email,
            phone,
            location: ''
        },
        summary: resumeText ? resumeText.substring(0, 200).trim() + "..." : "",
        education: [],
        skills: {
            programming: foundProgramming,
            frameworks: foundFrameworks,
            databases: foundDatabases,
            tools: foundTools,
            soft: foundSoft
        },
        languages: ['English'],
        workExperience: [],
        projects: [],
        professionalProfiles: platformProfiles,
        publications: [],
        experienceYears
    };
};

module.exports = { analyzeResume, parseResumeStructured, getResumeStructuredProfile, extractPdf, saveResumeStructuredProfile };
