const Job = require('../models/Job');
const User = require('../models/User');
const ResumeProfile = require('../models/ResumeProfile');
const { callInterviewAI } = require('../utils/aiClients');
const mongoose = require('mongoose');

const analyzeSkillGap = async (req, res) => {
    try {
        const { jobId, userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: 'Invalid job ID' });
        }

        const job = await Job.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const user = await User.findOne({ uid: userId }).lean();
        const resumeProfile = await ResumeProfile.findOne({ userId }).lean();

        if (!user && !resumeProfile) {
            return res.status(404).json({ message: 'User not found' });
        }

        const jobTitle = job.title || 'Unknown Role';
        const jobSkills = (job.skills || []).join(', ') || 'N/A';

        // Gather candidate skills
        let candidateSkills = [];
        if (resumeProfile?.skills) {
            if (resumeProfile.skills.programming) candidateSkills.push(...resumeProfile.skills.programming);
            if (resumeProfile.skills.frameworks) candidateSkills.push(...resumeProfile.skills.frameworks);
            if (resumeProfile.skills.databases) candidateSkills.push(...resumeProfile.skills.databases);
            if (resumeProfile.skills.tools) candidateSkills.push(...resumeProfile.skills.tools);
        } else if (user?.skills) {
            candidateSkills = user.skills;
        }

        const candidateSkillsText = candidateSkills.length > 0 ? candidateSkills.join(', ') : 'None listed';

        const prompt = `
You are an expert technical recruiter and talent assessor.
Your task is to compare a candidate's current skills with the skills required for a target job role, and identify any skill gaps.

=== TARGET ROLE ===
Role: ${jobTitle}
Required Skills: ${jobSkills}

=== CANDIDATE ===
Candidate Skills: ${candidateSkillsText}

=== TASK ===
Analyze the candidate's skills against the required skills.
Provide the output ONLY as a valid JSON object with the following structure:
{
  "matchingSkills": ["Skill 1", "Skill 2"],
  "missingSkills": ["Skill 3", "Skill 4"],
  "weakSkills": ["Skill 5"],
  "analysis": "A brief 2-3 sentence summary of the candidate's skill fit and what they need to learn to be a strong match."
}
`;

        console.log(`[SKILL-GAP] Generating skill gap analysis for user ${userId} and job ${jobId}`);
        const rawResponse = await callInterviewAI(
            prompt,
            800,
            true,
            "You are a professional technical recruiter. Provide output strictly as a JSON object."
        );

        if (!rawResponse) {
            return res.status(500).json({ message: 'Failed to generate analysis from AI.' });
        }

        // Parse JSON safely
        let parsed = null;
        let rawCleaned = String(rawResponse || '').trim();

        if (rawCleaned.startsWith('```')) {
            rawCleaned = rawCleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
        }

        if (!rawCleaned.startsWith('{')) {
            const firstBrace = rawCleaned.indexOf('{');
            const lastBrace = rawCleaned.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                rawCleaned = rawCleaned.substring(firstBrace, lastBrace + 1).trim();
            }
        }

        try {
            parsed = JSON.parse(rawCleaned);
        } catch (error) {
            console.error('[SKILL-GAP] Failed to parse AI response as JSON:', rawCleaned);
            return res.status(500).json({ message: 'AI returned invalid format.' });
        }

        const cleanArray = (arr) => Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : [];
        const result = {
            matchingSkills: cleanArray(parsed.matchingSkills),
            missingSkills: cleanArray(parsed.missingSkills),
            weakSkills: cleanArray(parsed.weakSkills),
            analysis: String(parsed.analysis || '').trim()
        };

        return res.json(result);

    } catch (error) {
        console.error('[SKILL-GAP] Error generating skill gap:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

module.exports = { analyzeSkillGap };
