const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function listAllJobs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const jobs = await mongoose.connection.collection('jobs').find({}).toArray();
        console.log('Total Jobs:', jobs.length);
        jobs.forEach(j => console.log(`Job: ${j.title}, Recruiter: ${j.recruiterId}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listAllJobs();
