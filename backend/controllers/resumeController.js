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

SCORING ALGORITHM (STRICT):
1. Skills Match (0-100):
   - Direct Match: Exact skill mentioned (High Confidence).
   - Related Match: Synonyms or version-specific matches (e.g., "React.js" for "React").
   - Missing: Skill not mentioned at all.
   - Deduction: -5 for each critical missing skill.

2. Experience & Profile Score (0-100):
   - Years of Experience: Compare resume timeline vs job requirements.
   - Education: Verify degree level and field relevance.
   - Career Progression: Stability and role relevance.

3. Final Weighted Percentage:
   - (Skills Score * 0.6) + (Experience Score * 0.4)

OUTPUT REQUIREMENTS:
- Provide high-fidelity feedback that explains EXACTLY why the candidate scored this way.
- Be critical and professional.
- Return ONLY valid JSON.

JSON STRUCTURE:
{
  "matchPercentage": 85,
  "skillsScore": 90,
  "experienceScore": 78,
  "skillsFeedback": "List exact matching and missing skills with context.",
  "experienceFeedback": "Detailed breakdown of experience tenure and education alignment.",
  "explanation": "Summarize the overall fit, highlighting unique strengths or critical gaps."
}
`;
        const rawResponse = await callSkillAI(prompt);
        if (!rawResponse) throw new Error("AI Service Failed");

        console.log("[RESUME-ANALYSIS] AI Response received, length:", rawResponse.length);
        console.log("[RESUME-ANALYSIS] First 200 chars:", rawResponse.substring(0, 200));


        let analysis;
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
            analysis.skillsScore = Math.max(0, Math.min(100, Number(analysis.skillsScore) || 0));
            analysis.experienceScore = Math.max(0, Math.min(100, Number(analysis.experienceScore) || 0));

            // CRITICAL FIX: Mathematically force exactly 60% / 40% weighting
            analysis.matchPercentage = Math.round((analysis.skillsScore * 0.6) + (analysis.experienceScore * 0.4));

            analysis.skillsFeedback = String(analysis.skillsFeedback || "Analysis derived from extracted skills.");
            analysis.experienceFeedback = String(analysis.experienceFeedback || "Analysis derived from extracted experience.");
            analysis.explanation = String(analysis.explanation || "Analysis successfully completed.");

        } catch (e) {
            console.error("[RESUME-ANALYSIS] JSON Parse Error. Raw response was:", rawResponse);

            // âœ… Full fallback with ALL required fields
            analysis = {
                matchPercentage: 0,
                skillsScore: 0,
                experienceScore: 0,
                skillsFeedback: "Unable to analyze skills. Please try again.",
                experienceFeedback: "Unable to analyze experience. Please try again.",
                explanation: "The AI response was not in the correct format. This usually happens if the resume is too complex or the AI service is overloaded."
            };
        }

        // 2. Structured Extraction
        const extractPrompt = `
Extract structured resume data as JSON:
{
 "skills": {
   "programming": [],
   "frameworks": [],
   "databases": [],
   "tools": []
 },
 "projects": [{ "name": "Project", "tech": [], "role": "" }],
 "experienceYears": 0
}
Resume:
${resumeText ? resumeText.substring(0, 8000) : ''}
`;
        let structured = { skills: { programming: [], frameworks: [], databases: [], tools: [] }, projects: [], experienceYears: 0 };
        try {
            const rawIn = await callSkillAI(extractPrompt);
            if (rawIn) structured = parseAiJson(rawIn, structured);
        } catch (e) { console.warn("Structured parse failed"); }

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

        const rawResponse = await callSkillAI(prompt);
        if (!rawResponse) {
            return res.status(500).json({ message: "Resume parsing failed" });
        }

        const structuredData = normalizeStructuredProfile(
            parseAiJson(rawResponse, emptyStructuredProfile()),
            resumeText
        );

        if (userId) {
            await ResumeProfile.findOneAndUpdate(
                { userId },
                { ...structuredData, lastUpdated: new Date() },
                { upsert: true, new: true }
            );
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
        const data = await pdf(req.file.buffer);
        const text = (data?.text || "").trim();

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

module.exports = { analyzeResume, parseResumeStructured, getResumeStructuredProfile, extractPdf };
