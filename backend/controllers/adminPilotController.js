const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');
const User = require('../models/User');
const Recruiter = require('../models/Recruiter');
const Client = require('../models/Client');
const PlaintextClientCredential = require('../models/PlaintextClientCredential');
const { syncUserToProfile } = require('../utils/dbSync');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'sravyadhadi@gmail.com', 'admin@hire1percent.com', 'hemangi@web3today.io'];

/**
 * Validates whether the authenticated request user is an authorized Admin.
 */
const isAuthorizedAdmin = (req) => {
    if (!req.user) return false;
    if (req.user.role === 'admin') return true;
    if (req.user.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase().trim())) return true;
    return false;
};

/**
 * Creates a temporary Pilot Recruiter Account.
 * Role is strictly enforced to 'recruiter'.
 * Account type is strictly 'pilot'.
 * Duration must be an integer between 1 and 10 days.
 * Expiration is strictly calculated server-side.
 */
const createPilotAccount = async (req, res) => {
    // 1. Double-check Admin Authorization
    if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Only authorized administrators can create pilot accounts."
        });
    }

    const { email, password, durationDays, name, companyName } = req.body;

    // 2. Validate Email
    if (!email || typeof email !== 'string') {
        return res.status(400).json({
            success: false,
            message: "Email is required."
        });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({
            success: false,
            message: "Invalid email format. Please provide a valid email address."
        });
    }

    // 3. Validate Password (minimum 6 characters as required by Firebase)
    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            success: false,
            message: "Password is required."
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters long."
        });
    }

    // 4. Validate Duration (1 to 10 days, integer only)
    if (durationDays === null || durationDays === undefined || durationDays === '') {
        return res.status(400).json({
            success: false,
            message: "Duration is required. Please select between 1 and 10 days."
        });
    }

    const parsedDuration = Number(durationDays);
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 10) {
        return res.status(400).json({
            success: false,
            message: "Duration must be an integer between 1 and 10 days."
        });
    }

    // 5. Check if user already exists in MongoDB
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: "A user with this email already exists."
        });
    }

    // 6. Calculate server-side authoritative expiration date
    const now = new Date();
    const pilotExpiresAt = new Date(now.getTime() + parsedDuration * 24 * 60 * 60 * 1000);

    // 7. Create Firebase Auth user
    let firebaseUid = null;
    let createdViaAdminSdk = false;

    try {
        if (admin && admin.apps && admin.apps.length > 0) {
            try {
                const fbUser = await admin.auth().createUser({
                    email: normalizedEmail,
                    password: password,
                    displayName: name ? String(name).trim() : normalizedEmail.split('@')[0],
                    emailVerified: true // Admin-provisioned: immediately verified, no verification email sent
                });
                firebaseUid = fbUser.uid;
                createdViaAdminSdk = true;
                console.log(`[PILOT-CREATION] Firebase user created via Admin SDK: ${firebaseUid} for ${normalizedEmail}`);
            } catch (fbErr) {
                if (fbErr.code === 'auth/email-already-exists') {
                    return res.status(400).json({
                        success: false,
                        message: "A user with this email already exists."
                    });
                }
                console.error("[PILOT-CREATION] Firebase Admin SDK creation failed:", fbErr.message);
                throw fbErr;
            }
        } else {
            // Fallback for environments where service account file is not loaded
            try {
                const axios = require('axios');
                const firebaseApiKey = process.env.FIREBASE_API_KEY || "AIzaSyDd3YaduiL4mjuv6kNErlqkILfiAGuUh4o";
                const restRes = await axios.post(
                    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
                    {
                        email: normalizedEmail,
                        password: password,
                        returnSecureToken: true
                    }
                );
                firebaseUid = restRes.data.localId;
                console.log(`[PILOT-CREATION] Firebase user created via REST API: ${firebaseUid} for ${normalizedEmail}`);
            } catch (restErr) {
                const errMessage = restErr.response?.data?.error?.message;
                if (errMessage === 'EMAIL_EXISTS') {
                    return res.status(400).json({
                        success: false,
                        message: "A user with this email already exists."
                    });
                }
                // Fallback deterministic UID in offline/isolated testing
                firebaseUid = `pilot_${new mongoose.Types.ObjectId().toString()}`;
                console.warn(`[PILOT-CREATION] Fallback UID used: ${firebaseUid}`);
            }
        }
    } catch (authError) {
        console.error("[PILOT-CREATION] Firebase creation error:", authError);
        return res.status(500).json({
            success: false,
            message: `Failed to create authentication credentials: ${authError.message}`
        });
    }

    // 8. Atomic MongoDB Creation & Synchronization
    let savedUser = null;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const displayName = name ? String(name).trim() : normalizedEmail.split('@')[0];
        const company = companyName ? String(companyName).trim() : 'Pilot Partner';

        savedUser = new User({
            uid: firebaseUid,
            name: displayName,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'recruiter', // Enforced server-side: NEVER candidate or admin
            accountType: 'pilot', // Enforced server-side
            pilotExpiresAt: pilotExpiresAt,
            company: {
                name: company,
                description: 'Temporary Pilot Recruiter Account'
            },
            designation: 'Recruiter (Pilot)',
            createdAt: now
        });

        await savedUser.save();

        // Sync to Recruiter collection
        await syncUserToProfile(savedUser);

        // Generate API Client Credentials for the recruiter (same as existing normal recruiters)
        const expectedClientId = `client_${savedUser.uid || savedUser._id}`;
        const existingClient = await Client.findOne({ clientId: expectedClientId });
        if (!existingClient) {
            const clientSecretRaw = `h1p_sec_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
            const hashedSecret = await bcrypt.hash(clientSecretRaw, 10);

            await Client.create({
                clientId: expectedClientId,
                clientSecret: hashedSecret,
                name: `Client for Pilot Recruiter ${savedUser.name || savedUser.email}`,
                description: `API Client for pilot recruiter: ${savedUser.email}`,
                status: 'active'
            });

            await PlaintextClientCredential.create({
                clientId: expectedClientId,
                clientSecretRaw: clientSecretRaw,
                name: `Client for Pilot Recruiter ${savedUser.name || savedUser.email}`,
                description: `API Client for pilot recruiter: ${savedUser.email}`,
                status: 'active'
            });
        }

        console.log(`[PILOT-CREATION] ✅ Pilot Recruiter created successfully: ${normalizedEmail} (Expires: ${pilotExpiresAt.toISOString()})`);

        return res.status(201).json({
            success: true,
            message: "Pilot recruiter account created successfully.",
            pilotAccount: {
                id: savedUser._id,
                uid: savedUser.uid,
                email: savedUser.email,
                name: savedUser.name,
                role: 'recruiter',
                accountType: 'pilot',
                company: savedUser.company?.name,
                durationDays: parsedDuration,
                createdAt: savedUser.createdAt,
                pilotExpiresAt: savedUser.pilotExpiresAt,
                status: 'ACTIVE'
            }
        });

    } catch (dbError) {
        console.error("[PILOT-CREATION] Database creation failed, rolling back:", dbError.message);

        // Compensation / Rollback: Delete the Firebase user so no orphaned auth user remains
        if (createdViaAdminSdk && admin && admin.apps.length > 0 && firebaseUid) {
            try {
                await admin.auth().deleteUser(firebaseUid);
                console.log(`[PILOT-ROLLBACK] Deleted Firebase user: ${firebaseUid}`);
            } catch (rbErr) {
                console.error("[PILOT-ROLLBACK] Failed to delete Firebase user during rollback:", rbErr.message);
            }
        }

        // Clean up partial MongoDB records
        if (savedUser && savedUser._id) {
            await User.findByIdAndDelete(savedUser._id).catch(() => {});
            await Recruiter.deleteOne({ userId: savedUser._id }).catch(() => {});
        }

        return res.status(500).json({
            success: false,
            message: `Failed to create pilot account profile: ${dbError.message}`
        });
    }
};

/**
 * Retrieves all Pilot Recruiter Accounts for the Admin Dashboard.
 */
const getPilotAccounts = async (req, res) => {
    if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Only authorized administrators can view pilot accounts."
        });
    }

    try {
        const users = await User.find(
            { role: 'recruiter', accountType: 'pilot' },
            'name email role accountType company designation pilotExpiresAt createdAt uid'
        ).sort({ createdAt: -1 }).lean();

        const now = new Date();
        const pilotAccounts = users.map((user) => {
            const expiresAt = user.pilotExpiresAt ? new Date(user.pilotExpiresAt) : null;
            const isExpired = expiresAt ? now > expiresAt : false;
            const msRemaining = expiresAt ? Math.max(0, expiresAt.getTime() - now.getTime()) : 0;
            const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
            const hoursRemaining = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            return {
                id: user._id,
                uid: user.uid,
                email: user.email,
                name: user.name,
                role: user.role,
                accountType: user.accountType,
                company: user.company?.name || '',
                designation: user.designation || '',
                createdAt: user.createdAt,
                pilotExpiresAt: user.pilotExpiresAt,
                status: isExpired ? 'EXPIRED' : 'ACTIVE',
                daysRemaining,
                hoursRemaining
            };
        });

        return res.json({
            success: true,
            count: pilotAccounts.length,
            pilotAccounts
        });
    } catch (error) {
        console.error("[GET-PILOT-ACCOUNTS] Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Deletes a Pilot Recruiter Account and its Firebase credentials.
 */
const deletePilotAccount = async (req, res) => {
    if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: Only authorized administrators can delete pilot accounts."
        });
    }

    try {
        const { userId } = req.params;
        let user;

        if (mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId);
        } else {
            user = await User.findOne({ $or: [{ uid: userId }, { email: userId.toLowerCase().trim() }] });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Pilot account not found."
            });
        }

        if (user.accountType !== 'pilot') {
            return res.status(400).json({
                success: false,
                message: "This account is not a pilot account. Normal accounts must be managed through standard user administration."
            });
        }

        // Delete from Firebase Auth if UID exists and Admin SDK is initialized
        if (user.uid && admin && admin.apps.length > 0) {
            try {
                await admin.auth().revokeRefreshTokens(user.uid);
                await admin.auth().deleteUser(user.uid);
                console.log(`[DELETE-PILOT] Revoked tokens and deleted Firebase auth record: ${user.uid}`);
            } catch (fbErr) {
                console.warn("[DELETE-PILOT] Firebase delete warning:", fbErr.message);
            }
        }

        // Delete from MongoDB
        const recruiterConditions = [{ userId: user._id }];
        if (user.email) {
            recruiterConditions.push({ email: user.email.toLowerCase().trim() });
        }
        await Recruiter.deleteMany({ $or: recruiterConditions }).catch(err => {
            console.warn("[DELETE-PILOT] Recruiter cleanup warning:", err.message);
        });

        const clientId = `client_${user.uid || user._id}`;
        await Client.deleteOne({ clientId }).catch(() => {});
        await PlaintextClientCredential.deleteOne({ clientId }).catch(() => {});

        const userConditions = [{ _id: user._id }];
        if (user.uid) {
            userConditions.push({ uid: user.uid });
        }
        if (user.email) {
            userConditions.push({ email: user.email.toLowerCase().trim() });
        }
        await User.deleteMany({ $or: userConditions }).catch(err => {
            console.warn("[DELETE-PILOT] User cleanup warning:", err.message);
        });

        console.log(`[DELETE-PILOT] Deleted pilot account: ${user.email}`);

        return res.json({
            success: true,
            message: "Pilot account deleted successfully."
        });
    } catch (error) {
        console.error("[DELETE-PILOT] Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createPilotAccount,
    getPilotAccounts,
    deletePilotAccount
};
