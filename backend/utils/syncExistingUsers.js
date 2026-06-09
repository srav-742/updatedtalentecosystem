require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { syncUserToProfile } = require('./dbSync');

const syncAll = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully!");

        const users = await User.find({});
        console.log(`Found ${users.length} total users in 'users' collection.`);

        let syncedCandidatesCount = 0;
        let syncedRecruitersCount = 0;

        for (const user of users) {
            console.log(`Syncing user: ${user.email} (role: ${user.role || 'seeker'})`);
            if (user.role === 'seeker') {
                await syncUserToProfile(user);
                syncedCandidatesCount++;
            } else if (user.role === 'recruiter') {
                await syncUserToProfile(user);
                syncedRecruitersCount++;
            } else {
                console.log(`Skipping admin/other user: ${user.email} (role: ${user.role})`);
            }
        }

        console.log(`\nSync completed!`);
        console.log(`Synced Candidates: ${syncedCandidatesCount}`);
        console.log(`Synced Recruiters: ${syncedRecruitersCount}`);
        
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
        process.exit(0);
    } catch (error) {
        console.error("Critical error during sync:", error);
        process.exit(1);
    }
};

syncAll();
