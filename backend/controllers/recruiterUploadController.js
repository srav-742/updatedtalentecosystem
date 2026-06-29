const pdf = require('pdf-parse');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const ResumeProfile = require('../models/ResumeProfile');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { callSkillAI } = require('../utils/aiClients');

// Utility to safely sanitize and parse JSON returned by LLM
const parseAiJson = (raw, fallback) => {
    try {
        let cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("[BULK-UPLOAD-AI] JSON Parse Error. Raw response was:", raw);
        return fallback;
    }
};

// Local heuristics in case AI fails
const getFallbackEmail = (text = '') => text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
const getFallbackPhone = (text = '') => text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,}/)?.[0] || '';
const getFallbackName = (text = '') => {
    const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    return lines.find(line => /^[A-Za-z][A-Za-z .'-]{2,40}$/.test(line) && line.split(/\s+/).length <= 5) || 'Imported Candidate';
};

const bulkUploadCandidate = async (req, res) => {
    try {
        const { jobId, recruiterId } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid or missing Job ID" });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job campaign not found" });
        }

        console.log(`[BULK-UPLOAD] Processing file: ${req.file.originalname} for Job: ${job.title}`);

        // Step 1: PDF Extraction
        let resumeText = '';
        try {
            const data = await pdf(req.file.buffer);
            resumeText = (data?.text || "").trim();
        } catch (pdfErr) {
            console.warn("[BULK-UPLOAD] PDF Extraction Failed, trying fallback UTF-8 conversion:", pdfErr.message);
            const rawString = req.file.buffer.toString('utf8');
            if (rawString && rawString.trim().length > 10) {
                resumeText = rawString;
            } else {
                console.error("[BULK-UPLOAD] PDF Extraction Failed completely:", pdfErr);
                return res.status(400).json({ message: "Failed to extract text from PDF resume." });
            }
        }

        if (!resumeText) {
            return res.status(400).json({ message: "Uploaded resume has no extractable text." });
        }

        // Step 2: AI Parse Structured Details
        const parsePrompt = `
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
      "degree": "Degree (e.g. B.Tech)",
      "field": "Field of study",
      "startYear": "2019",
      "endYear": "2023"
    }
  ],
  "skills": {
    "programming": ["JavaScript"],
    "frameworks": ["React"],
    "databases": ["MongoDB"],
    "tools": ["Git"],
    "soft": ["Communication"]
  },
  "workExperience": [
    {
      "company": "Company Name",
      "position": "Software Engineer",
      "startYear": "2024",
      "endYear": "",
      "currentlyWorking": true,
      "description": "Short description of responsibilities"
    }
  ]
}

Rules:
- Return ONLY valid JSON. Do not include markdown code block syntax in the response except JSON itself.
- If email is not found, extract any contact info or leave it blank.
- Resume text:
${resumeText.substring(0, 7000)}
`;

        let parsedData = null;
        try {
            const aiResponse = await callSkillAI(parsePrompt, 2000);
            parsedData = parseAiJson(aiResponse, null);
        } catch (aiErr) {
            console.error("[BULK-UPLOAD] AI parsing failed:", aiErr);
        }

        // Fallback structured data if AI fails
        if (!parsedData) {
            parsedData = {
                basics: {
                    name: getFallbackName(resumeText),
                    email: getFallbackEmail(resumeText),
                    phone: getFallbackPhone(resumeText),
                    location: ''
                },
                summary: 'Imported Candidate Resume Profile',
                education: [],
                skills: { programming: [], frameworks: [], databases: [], tools: [], soft: [] },
                workExperience: []
            };
        }

        // Ensure email exists, otherwise generate a dummy email
        let email = parsedData.basics?.email || getFallbackEmail(resumeText);
        if (!email) {
            const randomStr = crypto.randomBytes(6).toString('hex');
            email = `candidate_${randomStr}@imported.hire1percent.com`;
        }

        const name = parsedData.basics?.name || getFallbackName(resumeText);
        const phone = parsedData.basics?.phone || getFallbackPhone(resumeText);
        const location = parsedData.basics?.location || '';

        // Step 3: Resolve user in database or create shadow seeker
        let user = await User.findOne({ email: email.toLowerCase() });
        let isNewUser = false;
        let userId = '';

        if (user) {
            userId = user.uid;
            console.log(`[BULK-UPLOAD] Found existing user: ${user.name} with uid: ${userId}`);
        } else {
            isNewUser = true;
            userId = `shadow_${crypto.randomUUID()}`;
            console.log(`[BULK-UPLOAD] Creating shadow user for: ${name} (${email}) with uid: ${userId}`);

            // Flatten skills
            const flatSkills = [
                ...(parsedData.skills?.programming || []),
                ...(parsedData.skills?.frameworks || []),
                ...(parsedData.skills?.databases || []),
                ...(parsedData.skills?.tools || []),
                ...(parsedData.skills?.soft || [])
            ].filter(Boolean);

            user = new User({
                name,
                email: email.toLowerCase(),
                phone,
                location,
                uid: userId,
                role: 'seeker',
                skills: flatSkills,
                education: (parsedData.education || []).map(edu => ({
                    institution: edu.institution || '',
                    degree: edu.degree || '',
                    year: edu.endYear || edu.startYear || ''
                })),
                experience: (parsedData.workExperience || []).map(exp => ({
                    company: exp.company || '',
                    role: exp.position || '',
                    duration: (exp.startYear && exp.endYear) ? `${exp.startYear} - ${exp.endYear}` : (exp.startYear || ''),
                    description: exp.description || ''
                }))
            });
            await user.save();

            // Save ResumeProfile for this shadow user
            const resumeProfile = new ResumeProfile({
                userId,
                basics: { name, email, phone, location },
                summary: parsedData.summary || '',
                education: parsedData.education || [],
                skills: parsedData.skills || { programming: [], frameworks: [], databases: [], tools: [], soft: [] },
                workExperience: parsedData.workExperience || [],
                experienceYears: 0,
                lastUpdated: new Date()
            });
            await resumeProfile.save();
        }

        // Step 4: AI Analyze fit (reusing scoring out of 10)
        const jobSkills = job.skills || [];
        const jobExperience = job.experienceLevel || `${job.minExperience || 0} Years`;

        const analysisPrompt = `
You are an ELITE Applicant Tracking System (ATS) Intelligence Engine.
Analyze this resume against the Job Campaign details and provide an objective fitness score.

Job Title: ${job.title}
Required Skills: ${jobSkills.join(', ')}
Required Experience: ${jobExperience}

Resume Content:
${resumeText.substring(0, 8000)}

SCORING ALGORITHM (STRICT - MAX 10 POINTS):
- 0 to 4 Points: Poor fit, missing core skills/experience.
- 5 to 7 Points: Mid-tier fit, has core skills but has minor experience gaps.
- 8 to 10 Points: Excellent fit, matches all requirements.

Return ONLY a JSON response in this format:
{
  "matchPercentage": 8,
  "skillsScore": 8,
  "experienceScore": 8,
  "skillsFeedback": "Brief description of matching/missing skills.",
  "experienceFeedback": "Brief description of experience level alignment.",
  "explanation": "Summary statement of fit."
}
`;

        let analysisData = null;
        try {
            const analysisResponse = await callSkillAI(analysisPrompt, 1500);
            analysisData = parseAiJson(analysisResponse, null);
        } catch (err) {
            console.error("[BULK-UPLOAD] AI Analysis Error:", err);
        }

        // Offline matching fallback
        if (!analysisData) {
            const matchedSkills = [];
            const missingSkills = [];
            const resumeTextLower = resumeText.toLowerCase();

            jobSkills.forEach(skill => {
                if (resumeTextLower.includes(skill.toLowerCase())) {
                    matchedSkills.push(skill);
                } else {
                    missingSkills.push(skill);
                }
            });

            const score = Math.max(2, Math.min(10, Math.round((matchedSkills.length / (jobSkills.length || 1)) * 10)));
            analysisData = {
                matchPercentage: score,
                skillsScore: score,
                experienceScore: score,
                skillsFeedback: `Matched skills: ${matchedSkills.join(', ')}. Missing: ${missingSkills.join(', ')}.`,
                experienceFeedback: "Estimated alignment based on offline keyword profile match.",
                explanation: `Offline match parsed ${matchedSkills.length} skills.`
            };
        }

        // Clean values to make sure they are within 0-10 bounds
        const score = Math.max(0, Math.min(10, Number(analysisData.matchPercentage) || Number(analysisData.skillsScore) || 5));

        // Save ResumeAnalysis
        await ResumeAnalysis.findOneAndUpdate(
            { userId, jobId },
            {
                userId,
                jobId,
                resumeText,
                matchPercentage: score,
                skillsScore: score,
                experienceScore: score,
                skillsFeedback: analysisData.skillsFeedback || "Structured assessment complete.",
                experienceFeedback: analysisData.experienceFeedback || "Structured evaluation complete.",
                explanation: analysisData.explanation || "Evaluation complete."
            },
            { upsert: true, new: true }
        );

        // Step 5: Create or Update Application
        // Delete previous application for this campaign if the recruiter is re-uploading
        let application = await Application.findOne({ jobId: job._id, userId });

        const applicationData = {
            jobId: job._id,
            userId,
            applicantName: name,
            applicantEmail: email,
            resumeMatchPercent: score,
            finalScore: score, // matches the resume score since assessment is not started
            status: score >= 5.5 ? 'SHORTLISTED' : 'APPLIED'
        };

        if (application) {
            console.log(`[BULK-UPLOAD] Updating existing application for user ${name}`);
            application = await Application.findOneAndUpdate(
                { jobId: job._id, userId },
                { $set: applicationData },
                { new: true }
            );
        } else {
            console.log(`[BULK-UPLOAD] Creating new application for user ${name}`);
            application = new Application(applicationData);
            await application.save();
        }

        // Increment applicant count on Job model
        const appCount = await Application.countDocuments({ jobId: job._id });
        job.applicantCount = appCount;
        await job.save();

        res.status(200).json({
            success: true,
            message: `Successfully processed ${name}`,
            candidate: {
                name,
                email,
                score,
                status: application.status,
                isNewUser
            }
        });

    } catch (error) {
        console.error("[BULK-UPLOAD-CONTROLLER] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { bulkUploadCandidate };
