const User = require('../models/User');
const Client = require('../models/Client');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');

const seedAdmin = async () => {
    const adminAccounts = [
        { email: 'sravyaadmin@gmail.com', name: 'Sravya', password: 'Sravya@123', fallbackUid: 'admin-sravya' },
        { email: 'hemangi@web3today.io', name: 'Hemangi', password: 'hemangi@123', fallbackUid: 'admin-hemangi' }
    ];

    for (const account of adminAccounts) {
        try {
            const { email: adminEmail, password: adminPassword, name: adminName, fallbackUid: adminFallbackUid } = account;

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
                    uid: firebaseUid || adminFallbackUid
                });

                await adminUser.save();
                console.log(`[SEED] Created Admin record in MongoDB: ${adminEmail}`);
            } else {
                // Update existing record to match Firebase and Roles
                existingAdmin.role = 'admin';
                existingAdmin.password = hashedPassword;
                // Update UID: use Firebase UID if available, else use stable fallback (never set to pending-sync)
                if (firebaseUid) {
                    existingAdmin.uid = firebaseUid;
                } else if (!existingAdmin.uid || existingAdmin.uid === 'admin-pending-sync') {
                    existingAdmin.uid = adminFallbackUid;
                }
                await existingAdmin.save();
                console.log(`[SEED] Synced Admin record for: ${adminEmail}`);
            }
        } catch (error) {
            console.error(`[SEED] Critical failure for ${account.email}:`, error.message);
        }
    }

    // 3. Seed default Gateway Client
    try {
        const defaultClient = {
            clientId: 'hire1percent_web_client',
            clientSecretRaw: 'h1p_secret_2026_gateway_key',
            name: 'Hire1Percent Web Client',
            description: 'Default web client for the Hire1Percent platform',
            status: 'active'
        };

        const existingClient = await Client.findOne({ clientId: defaultClient.clientId });
        if (!existingClient) {
            const hashedSecret = await bcrypt.hash(defaultClient.clientSecretRaw, 10);
            const client = new Client({
                clientId: defaultClient.clientId,
                clientSecret: hashedSecret,
                name: defaultClient.name,
                description: defaultClient.description,
                status: defaultClient.status
            });
            await client.save();
            console.log(`[SEED] Created default Client record in MongoDB: ${defaultClient.clientId}`);
        } else {
            const hashedSecret = await bcrypt.hash(defaultClient.clientSecretRaw, 10);
            existingClient.clientSecret = hashedSecret;
            existingClient.name = defaultClient.name;
            existingClient.status = defaultClient.status;
            await existingClient.save();
            console.log(`[SEED] Synced/Updated default Client record in MongoDB: ${defaultClient.clientId}`);
        }
    } catch (error) {
        console.error('[SEED] Failed to seed default client:', error.message);
    }

    // 4. Seed premium_recruiter role and /api/applications/recruiter/** resource restriction
    try {
        const Role = require('../models/Role');
        const Resource = require('../models/Resource');

        // Find or create 'admin' and 'premium_recruiter' roles
        const adminRole = await Role.findOne({ name: 'admin' });
        if (!adminRole) {
            console.warn('[SEED] Admin role not found. Ensure roles are initialized.');
        }

        let premiumRecruiterRole = await Role.findOne({ name: 'premium_recruiter' });
        if (!premiumRecruiterRole) {
            premiumRecruiterRole = new Role({
                name: 'premium_recruiter',
                description: 'Paid/pro recruiter with access to applicants'
            });
            await premiumRecruiterRole.save();
            console.log('[SEED] Created premium_recruiter role');
        }

        // Find or create resource mapping
        const pathPattern = '/api/applications/recruiter/**';
        const existingResource = await Resource.findOne({ pathPattern, method: 'GET' });

        const allowedRoles = [];
        if (premiumRecruiterRole) allowedRoles.push(premiumRecruiterRole._id);
        if (adminRole) allowedRoles.push(adminRole._id);

        let recruiterRole = await Role.findOne({ name: 'recruiter' });
        if (!recruiterRole) {
            recruiterRole = new Role({
                name: 'recruiter',
                description: 'Standard recruiter'
            });
            await recruiterRole.save();
            console.log('[SEED] Created recruiter role');
        }
        allowedRoles.push(recruiterRole._id);

        if (!existingResource) {
            const resource = new Resource({
                pathPattern,
                method: 'GET',
                description: 'Recruiter applications - premium only',
                allowedRoles
            });
            await resource.save();
            console.log('[SEED] Created premium applicants resource restriction');
        } else {
            existingResource.allowedRoles = allowedRoles;
            await existingResource.save();
            console.log('[SEED] Synced/Updated premium applicants resource restriction');
        }
    } catch (error) {
        console.error('[SEED] Failed to seed premium recruiter roles/resources:', error.message);
    }
};

module.exports = seedAdmin;

