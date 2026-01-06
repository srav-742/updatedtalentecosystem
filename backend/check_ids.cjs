const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collection = mongoose.connection.collection('jobs');
        const jobs = await collection.find({}).toArray();
        console.log('Total Jobs:', jobs.length);
        jobs.forEach(j => {
            console.log(`Job: ${j.title}, ID Type: ${typeof j.recruiterId}, Value: ${j.recruiterId}`);
            if (j.recruiterId instanceof mongoose.Types.ObjectId) {
                console.log('  Confirmed: ObjectId');
            } else {
                console.log('  WARNING: NOT an ObjectId');
            }
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkIds();
