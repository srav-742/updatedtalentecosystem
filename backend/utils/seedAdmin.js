const User = require('../models/User');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');

const seedAdmin = async () => {
    const adminEmails = [
        'sravyadhadi@gmail.com',
        'hemangi@web3today.io'
    ];

    for (const email of adminEmails) {
        try {
            const user = await User.findOne({ email });
            
            if (user) {
                if (user.role !== 'admin') {
                    user.role = 'admin';
                    await user.save();
                    console.log(`[SEED] Granted Admin role to: ${email}`);
                }
            } else {
                // If user doesn't exist, we don't create them here because we don't have a password.
                // They can register themselves via the Admin Signup card in the UI.
            }
        } catch (error) {
            console.error(`[SEED] Error processing admin role for ${email}:`, error.message);
        }
    }
};

module.exports = seedAdmin;

