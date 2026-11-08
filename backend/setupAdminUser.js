const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0';

async function setupAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');
        
        const adminUid = 'SQKunisKWhb49NUPKuk9R38iwQN2';
        let adminUser = await User.findOne({ uid: adminUid });
        
        if (!adminUser) {
            console.log('Admin user not found. Creating one...');
            adminUser = new User({
                uid: adminUid,
                name: 'System Admin',
                email: 'admin@hire1percent.com',
                role: 'admin'
            });
            await adminUser.save();
            console.log('Admin user created successfully.');
        } else {
            console.log('Admin user found. Updating role to admin...');
            adminUser.role = 'admin';
            await adminUser.save();
            console.log('Admin user role updated successfully.');
        }
        
        // Also let's check if there are any other admin users if the UI uses a different ID
        // The frontend fallback is SQKunisKWhb49NUPKuk9R38iwQN2
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

setupAdmin();
