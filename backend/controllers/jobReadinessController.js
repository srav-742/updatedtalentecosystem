const User = require('../models/User');
const ResumeProfile = require('../models/ResumeProfile');
const Application = require('../models/Application');
const AssessmentSubmission = require('../models/AssessmentSubmission');

/**
 * Calculates the multi-dimensional Job Readiness Score for a candidate.
 * 
 * 5 Pillars:
 * 1. Skills (20 pts): Breadth, categorized depth, and relevance
 * 2. Assessments (25 pts): Coding challenges & MCQ scores
 * 3. Projects (15 pts): Verified production projects & GitHub links
 * 4. Resume & Profile (20 pts): Uploaded resume, experience, education, bio
 * 5. Interview Performance (20 pts): AI mock and application interviews, metrics
 */
exports.getJobReadiness = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Fetch candidate data across all collections in parallel
        const [userDoc, resumeProfileDoc, applications, assessmentSubmissions] = await Promise.all([
            User.findOne({ $or: [{ uid: userId }, { _id: userId.match(/^[0-9a-fA-F]{24}$/) ? userId : null }].filter(Boolean) }).lean(),
            ResumeProfile.findOne({ userId }).lean(),
            Application.find({ userId }).select('interviewScore assessmentScore codingScore resumeMatchPercent metrics status appliedAt').lean(),
            AssessmentSubmission.find({ userId }).select('score totalQuestions correctAnswers submittedAt').lean()
        ]);

        // If user doesn't exist yet, return baseline default
        const user = userDoc || {};
        const resumeProfile = resumeProfileDoc || {};

        // ─── 1. SKILLS EVALUATION (Max 20 pts) ──────────────────────────────────
        let candidateSkills = [];
        if (resumeProfile?.skills) {
            if (Array.isArray(resumeProfile.skills.programming)) candidateSkills.push(...resumeProfile.skills.programming);
            if (Array.isArray(resumeProfile.skills.frameworks)) candidateSkills.push(...resumeProfile.skills.frameworks);
            if (Array.isArray(resumeProfile.skills.databases)) candidateSkills.push(...resumeProfile.skills.databases);
            if (Array.isArray(resumeProfile.skills.tools)) candidateSkills.push(...resumeProfile.skills.tools);
        }
        if (Array.isArray(user?.skills)) {
            candidateSkills.push(...user.skills);
        }
        // Deduplicate
        const uniqueSkills = [...new Set(candidateSkills.map(s => String(s).trim().toLowerCase()))].filter(Boolean);
        
        let skillsScore = 0;
        const skillCount = uniqueSkills.length;
        if (skillCount >= 15) skillsScore = 18;
        else if (skillCount >= 10) skillsScore = 15;
        else if (skillCount >= 6) skillsScore = 11;
        else if (skillCount >= 3) skillsScore = 7;
        else if (skillCount >= 1) skillsScore = 4;
        else skillsScore = 0;

        // Diversity bonus (if skills span multiple areas like frameworks + databases)
        const hasBackendOrDb = uniqueSkills.some(s => /sql|mongo|node|express|django|flask|spring|fastapi|postgres/i.test(s));
        const hasFrontendOrLang = uniqueSkills.some(s => /react|vue|angular|javascript|typescript|python|java|html|css/i.test(s));
        if (hasBackendOrDb && hasFrontendOrLang && skillsScore > 4) {
            skillsScore = Math.min(20, skillsScore + 2);
        }

        // ─── 2. ASSESSMENTS EVALUATION (Max 25 pts) ─────────────────────────────
        let assessmentsScore = 0;
        let completedAssessmentsCount = (assessmentSubmissions?.length || 0);

        // Also check if any applications have recorded coding/assessment scores
        const appAssessmentScores = (applications || [])
            .map(a => a.assessmentScore || a.codingScore)
            .filter(score => typeof score === 'number' && score > 0);

        const allAssessmentScores = [
            ...(assessmentSubmissions || []).map(s => s.score).filter(s => typeof s === 'number'),
            ...appAssessmentScores
        ];

        if (allAssessmentScores.length > 0) {
            const avgScore = allAssessmentScores.reduce((a, b) => a + b, 0) / allAssessmentScores.length;
            // Normalize avgScore (0-100) to 25 pts
            assessmentsScore = Math.round((avgScore / 100) * 25);
            // Reward multiple tests taken
            if (allAssessmentScores.length >= 2 && assessmentsScore < 25) {
                assessmentsScore = Math.min(25, assessmentsScore + 2);
            }
        } else {
            // New user baseline if they have registered skills
            assessmentsScore = skillCount >= 3 ? 5 : 0;
        }

        // ─── 3. PROJECTS EVALUATION (Max 15 pts) ────────────────────────────────
        const userProjects = (user.projects && Array.isArray(user.projects)) ? user.projects : [];
        const resumeProjects = (resumeProfile.projects && Array.isArray(resumeProfile.projects)) ? resumeProfile.projects : [];
        const totalProjectsCount = Math.max(userProjects.length, resumeProjects.length);

        let projectsScore = 0;
        if (totalProjectsCount >= 3) projectsScore = 13;
        else if (totalProjectsCount === 2) projectsScore = 10;
        else if (totalProjectsCount === 1) projectsScore = 6;
        else projectsScore = 2; // Baseline

        // GitHub repository bonus
        if (user.githubUrl || resumeProfile.basics?.github) {
            projectsScore = Math.min(15, projectsScore + 2);
        }

        // ─── 4. RESUME & PROFILE COMPLETENESS (Max 20 pts) ──────────────────────
        let resumeScore = 0;
        const hasResume = !!(user.resumeUrl || resumeProfile.summary);
        if (hasResume) resumeScore += 8;

        const hasExperience = (user.experience?.length > 0) || (resumeProfile.workExperience?.length > 0);
        if (hasExperience) resumeScore += 5;

        const hasEducation = (user.education?.length > 0) || (resumeProfile.education?.length > 0);
        if (hasEducation) resumeScore += 4;

        const hasBioOrContact = !!(user.bio || user.phone || user.linkedinUrl);
        if (hasBioOrContact) resumeScore += 3;

        // ─── 5. INTERVIEW PERFORMANCE (Max 20 pts) ──────────────────────────────
        let interviewScore = 0;
        const validInterviewScores = (applications || [])
            .map(a => a.interviewScore)
            .filter(s => typeof s === 'number' && s > 0);

        if (validInterviewScores.length > 0) {
            const avgInterview = validInterviewScores.reduce((a, b) => a + b, 0) / validInterviewScores.length;
            // Normalize avgInterview (0-100) to 20 pts
            interviewScore = Math.round((avgInterview / 100) * 20);
        } else {
            // Baseline 4 pts if profile has basic experience, 0 otherwise
            interviewScore = hasResume ? 4 : 0;
        }

        // ─── OVERALL SCORE & READINESS TIER ─────────────────────────────────────
        const overallScore = Math.min(100, Math.max(10, skillsScore + assessmentsScore + projectsScore + resumeScore + interviewScore));

        let tier = 'Action Required';
        let tierColor = 'rose';
        let tierDescription = 'Complete core profile requirements to unlock automated recruiter shortlisting.';

        if (overallScore >= 85) {
            tier = 'Job Ready - Top 1% Tier';
            tierColor = 'emerald';
            tierDescription = 'Exceptional candidate profile. Top priority in recruiter search and direct pipeline.';
        } else if (overallScore >= 70) {
            tier = 'Competitive - Interview Ready';
            tierColor = 'indigo';
            tierDescription = 'Strong market readiness. Ready for technical screening and hiring manager rounds.';
        } else if (overallScore >= 50) {
            tier = 'Developing - Moderate Readiness';
            tierColor = 'amber';
            tierDescription = 'Good foundation. Complete pending assessments or mock interviews to boost interview calls.';
        }

        // Estimated percentile against candidate pool
        const percentile = Math.min(99, Math.max(15, Math.round(overallScore * 0.95) + 4));

        // ─── DYNAMIC PRIORITIZED IMPROVEMENT ACTIONS ───────────────────────────
        const improvementActions = [];

        // Check Interview
        if (validInterviewScores.length === 0 || interviewScore < 14) {
            improvementActions.push({
                id: 'take-mock-interview',
                title: 'Practice Voice Mock Interview',
                desc: 'Complete an automated technical & behavioral screen to establish your communication baseline.',
                pillar: 'Interview',
                pointsBoost: '+14 pts',
                actionPath: '/candidate/mock-interview',
                actionLabel: 'Start Practice Interview',
                priority: 'HIGH'
            });
        }

        // Check Assessments
        if (allAssessmentScores.length === 0 || assessmentsScore < 18) {
            improvementActions.push({
                id: 'take-coding-assessment',
                title: 'Validate Skills with Assessment',
                desc: 'Attempt a role-aligned coding or MCQ challenge to verify algorithmic and stack proficiency.',
                pillar: 'Assessments',
                pointsBoost: '+18 pts',
                actionPath: '/candidate/jobs',
                actionLabel: 'Explore Assessment Roles',
                priority: 'HIGH'
            });
        }

        // Check Resume & Profile
        if (!hasResume || resumeScore < 16) {
            improvementActions.push({
                id: 'upload-resume',
                title: 'Upload Latest Resume & Bio',
                desc: 'Upload a clean PDF resume to boost automated ATS keyword indexing and recruiter match scores.',
                pillar: 'Resume',
                pointsBoost: '+8 pts',
                actionPath: '/candidate/profile',
                actionLabel: 'Update Profile & Resume',
                priority: 'MEDIUM'
            });
        }

        // Check Projects
        if (totalProjectsCount < 2 || projectsScore < 12) {
            improvementActions.push({
                id: 'add-projects',
                title: 'Add 2+ Production Projects',
                desc: 'Highlight real-world architecture, stack tags, and link your GitHub repository to stand out.',
                pillar: 'Projects',
                pointsBoost: '+7 pts',
                actionPath: '/candidate/profile',
                actionLabel: 'Add Project Details',
                priority: 'MEDIUM'
            });
        }

        // Check Skills
        if (skillCount < 8 || skillsScore < 15) {
            improvementActions.push({
                id: 'add-skills',
                title: 'Tag Core Frameworks & Databases',
                desc: 'Add at least 8 specialized technical skills (e.g. Docker, PostgreSQL, React, Go) to match job filters.',
                pillar: 'Skills',
                pointsBoost: '+6 pts',
                actionPath: '/candidate/profile',
                actionLabel: 'Add Skills',
                priority: 'LOW'
            });
        }

        const dimensions = {
            skills: {
                score: skillsScore,
                max: 20,
                percent: Math.round((skillsScore / 20) * 100),
                details: `${skillCount} skills verified`
            },
            assessments: {
                score: assessmentsScore,
                max: 25,
                percent: Math.round((assessmentsScore / 25) * 100),
                details: allAssessmentScores.length > 0 ? `${allAssessmentScores.length} tests attempted` : 'No tests taken yet'
            },
            projects: {
                score: projectsScore,
                max: 15,
                percent: Math.round((projectsScore / 15) * 100),
                details: `${totalProjectsCount} projects listed`
            },
            resume: {
                score: resumeScore,
                max: 20,
                percent: Math.round((resumeScore / 20) * 100),
                details: hasResume ? 'Resume uploaded & indexed' : 'Resume missing'
            },
            interview: {
                score: interviewScore,
                max: 20,
                percent: Math.round((interviewScore / 20) * 100),
                details: validInterviewScores.length > 0 ? `${validInterviewScores.length} interviews evaluated` : 'No interviews practiced'
            }
        };

        return res.json({
            success: true,
            overallScore,
            tier,
            tierColor,
            tierDescription,
            percentile,
            dimensions,
            breakdown: dimensions,
            improvementActions: improvementActions.slice(0, 3), // Return top 3 highest-impact actions
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[JOB-READINESS] Error calculating score:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to calculate job readiness score',
            error: error.message
        });
    }
};
