require('dotenv').config();
const mongoose = require('mongoose');

async function updateRole() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = require('./models/User');
        const emailToUpdate = 'hemangi@web3today.io';

        const result = await User.updateOne(
            { email: emailToUpdate.toLowerCase() },
            { $set: { role: 'recruiter' } }
        );

        console.log(`Update result for ${emailToUpdate}:`, result);
    } catch (error) {
        console.error('Error updating role:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

updateRole();
