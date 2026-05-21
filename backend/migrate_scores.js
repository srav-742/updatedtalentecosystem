require('dotenv').config({ override: true });
const connectDB = require('./config/db');
const Application = require('./models/Application');
const AssessmentSubmission = require('./models/AssessmentSubmission');
const ResumeAnalysis = require('./models/ResumeAnalysis');

async function runMigration() {
    try {
        console.log('[MIGRATION] Connecting to MongoDB...');
        await connectDB();
        console.log('[MIGRATION] Database connected successfully.\n');

        // --- 1. Migrate Application collection ---
        console.log('[MIGRATION] Fetching all Applications...');
        const applications = await Application.find({});
        console.log(`[MIGRATION] Found ${applications.length} applications to process.`);

        let appUpdatedCount = 0;
        for (const app of applications) {
            let needsUpdate = false;
            const originalResume = app.resumeMatchPercent;
            const originalAssessment = app.assessmentScore;
            const originalInterview = app.interviewScore;
            const originalFinal = app.finalScore;

            // Scale resumeMatchPercent: formerly out of 20, now out of 10
            if (typeof app.resumeMatchPercent === 'number' && app.resumeMatchPercent !== null) {
                // If it is legacy (we scale it down)
                app.resumeMatchPercent = Math.round(app.resumeMatchPercent * 0.5);
                needsUpdate = true;
            }

            // Scale assessmentScore: formerly out of 30, now out of 20
            if (typeof app.assessmentScore === 'number' && app.assessmentScore !== null) {
                app.assessmentScore = Math.round((app.assessmentScore / 30) * 20);
                needsUpdate = true;
            }

            // Scale interviewScore: formerly out of 50, now out of 70
            if (typeof app.interviewScore === 'number' && app.interviewScore !== null) {
                app.interviewScore = Math.round((app.interviewScore / 50) * 70);
                needsUpdate = true;
            }

            if (needsUpdate) {
                // Recalculate finalScore
                app.finalScore = (app.resumeMatchPercent || 0) + (app.assessmentScore || 0) + (app.interviewScore || 0);
                
                // If the applicant is eligible or shortlisted, update status if needed
                if (app.finalScore >= 55 && app.status === 'APPLIED') {
                    app.status = 'SHORTLISTED';
                }

                await app.save();
                appUpdatedCount++;
                console.log(`[MIGRATION] Updated Application ID: ${app._id} (${app.applicantName || 'Unknown'}):`);
                console.log(`  - Resume Match:     ${originalResume} -> ${app.resumeMatchPercent} (/10)`);
                console.log(`  - Assessment Score: ${originalAssessment} -> ${app.assessmentScore} (/20)`);
                console.log(`  - Interview Score:  ${originalInterview} -> ${app.interviewScore} (/70)`);
                console.log(`  - Final Score:      ${originalFinal} -> ${app.finalScore} (/100)`);
                console.log(`  - Status:           ${app.status}\n`);
            }
        }
        console.log(`[MIGRATION] Completed Application migration. Updated ${appUpdatedCount} / ${applications.length} records.`);

        // --- 2. Migrate AssessmentSubmission collection ---
        console.log('\n[MIGRATION] Fetching all Assessment Submissions...');
        const submissions = await AssessmentSubmission.find({});
        console.log(`[MIGRATION] Found ${submissions.length} submissions to process.`);

        let submissionUpdatedCount = 0;
        for (const sub of submissions) {
            if (typeof sub.score === 'number' && sub.score !== null) {
                const originalScore = sub.score;
                sub.score = Math.round((sub.score / 30) * 20);
                await sub.save();
                submissionUpdatedCount++;
                console.log(`[MIGRATION] Updated AssessmentSubmission ID: ${sub._id} for User: ${sub.userId}:`);
                console.log(`  - Score: ${originalScore} -> ${sub.score} (/20)`);
            }
        }
        console.log(`[MIGRATION] Completed AssessmentSubmission migration. Updated ${submissionUpdatedCount} / ${submissions.length} records.`);

        // --- 3. Migrate ResumeAnalysis collection ---
        console.log('\n[MIGRATION] Fetching all Resume Analyses...');
        const analyses = await ResumeAnalysis.find({});
        console.log(`[MIGRATION] Found ${analyses.length} analyses to process.`);

        let analysisUpdatedCount = 0;
        for (const analysis of analyses) {
            if (typeof analysis.matchPercentage === 'number' && analysis.matchPercentage !== null) {
                const originalMatch = analysis.matchPercentage;
                analysis.matchPercentage = Math.round(analysis.matchPercentage * 0.5);
                
                // Keep skillsScore and experienceScore scaled out of 10 (they were already scaled out of 10 or 20 in some legacy scripts, let's keep them maxed at 10)
                if (typeof analysis.skillsScore === 'number' && analysis.skillsScore > 10) {
                    analysis.skillsScore = Math.round(analysis.skillsScore * 0.5);
                }
                if (typeof analysis.experienceScore === 'number' && analysis.experienceScore > 10) {
                    analysis.experienceScore = Math.round(analysis.experienceScore * 0.5);
                }

                await analysis.save();
                analysisUpdatedCount++;
                console.log(`[MIGRATION] Updated ResumeAnalysis ID: ${analysis._id} for User: ${analysis.userId}:`);
                console.log(`  - Match Percentage: ${originalMatch} -> ${analysis.matchPercentage} (/10)`);
            }
        }
        console.log(`[MIGRATION] Completed ResumeAnalysis migration. Updated ${analysisUpdatedCount} / ${analyses.length} records.`);

        console.log('\n[MIGRATION] Database score migration successfully complete!');
    } catch (error) {
        console.error('[MIGRATION] [ERROR] Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

runMigration();
