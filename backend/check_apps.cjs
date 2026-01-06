const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkApps() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const apps = await mongoose.connection.collection('applications').find({}).toArray();
        console.log('Total Applications:', apps.length);
        apps.forEach(a => console.log(`App: User ${a.userId}, Job ${a.jobId}, Status ${a.status}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkApps();
