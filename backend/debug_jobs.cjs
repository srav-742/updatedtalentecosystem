const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const jobSchema = new mongoose.Schema({
    title: String,
    recruiterId: mongoose.Schema.Types.ObjectId
});
const Job = mongoose.model('Job', jobSchema);

async function checkJobs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const jobs = await Job.find({});
        console.log('Total Jobs:', jobs.length);
        console.log('Jobs:', JSON.stringify(jobs, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkJobs();
