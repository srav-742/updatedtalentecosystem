const User = require('../models/User');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');

const seedAdmin = async () => {
    const adminAccounts = [
        { email: 'sravyadhadi@gmail.com', name: 'System Admin', password: 'Sravya@123' },
        { email: 'hemangi@web3today.io', name: 'Hemangi Admin', password: 'Sravya@123' }
    ];

    for (const account of adminAccounts) {
        try {
            const { email: adminEmail, password: adminPassword, name: adminName } = account;
            
            // 1. Ensure user exists in Firebase (if SDK is initialized)
            let firebaseUid = 'admin-default-uid';
            try {
                if (admin.apps.length > 0) {
                    let fbUser;
                    try {
                        fbUser = await admin.auth().getUserByEmail(adminEmail);
                        // console.log(`[SEED] Admin already exists in Firebase: ${adminEmail}`);
                    } catch (e) {
                        if (e.code === 'auth/user-not-found') {
                            fbUser = await admin.auth().createUser({
                                email: adminEmail,
                                password: adminPassword,
                                displayName: adminName
                            });
                            console.log(`[SEED] Created Admin in Firebase: ${adminEmail}`);
                        } else throw e;
                    }
                    firebaseUid = fbUser.uid;
                }
            } catch (fbErr) {
                // Silently skip Firebase if not configured
            }

            // 2. Ensure user exists in MongoDB
            const existingAdmin = await User.findOne({ email: adminEmail });
            
            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                const adminUser = new User({
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    uid: firebaseUid
                });
                
                await adminUser.save();
                console.log(`[SEED] Default Admin user created in MongoDB: ${adminEmail}`);
            } else {
                // Ensure role is admin and UID matches
                let updated = false;
                if (existingAdmin.role !== 'admin') {
                    existingAdmin.role = 'admin';
                    updated = true;
                }
                if (firebaseUid !== 'admin-default-uid' && existingAdmin.uid !== firebaseUid) {
                    existingAdmin.uid = firebaseUid;
                    updated = true;
                }
                if (updated) {
                    await existingAdmin.save();
                    console.log(`[SEED] Admin user ${adminEmail} updated to admin role.`);
                }
            }
        } catch (error) {
            console.error(`[SEED] Error seeding admin ${account.email}:`, error.message);
        }
    }
};

module.exports = seedAdmin;

