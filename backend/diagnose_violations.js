const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/db');

async function run() {
    try {
        await connectDB();
        console.log('Connected.\n');

        const db = mongoose.connection.db;

        // Get all jobs
        const jobs = await db.collection('jobs').find({}).toArray();
        console.log('=== ALL JOBS ===');
        jobs.forEach(j => {
            const hasCodingAssessment = !!j.codingAssessment;
            const codingEnabled = j.codingAssessment?.enabled;
            console.log(`  ${j.title} (${j._id}) | codingAssessment: ${hasCodingAssessment}, enabled: ${codingEnabled}`);
        });

        // For each job, check how many applications have codingAnswers
        console.log('\n=== CODING ANSWERS PER JOB ===');
        for (const job of jobs) {
            const withCoding = await db.collection('applications').countDocuments({
                jobId: job._id,
                'codingAnswers.0': { $exists: true }
            });
            const withCodingScore = await db.collection('applications').countDocuments({
                jobId: job._id,
                codingScore: { $exists: true, $ne: null }
            });
            const total = await db.collection('applications').countDocuments({ jobId: job._id });

            if (withCoding > 0 || withCodingScore > 0) {
                console.log(`  ${job.title}: ${withCoding}/${total} have codingAnswers, ${withCodingScore} have codingScore`);
                
                // Sample one to see what it looks like
                const sample = await db.collection('applications').findOne({
                    jobId: job._id,
                    'codingAnswers.0': { $exists: true }
                }, { projection: { applicantName: 1, codingScore: 1, 'codingAnswers.questionTitle': 1, 'codingAnswers.code': 1 } });
                
                if (sample) {
                    console.log(`    Sample: ${sample.applicantName}, codingScore: ${sample.codingScore}`);
                    if (sample.codingAnswers) {
                        sample.codingAnswers.forEach((a, i) => {
                            const hasCode = a.code && a.code.trim().length > 0;
                            console.log(`      Q${i+1}: "${a.questionTitle}" hasCode: ${hasCode}`);
                        });
                    }
                }
            } else {
                console.log(`  ${job.title}: NO coding data (${total} total apps)`);
            }
        }

        // Check which applications have codingScore set but shouldn't
        console.log('\n=== APPLICATIONS WITH codingScore BUT JOB HAS NO CODING ===');
        for (const job of jobs) {
            const hasCoding = job.codingAssessment?.enabled || false;
            if (!hasCoding) {
                const wrongApps = await db.collection('applications').find({
                    jobId: job._id,
                    $or: [
                        { 'codingAnswers.0': { $exists: true } },
                        { codingScore: { $exists: true, $ne: null, $gt: 0 } }
                    ]
                }, { projection: { applicantName: 1, codingScore: 1, 'codingAnswers': { $slice: 1 } } }).toArray();
                
                if (wrongApps.length > 0) {
                    console.log(`  JOB: "${job.title}" (no coding enabled) has ${wrongApps.length} apps with coding data:`);
                    wrongApps.forEach(a => {
                        const hasCodingAnswers = a.codingAnswers && a.codingAnswers.length > 0;
                        console.log(`    ${a.applicantName}: codingScore=${a.codingScore}, hasCodingAnswers=${hasCodingAnswers}`);
                    });
                }
            }
        }

        // Check the coding round data
        console.log('\n=== CODING ROUNDS ===');
        const codingRounds = await db.collection('codingrounds').find({}).toArray();
        codingRounds.forEach(cr => {
            console.log(`  CodingRound: jobId=${cr.jobId}, questions=${cr.questions?.length || 0}`);
        });

        // Check coding questions
        const codingQuestions = await db.collection('codingquestions').find({}).toArray();
        console.log(`\nTotal coding questions: ${codingQuestions.length}`);
        codingQuestions.forEach(cq => {
            console.log(`  ${cq.title} (${cq._id}) | jobId=${cq.jobId}, difficulty=${cq.difficulty}`);
        });

        await mongoose.disconnect();
        console.log('\nDone.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
run();
