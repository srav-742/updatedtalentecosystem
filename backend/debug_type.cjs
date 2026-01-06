const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkTypes() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collection = mongoose.connection.collection('jobs');
        const job = await collection.findOne({});
        if (job) {
            console.log('Job recruiterId type:', typeof job.recruiterId);
            console.log('Is instance of ObjectId:', job.recruiterId instanceof mongoose.Types.ObjectId);
            console.log('Value:', job.recruiterId);
        } else {
            console.log('No jobs found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTypes();
