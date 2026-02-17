const ResumeAnalysis = require('../models/ResumeAnalysis');
const ResumeProfile = require('../models/ResumeProfile');
const { callSkillAI } = require('../utils/aiClients');
const pdf = require('pdf-parse');

const analyzeResume = async (req, res) => {
    try {
        const { resumeText, jobSkills, jobExperience, jobEducation, userId, jobId } = req.body;
        if (!userId || !jobId) return res.status(400).json({ message: "Recruiter/Job context missing" });
        console.log("[RESUME-ANALYSIS] Starting Analysis...");
        const prompt = `
You are an expert ATS (Applicant Tracking System) scanner.
Analyze the provided resume text against the job requirements.

Job Requirements:
- Skills: ${Array.isArray(jobSkills) ? jobSkills.join(', ') : 'General'}
- Experience Level: ${jobExperience || 'Any'}
- Education: ${JSON.stringify(jobEducation || [])}

Resume Text:
${resumeText ? resumeText.substring(0, 10000) : ''}

TASK:
1. Calculate a Skills Match Score (0-100) based strictly on the presence of required skills found in the resume.
   - For each required skill, give +10 points if fully present, +5 if partial, 0 if missing.
   - Max 100 points.
2. Calculate an Experience & Details Score (0-100) based on:
   - Years of experience vs required (e.g., "0-1 Years" → 1 year max → 100% if ≥1 yr, else linear)
   - Education match (degree/qualification match)
   - Specialization match (e.g., "All Branches" → any degree OK)
3. Total Match Percentage = (Skills Score * 0.5) + (Experience Score * 0.5)

CRITICAL: Return ONLY a valid JSON object. Do NOT include any markdown formatting, code blocks, or explanatory text.
Return EXACTLY this structure with ALL 6 fields:

{
  "matchPercentage": 78,
  "skillsScore": 85,
  "experienceScore": 70,
  "skillsFeedback": "Missing: TypeScript, Tailwind CSS. Strong in HTML, CSS, JavaScript.",
  "experienceFeedback": "Experience level matches. Education: B.Tech in All Branches — acceptable.",
  "explanation": "Candidate has strong frontend skills but lacks modern frameworks. Experience and education are sufficient."
}
`;
        const rawResponse = await callSkillAI(prompt);
        if (!rawResponse) throw new Error("AI Service Failed");

        console.log("[RESUME-ANALYSIS] AI Response received, length:", rawResponse.length);
        console.log("[RESUME-ANALYSIS] First 200 chars:", rawResponse.substring(0, 200));


        let analysis;
        try {
            // Remove any markdown formatting if it slipped through
            const cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            analysis = JSON.parse(cleanedResponse);

            // Ensure all required fields exist and are the correct type
            analysis.matchPercentage = Number(analysis.matchPercentage) || 0;
            analysis.skillsScore = Number(analysis.skillsScore) || 0;
            analysis.experienceScore = Number(analysis.experienceScore) || 0;

            analysis.skillsFeedback = String(analysis.skillsFeedback || "Unable to analyze skills.");
            analysis.experienceFeedback = String(analysis.experienceFeedback || "Unable to analyze experience.");
            analysis.explanation = String(analysis.explanation || "Analysis completed based on the provided text.");

        } catch (e) {
            console.error("[RESUME-ANALYSIS] JSON Parse Error:", e);
            console.error("[RESUME-ANALYSIS] Raw AI Response:", rawResponse);

            // ✅ Full fallback with ALL required fields
            analysis = {
                matchPercentage: 0,
                skillsScore: 0,
                experienceScore: 0,
                skillsFeedback: "Unable to analyze skills. Please try again.",
                experienceFeedback: "Unable to analyze experience. Please try again.",
                explanation: "Failed to parse AI analysis. Please try uploading your resume again."
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
            if (rawIn) structured = JSON.parse(rawIn);
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
  "skills": {
    "programming": ["JavaScript", "Python"],
    "frameworks": ["React", "Express"],
    "databases": ["MongoDB", "PostgreSQL"],
    "tools": ["Git", "Docker"]
  },
  "projects": [
    {
      "name": "Project Name",
      "tech": ["React", "Node.js"],
      "role": "Full-stack Developer"
    }
  ],
  "experienceYears": 2
}
Resume:
${resumeText.substring(0, 8000)}
`;

        const rawResponse = await callSkillAI(prompt);
        if (!rawResponse) {
            return res.status(500).json({ message: "Resume parsing failed" });
        }

        let structuredData;
        try {
            structuredData = JSON.parse(rawResponse);
        } catch (e) {
            console.error("[RESUME-PARSE] JSON parse failed:", rawResponse);
            structuredData = {
                skills: { programming: [], frameworks: [], databases: [], tools: [] },
                projects: [],
                experienceYears: 0
            };
        }

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

module.exports = { analyzeResume, parseResumeStructured, extractPdf };
