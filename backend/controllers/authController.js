const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ALLOWED_ADMIN_EMAILS = ['sravyaadmin@gmail.com', 'hemangi@web3today.io'];


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
            // Check for role mismatch
            if (role && user.role !== role) {
                return res.status(400).json({ message: `This email is already registered as a ${user.role}. Please log in with that role.` });
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
            return res.status(400).json({ message: `This email is already registered as a ${existingUser.role}. Please log in with that role.` });
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
        const normalizedEmail = email ? email.toLowerCase().trim() : '';
        console.log(`[AUTH-LOGIN] Start for ${normalizedEmail}`);
        const user = await User.findOne({ email: normalizedEmail, role });
        if (!user) {
            const existingUserAnyRole = await User.findOne({ email: normalizedEmail });
            if (existingUserAnyRole) {
                console.log(`[AUTH-LOGIN] Role mismatch: ${normalizedEmail} tried ${role} but is ${existingUserAnyRole.role}`);
                return res.status(401).json({ message: `This email is registered as a ${existingUserAnyRole.role}. Please log in with that role.` });
            }
            console.log(`[AUTH-LOGIN] User not found: ${normalizedEmail} in ${Date.now() - start}ms`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[AUTH-LOGIN] Password mismatch: ${normalizedEmail} in ${Date.now() - start}ms`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        console.log(`[AUTH-LOGIN] Success for ${normalizedEmail} in ${Date.now() - start}ms`);
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
            if (role && user.role !== role) {
                return res.status(400).json({ message: `This email is already registered as a ${user.role}. Please log in with that role.` });
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

const forgotPassword = async (req, res) => {
    try {
        const { email, role } = req.body;
        if (!email || !role) {
            return res.status(400).json({ message: "Email and role are required" });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail, role });
        if (!user) {
            return res.status(404).json({ message: "No account found with this email and role" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordToken = otp;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins expiry
        await user.save();

        console.log(`\n==============================================`);
        console.log(`[AUTH-FORGOT] Generated OTP for ${normalizedEmail}: ${otp}`);
        console.log(`==============================================\n`);

        let emailSent = false;
        try {
            // Check if nodemailer can be dynamically loaded
            const nodemailer = require('nodemailer');
            if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_PORT === '465',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });
                await transporter.sendMail({
                    from: `"Talent Ecosystem Support" <${process.env.SMTP_USER}>`,
                    to: normalizedEmail,
                    subject: "Password Reset Verification Code",
                    text: `Your password reset verification code is: ${otp}. It will expire in 15 minutes.`,
                    html: `<div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; margin: auto; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff;">
                        <h2 style="color: #0f172a; margin-bottom: 8px;">Password Reset Request</h2>
                        <p style="color: #64748b; font-size: 14px;">You requested to reset your password on Talent Ecosystem. Please use the following 6-digit verification code:</p>
                        <div style="font-size: 32px; font-weight: bold; background: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; margin: 24px 0; color: #3b82f6; letter-spacing: 6px;">
                            ${otp}
                        </div>
                        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
                    </div>`
                });
                emailSent = true;
                console.log(`[AUTH-FORGOT] Email sent successfully to ${normalizedEmail}`);
            }
        } catch (mailErr) {
            console.warn("[AUTH-FORGOT] SMTP mailing skipped or nodemailer not installed:", mailErr.message);
        }

        const responseData = {
            message: emailSent 
                ? "A verification code has been sent to your email." 
                : "Reset code generated successfully."
        };

        // For local development or when SMTP is not configured, send OTP in the response
        if (process.env.NODE_ENV !== 'production' || !emailSent) {
            responseData.devOtp = otp;
        }

        res.json(responseData);
    } catch (error) {
        console.error("[AUTH-FORGOT] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, role, otp, newPassword } = req.body;
        if (!email || !role || !otp || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({
            email: normalizedEmail,
            role,
            resetPasswordToken: otp,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired verification code" });
        }

        // Hash new password using bcrypt
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        // Also update in Firebase Auth if user has a uid
        if (user.uid) {
            try {
                const admin = require('../config/firebase');
                if (admin && admin.apps.length > 0) {
                    await admin.auth().updateUser(user.uid, { password: newPassword });
                    console.log(`[AUTH-RESET] Firebase password successfully updated for: ${normalizedEmail}`);
                }
            } catch (fbErr) {
                console.warn("[AUTH-RESET] Failed to update Firebase password:", fbErr.message);
            }
        }

        console.log(`[AUTH-RESET] Password successfully reset for ${role}: ${normalizedEmail}`);
        res.json({ message: "Password reset successful! Please log in with your new password." });
    } catch (error) {
        console.error("[AUTH-RESET] Failure:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { syncUser, signup, login, googleAuth, forgotPassword, resetPassword };

