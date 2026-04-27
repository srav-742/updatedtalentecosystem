const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ALLOWED_ADMIN_EMAILS = ['sravyadhadi@gmail.com', 'hemangi@web3today.io'];


const syncUser = async (req, res) => {
    try {
        const { uid, email, name, profilePic, role } = req.body;
        
        // Find user by email first (primary anchor)
        let user = await User.findOne({ email });

        if (!user) {
            // New user - create them
            if (role === 'admin' && !ALLOWED_ADMIN_EMAILS.includes(email)) {
                return res.status(403).json({ message: "Unauthorized. Admin role is restricted." });
            }
            user = new User({ uid, email, name, profilePic, role: role || 'seeker' });
            await user.save();
        } else {
            // Check if someone is trying to sync to admin who shouldn't
            if (role === 'admin' && !ALLOWED_ADMIN_EMAILS.includes(email)) {
                return res.status(403).json({ message: "Unauthorized. Admin role is restricted." });
            }
            if (user.uid !== uid) {
                const oldUid = user.uid;
                console.log(`[AUTH-SYNC] Migrating UID for ${email}: ${oldUid} -> ${uid}`);
                
                user.uid = uid;
                if (profilePic && !user.profilePic) user.profilePic = profilePic;
                await user.save();

                // ─── CASCADE UID UPDATES (Data Rescue) ───
                const Job = require('../models/Job');
                const Application = require('../models/Application');
                const ResumeProfile = require('../models/ResumeProfile');

                // 1. Update jobs where this user is the recruiter
                const jobUpdate = await Job.updateMany({ recruiterId: oldUid }, { $set: { recruiterId: uid } });
                console.log(`[AUTH-SYNC] Rescued ${jobUpdate.modifiedCount} jobs from old UID`);

                // 2. Update applications where this user was the recruiter
                const appRecUpdate = await Application.updateMany({ recruiterId: oldUid }, { $set: { recruiterId: uid } });
                console.log(`[AUTH-SYNC] Rescued ${appRecUpdate.modifiedCount} recruiter-side applications`);

                // 3. Update applications submitted by this user as candidate
                const appSeekerUpdate = await Application.updateMany({ userId: oldUid }, { $set: { userId: uid } });
                console.log(`[AUTH-SYNC] Rescued ${appSeekerUpdate.modifiedCount} seeker-side applications`);

                // 4. Update resume profile
                await ResumeProfile.updateMany({ userId: oldUid }, { $set: { userId: uid } });
            } else {
                // UID is same, just update metadata if needed
                if (profilePic && !user.profilePic) {
                    user.profilePic = profilePic;
                    await user.save();
                }
            }
        }
        res.json(user);
    } catch (error) {
        console.error("[AUTH-SYNC] Critical Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

const signup = async (req, res) => {
    const start = Date.now();
    try {
        const { name, email, password, role } = req.body;
        console.log(`[AUTH-SIGNUP] Start for ${email}`);

        if (role === 'admin' && !ALLOWED_ADMIN_EMAILS.includes(email)) {
            return res.status(403).json({ message: "Unauthorized. Admin signup is restricted." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log(`[AUTH-SIGNUP] User already exists: ${email}`);
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();

        console.log(`[AUTH-SIGNUP] Success for ${email} in ${Date.now() - start}ms`);
        res.status(201).json({ message: "User created successfully", userId: user._id });
    } catch (error) {
        console.error(`[AUTH-SIGNUP] Error in ${Date.now() - start}ms:`, error.message);
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    const start = Date.now();
    try {
        const { email, password, role } = req.body;
        console.log(`[AUTH-LOGIN] Start for ${email}`);
        const user = await User.findOne({ email, role });
        if (!user) {
            console.log(`[AUTH-LOGIN] User not found: ${email} in ${Date.now() - start}ms`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[AUTH-LOGIN] Password mismatch: ${email} in ${Date.now() - start}ms`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        console.log(`[AUTH-LOGIN] Success for ${email} in ${Date.now() - start}ms`);
        res.json({ message: "Login successful", user });
    } catch (error) {
        console.error(`[AUTH-LOGIN] Error in ${Date.now() - start}ms:`, error.message);
        res.status(500).json({ message: error.message });
    }
};

const googleAuth = async (req, res) => {
    try {
        const { email, name, profilePic, role } = req.body;
        let user = await User.findOne({ email });
        if (user) {
            if (role === 'admin' && !ALLOWED_ADMIN_EMAILS.includes(email)) {
                return res.status(403).json({ message: "Unauthorized. Admin access is restricted." });
            }
            if (profilePic && (!user.profilePic || user.profilePic.startsWith('http'))) {
                user.profilePic = profilePic;
                await user.save();
            }
            return res.json({ message: "Login successful", user });
        } else {
            if (!role) return res.status(400).json({ message: "Role is required for first-time signup" });
            
            if (role === 'admin' && !ALLOWED_ADMIN_EMAILS.includes(email)) {
                return res.status(403).json({ message: "Unauthorized. Admin role is restricted." });
            }

            user = new User({ name, email, profilePic, role });
            await user.save();

            return res.json({ message: "Signup successful", user });
        }
    } catch (error) {
        console.error("[GOOGLE-AUTH] Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { syncUser, signup, login, googleAuth };
