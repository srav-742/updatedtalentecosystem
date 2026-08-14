require('dotenv').config({ override: true });
const connectDB = require('./config/db');
const Application = require('./models/Application');
const InterviewSession = require('./models/InterviewSession');
const { sanitizeTranscript } = require('./utils/transcriptSanitizer');

async function cleanAllTranscripts() {
    try {
        console.log('[MIGRATION] Connecting to MongoDB...');
        await connectDB();
        
        console.log('[MIGRATION] Fetching all Applications with interview answers...');
        const applications = await Application.find({ 'interviewAnswers.0': { $exists: true } });
        console.log(`[MIGRATION] Found ${applications.length} applications to inspect.`);

        let updatedAppsCount = 0;
        let cleanedAnswersCount = 0;

        for (const app of applications) {
            let appModified = false;
            if (Array.isArray(app.interviewAnswers)) {
                for (let i = 0; i < app.interviewAnswers.length; i++) {
                    const original = app.interviewAnswers[i].answer || '';
                    if (original) {
                        const cleaned = sanitizeTranscript(original);
                        if (cleaned !== original) {
                            console.log(`[MIGRATION] App ID ${app._id} Q${i + 1}:\n  Original: "${original}"\n  Cleaned:  "${cleaned}"`);
                            app.interviewAnswers[i].answer = cleaned;
                            appModified = true;
                            cleanedAnswersCount++;
                        }
                    }
                }
            }
            if (appModified) {
                app.markModified('interviewAnswers');
                await app.save();
                updatedAppsCount++;
            }
        }

        console.log(`[MIGRATION] Also inspecting active InterviewSessions...`);
        const sessions = await InterviewSession.find({ 'answerEvaluations.0': { $exists: true } });
        let updatedSessionsCount = 0;

        for (const session of sessions) {
            let sessionModified = false;
            if (Array.isArray(session.answerEvaluations)) {
                for (let i = 0; i < session.answerEvaluations.length; i++) {
                    const original = session.answerEvaluations[i].answer || '';
                    if (original) {
                        const cleaned = sanitizeTranscript(original);
                        if (cleaned !== original) {
                            session.answerEvaluations[i].answer = cleaned;
                            sessionModified = true;
                        }
                    }
                }
            }
            if (Array.isArray(session.history)) {
                for (let i = 0; i < session.history.length; i++) {
                    if (session.history[i].role === 'candidate') {
                        const original = session.history[i].content || '';
                        if (original) {
                            const cleaned = sanitizeTranscript(original);
                            if (cleaned !== original) {
                                session.history[i].content = cleaned;
                                sessionModified = true;
                            }
                        }
                    }
                }
            }
            if (sessionModified) {
                session.markModified('answerEvaluations');
                session.markModified('history');
                await session.save();
                updatedSessionsCount++;
            }
        }

        console.log(`\n==================================================`);
        console.log(`[MIGRATION SUCCESS] Cleaned ${cleanedAnswersCount} candidate answers across ${updatedAppsCount} applications and ${updatedSessionsCount} sessions.`);
        console.log(`==================================================\n`);

        process.exit(0);
    } catch (err) {
        console.error('[MIGRATION ERROR]:', err);
        process.exit(1);
    }
}

cleanAllTranscripts();
