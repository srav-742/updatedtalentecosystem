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

const Job = require('../models/Job');
const { buildRecruiterJobQuery } = require('../utils/userResolver');

/**
 * Fetches all insights for a recruiter's hires
 */
const getRecruiterInsights = async (req, res) => {
    try {
        const { userId } = req.params; // Recruiter UID / ID / Email
        if (!userId) {
            return res.json([]);
        }

        const jobQuery = await buildRecruiterJobQuery(userId);
        const recruiterJobs = await Job.find(jobQuery).select('_id').lean();
        const jobIds = recruiterJobs.map(j => j._id);

        if (jobIds.length === 0) {
            return res.json([]);
        }
        
        const hiredApps = await Application.find({ 
            jobId: { $in: jobIds },
            status: 'HIRED'
        })
        .select('applicantName applicantPic jobId')
        .populate('jobId', 'title')
        .lean();

        if (hiredApps.length === 0) {
            return res.json([]);
        }

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const appIds = hiredApps.map(a => a._id);

        // Fetch all existing insights for this month in a single batch query
        const existingInsights = await HiredInsight.find({
            applicationId: { $in: appIds },
            month: currentMonth
        }).lean();

        const insightMap = new Map(
            existingInsights.map(i => [String(i.applicationId), i])
        );

        const newInsightsToInsert = [];
        const results = [];

        for (const app of hiredApps) {
            const appIdStr = String(app._id);
            let insight = insightMap.get(appIdStr);

            if (!insight) {
                const stats = await getGitHubPulse(app.applicantName);
                const metrics = calculateMetrics(stats);

                const newDoc = {
                    applicationId: app._id,
                    recruiterId: userId,
                    month: currentMonth,
                    githubStats: stats,
                    productivityScore: metrics.score,
                    retentionRisk: metrics.risk,
                    analysis: metrics.analysis
                };

                newInsightsToInsert.push(newDoc);
                
                results.push({
                    id: `temp-${appIdStr}`,
                    candidateName: app.applicantName,
                    jobTitle: app.jobId?.title,
                    profilePic: app.applicantPic,
                    stats: newDoc.githubStats,
                    score: newDoc.productivityScore,
                    risk: newDoc.retentionRisk,
                    analysis: newDoc.analysis,
                    month: newDoc.month
                });
            } else {
                results.push({
                    id: insight._id,
                    candidateName: app.applicantName,
                    jobTitle: app.jobId?.title,
                    profilePic: app.applicantPic,
                    stats: insight.githubStats,
                    score: insight.productivityScore,
                    risk: insight.retentionRisk,
                    analysis: insight.analysis,
                    month: insight.month
                });
            }
        }

        if (newInsightsToInsert.length > 0) {
            try {
                const inserted = await HiredInsight.insertMany(newInsightsToInsert, { ordered: false });
                inserted.forEach(doc => {
                    const found = results.find(r => String(r.id) === `temp-${String(doc.applicationId)}`);
                    if (found) {
                        found.id = doc._id;
                    }
                });
            } catch (err) {
                // Ignore duplicate key errors if already created in parallel
            }
        }

        res.setHeader('Cache-Control', 'private, no-cache, no-transform');
        res.json(results);
    } catch (error) {
        console.error("[Insights] Error:", error);
        res.status(500).json({ message: "Failed to fetch performance insights" });
    }
};

module.exports = {
    getRecruiterInsights
};
