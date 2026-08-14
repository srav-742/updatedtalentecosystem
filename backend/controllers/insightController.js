const HiredInsight = require('../models/HiredInsight');
const Application = require('../models/Application');
const axios = require('axios');

/**
 * Simulates or fetches GitHub activity for a user
 */
const getGitHubPulse = async (username) => {
    // In a real production app, we would use an Octokit instance with a token
    // For this context, we'll simulate a realistic response pattern
    // if a real username is provided, we could hit https://api.github.com/users/USERNAME/events
    
    const baseCommits = Math.floor(Math.random() * 40) + 10; // 10-50 commits
    const basePRs = Math.floor(Math.random() * 5) + 1;
    
    return {
        commits: baseCommits,
        prs: basePRs,
        avgDailyActivity: (baseCommits / 22).toFixed(1)
    };
};

/**
 * Calculates productivity and risk based on activity
 */
const calculateMetrics = (stats) => {
    const score = Math.min(100, (stats.commits * 1.5) + (stats.prs * 10));
    let risk = 'Low';
    let analysis = "Candidate is consistently contributing and meeting team benchmarks.";

    if (score < 40) {
        risk = 'High';
        analysis = "Significant drop in measurable activity detected. Potential attrition risk or onboarding friction.";
    } else if (score < 60) {
        risk = 'Medium';
        analysis = "Activity is slightly below historical average. Recommend a pulse check.";
    }

    return { score: Math.round(score), risk, analysis };
};

/**
 * Fetches all insights for a recruiter's hires
 */
const getRecruiterInsights = async (req, res) => {
    try {
        const { userId } = req.params; // Recruiter UID
        
        // Find all applications marked as HIRED for this recruiter's jobs
        // First, we need to know which jobs belong to this recruiter (done in common routes, but we'll do it here for isolation)
        const Application = require('../models/Application');
        const Job = require('../models/Job');
        
        const recruiterJobs = await Job.find({ recruiterId: userId });
        const jobIds = recruiterJobs.map(j => j._id);
        
        const hiredApps = await Application.find({ 
            jobId: { $in: jobIds },
            status: 'HIRED'
        }).populate('jobId');

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        const results = await Promise.all(hiredApps.map(async (app) => {
            // Check if we already have an insight for this month
            let insight = await HiredInsight.findOne({ applicationId: app._id, month: currentMonth });
            
            if (!insight) {
                // Generate a new one
                const stats = await getGitHubPulse(app.applicantName); // Simulated
                const metrics = calculateMetrics(stats);
                
                insight = new HiredInsight({
                    applicationId: app._id,
                    recruiterId: userId,
                    month: currentMonth,
                    githubStats: stats,
                    productivityScore: metrics.score,
                    retentionRisk: metrics.risk,
                    analysis: metrics.analysis
                });
                await insight.save();
            }

            return {
                id: insight._id,
                candidateName: app.applicantName,
                jobTitle: app.jobId?.title,
                profilePic: app.applicantPic,
                stats: insight.githubStats,
                score: insight.productivityScore,
                risk: insight.retentionRisk,
                analysis: insight.analysis,
                month: insight.month
            };
        }));

        res.json(results);
    } catch (error) {
        console.error("[Insights] Error:", error);
        res.status(500).json({ message: "Failed to fetch performance insights" });
    }
};

module.exports = {
    getRecruiterInsights
};
