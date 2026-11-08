const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0';

async function checkUser() {
    try {
        await mongoose.connect(MONGO_URI);
        const users = await User.find({ 
            email: { $in: ['hemangi@web3today.io', 'sravyaadmin@gmail.com', 'sravyadhadi@gmail.com'] }
        });
        
        console.log("All matching users by email:");
        users.forEach(u => {
            console.log(`Email: ${u.email}, UID: ${u.uid}, Role: ${u.role}, ID: ${u._id}`);
        });

        // Also check if any recent requests failed in the gateway
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkUser();
