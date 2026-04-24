const User = require('../models/User');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');

const seedAdmin = async () => {
    const adminAccounts = [
        { email: 'sravyadhadi@gmail.com', name: 'Sravya ', password: 'Sravya@123' },
        { email: 'hemangi@web3today.io', name: 'Hemangi ', password: 'hemangi@123' }
    ];

    for (const account of adminAccounts) {
        try {
            const { email: adminEmail, password: adminPassword, name: adminName } = account;

            // 1. Ensure user exists in MongoDB
            const existingAdmin = await User.findOne({ email: adminEmail });

            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                const adminUser = new User({
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    uid: 'admin-default-uid'
                });

                await adminUser.save();
                console.log(`[SEED] Default Admin user created in MongoDB: ${adminEmail}`);
            } else {
                // Ensure role is admin
                if (existingAdmin.role !== 'admin') {
                    existingAdmin.role = 'admin';
                    await existingAdmin.save();
                    console.log(`[SEED] Existing user ${adminEmail} upgraded to Admin role.`);
                }
            }

            // 2. Firebase check (if SDK is initialized)
            if (admin.apps.length > 0) {
                try {
                    await admin.auth().getUserByEmail(adminEmail);
                } catch (e) {
                    if (e.code === 'auth/user-not-found') {
                        await admin.auth().createUser({
                            email: adminEmail,
                            password: adminPassword,
                            displayName: adminName
                        });
                        console.log(`[SEED] Created Admin in Firebase: ${adminEmail}`);
                    }
                }
            }
        } catch (error) {
            console.error(`[SEED] Error processing admin ${account.email}:`, error.message);
        }
    }
};

module.exports = seedAdmin;

