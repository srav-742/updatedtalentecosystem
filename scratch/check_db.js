const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const User = require('./backend/models/User');
const Application = require('./backend/models/Application');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const user = await User.findOne({ email: 'sravyadhadi@gmail.com' });
        if (user) {
            console.log("User Found:", {
                email: user.email,
                uid: user.uid,
                githubUrl: user.githubUrl,
                linkedinUrl: user.linkedinUrl
            });

            const apps = await Application.find({ applicantEmail: 'sravyadhadi@gmail.com' });
            console.log(`Found ${apps.length} applications for this email.`);
            apps.forEach(app => {
                console.log("Application:", {
                    id: app._id,
                    userId: app.userId,
                    applicantEmail: app.applicantEmail,
                    hasUserVirtual: !!app.user
                });
            });
        } else {
            console.log("User not found by email.");
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
