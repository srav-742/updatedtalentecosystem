require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const admin = require('./config/firebase');

const MONGO_URI = 'mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0';

async function fixAdminUid() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const email = 'hemangi@web3today.io';
        let fbUser;
        try {
            fbUser = await admin.auth().getUserByEmail(email);
            console.log(`Found Firebase user for ${email} with UID: ${fbUser.uid}`);
        } catch (fbErr) {
            console.error('Firebase error:', fbErr.message);
            process.exit(1);
        }

        const user = await User.findOne({ email });
        if (user) {
            console.log(`Updating MongoDB uid for ${email} from ${user.uid} to ${fbUser.uid}`);
            user.uid = fbUser.uid;
            await user.save();
            console.log('Update successful for Hemangi!');
        } else {
            console.log('User not found in MongoDB');
        }

        const email2 = 'sravyaadmin@gmail.com';
        try {
            let fbUser2 = await admin.auth().getUserByEmail(email2);
            let user2 = await User.findOne({ email: email2 });
            if (user2) {
                console.log(`Updating MongoDB uid for ${email2} from ${user2.uid} to ${fbUser2.uid}`);
                user2.uid = fbUser2.uid;
                await user2.save();
                console.log('Update successful for Sravya!');
            }
        } catch (fbErr2) {
            console.log('Could not sync Sravya:', fbErr2.message);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fixAdminUid();
