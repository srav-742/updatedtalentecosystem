const User = require('../models/User');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');

const seedAdmin = async () => {
    const adminAccounts = [
        { email: 'sravyadhadi@gmail.com', name: 'Sravya', password: 'Sravya@123' },
        { email: 'hemangi@web3today.io', name: 'Hemangi', password: 'hemangi@123' }
    ];

    for (const account of adminAccounts) {
        try {
            const { email: adminEmail, password: adminPassword, name: adminName } = account;

            // 1. Firebase Check & Create/Update (Primary Authority)
            let firebaseUid = null;
            if (admin.apps.length > 0) {
                try {
                    const fbUser = await admin.auth().getUserByEmail(adminEmail);
                    firebaseUid = fbUser.uid;
                    
                    // Force password update if needed to ensure login works
                    await admin.auth().updateUser(firebaseUid, {
                        password: adminPassword,
                        displayName: adminName
                    });
                    console.log(`[SEED] Updated Firebase credentials for: ${adminEmail}`);
                } catch (e) {
                    if (e.code === 'auth/user-not-found') {
                        const newUser = await admin.auth().createUser({
                            email: adminEmail,
                            password: adminPassword,
                            displayName: adminName
                        });
                        firebaseUid = newUser.uid;
                        console.log(`[SEED] Created new Firebase account for: ${adminEmail}`);
                    } else {
                        throw e;
                    }
                }
            }

            // 2. MongoDB Check & Sync
            const existingAdmin = await User.findOne({ email: adminEmail });
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            if (!existingAdmin) {
                const adminUser = new User({
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    uid: firebaseUid || 'admin-pending-sync'
                });

                await adminUser.save();
                console.log(`[SEED] Created Admin record in MongoDB: ${adminEmail}`);
            } else {
                // Update existing record to match Firebase and Roles
                existingAdmin.role = 'admin';
                existingAdmin.password = hashedPassword;
                if (firebaseUid) existingAdmin.uid = firebaseUid;
                await existingAdmin.save();
                console.log(`[SEED] Synced Admin record for: ${adminEmail}`);
            }
        } catch (error) {
            console.error(`[SEED] Critical failure for ${account.email}:`, error.message);
        }
    }
};

module.exports = seedAdmin;

