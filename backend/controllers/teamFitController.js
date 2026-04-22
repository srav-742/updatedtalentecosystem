const { GoogleGenerativeAI } = require("@google/generative-ai");
const Application = require("../models/Application");
const User = require("../models/User");
const Job = require("../models/Job");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/**
 * Updates the recruiter's hiring pattern based on all candidates marked as 'HIRED'
 */
const updateRecruiterPattern = async (recruiterId) => {
    try {
        // 1. Fetch all jobs by this recruiter
        const jobs = await Job.find({ recruiterId });
        const jobIds = jobs.map(j => j._id);

        // 2. Fetch all HIRED applications for these jobs
        const hiredApps = await Application.find({ 
            jobId: { $in: jobIds },
            status: 'HIRED' 
        }).populate('jobId');

        if (hiredApps.length === 0) return;

        // 3. Extract traits for synthesis
        const traits = hiredApps.map(app => ({
            jobTitle: app.jobId?.title,
            skills: app.user?.skills || [],
            finalScore: app.finalScore,
            interviewFeedback: app.interviewAnswers?.map(a => a.feedback).join(" ") || ""
        }));

        const prompt = `
            You are an AI Organizational Psychologist. Analyze the following successful hires for a recruiter 
            and synthesize their "Hiring Pattern" or "Team Persona".
            
            Successful Hires Data:
            ${JSON.stringify(traits)}

            Provide a concise (2-3 sentences) description of what this recruiter values in candidates. 
            Focus on recurring skills, soft traits, or performance signals.
            Format: "This recruiter tends to hire [traits] for roles like [roles]. They value [specifics]."
        `;

        const result = await model.generateContent(prompt);
        const pattern = result.response.text().trim();

        await User.findOneAndUpdate({ uid: recruiterId }, { hiringPattern: pattern });
        console.log(`[TeamFit] Pattern updated for recruiter ${recruiterId}`);
    } catch (error) {
        console.error("[TeamFit] updatePattern Error:", error);
    }
};

/**
 * Calculates Team Fit score for a specific application
 */
const calculateTeamFit = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const app = await Application.findById(applicationId).populate('jobId');
        if (!app) return res.status(404).json({ message: "Application not found" });

        const recruiterId = app.jobId?.recruiterId;
        const recruiter = await User.findOne({ uid: recruiterId });
        
        if (!recruiter || !recruiter.hiringPattern) {
            return res.json({ 
                score: 0, 
                reason: "Not enough hiring data yet to establish a team pattern. Hire more candidates to activate this predictor!" 
            });
        }

        // Prepare candidate data for comparison
        const candidateData = {
            name: app.applicantName,
            jobTitle: app.jobId?.title,
            skills: app.user?.skills || [],
            interviewScore: app.interviewScore,
            ownershipScore: app.metrics?.ownershipMindset,
            finalScore: app.finalScore,
            summary: app.interviewAnswers?.map(a => a.feedback).join(" ") || "General candidate profile"
        };

        const prompt = `
            You are an AI Hiring Assistant. Compare this candidate with the recruiter's existing "Team Fit Pattern".
            
            Recruiter's Pattern: "${recruiter.hiringPattern}"
            
            Current Candidate:
            ${JSON.stringify(candidateData)}

            Evaluate the "Culture & Team Fit".
            Strictly return a JSON object:
            {
                "score": (0-100),
                "reason": "A 1-2 sentence explanation of the fit score, mentioning specifics like 'Matches your preference for high ownership' or 'Strong technical alignment with previous hires'."
            }
        `;

        const result = await model.generateContent(prompt);
        const rawText = result.response.text();
        // Clean potential markdown blocks
        const cleanedText = rawText.replace(/```json|```/gi, '').trim();
        const analysis = JSON.parse(cleanedText);

        app.teamFit = {
            score: analysis.score,
            reason: analysis.reason,
            lastCalculated: new Date()
        };
        await app.save();

        res.json(app.teamFit);
    } catch (error) {
        console.error("[TeamFit] calculateFit Error:", error);
        res.status(500).json({ message: "Failed to calculate team fit" });
    }
};

module.exports = {
    updateRecruiterPattern,
    calculateTeamFit
};
