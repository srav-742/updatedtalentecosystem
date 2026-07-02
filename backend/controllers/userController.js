const User = require('../models/User');
const ResumeProfile = require('../models/ResumeProfile');
const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const mongoose = require('mongoose');


const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'email role');
        res.json(users);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Find user by UID, _id, or Email
        const user = await User.findOne({
            $or: [
                { uid: userId },
                { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null },
                { email: userId }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ─── SELF-HEALING UID SYNC ───
        // If the lookup parameter was a Firebase UID but it doesn't match what's in our DB,
        // it means the user has re-signed up or changed Firebase projects.
        if (userId && !mongoose.Types.ObjectId.isValid(userId) && !userId.includes('@') && user.uid !== userId) {
            const oldUid = user.uid;
            console.log(`[PROFILE-SYNC] Auto-migrating UID for ${user.email}: ${oldUid} -> ${userId}`);
            
            user.uid = userId;
            await user.save();

            const Job = require('../models/Job');
            const Application = require('../models/Application');
            const ResumeProfile = require('../models/ResumeProfile');

            await Job.updateMany({ recruiterId: oldUid }, { $set: { recruiterId: userId } });
            await Application.updateMany({ userId: oldUid }, { $set: { userId: userId } });
            await ResumeProfile.updateMany({ userId: oldUid }, { $set: { userId: userId } });
        }
        // ──────────────────────────────

        // ─── DYNAMIC SELF-HEALING RECRUITER STATUS ───
        if (user.role === 'recruiter') {
            const Transaction = require('../models/Transaction');
            const paidTransactions = await Transaction.countDocuments({
                userId: user._id,
                status: 'paid'
            });
            // Keep them Pro if they paid OR if they were manually updated to isPro = true
            const shouldBePro = paidTransactions > 0 || user.isPro === true;
            if (user.isPro !== shouldBePro || (shouldBePro && user.hiringPattern !== "Premium Recruiter") || (!shouldBePro && user.hiringPattern === "Premium Recruiter")) {
                user.isPro = shouldBePro;
                user.hiringPattern = shouldBePro ? "Premium Recruiter" : "";
                await user.save();
            }
        }
        // ─────────────────────────────────────────────


        const resumeProfile = await ResumeProfile.findOne({ userId: user.uid || String(user._id) }).lean();
        const mergedUser = user.toObject();

        if (resumeProfile) {
            mergedUser.resumeProfile = resumeProfile;
            mergedUser.phone = mergedUser.phone || resumeProfile?.basics?.phone || '';
            mergedUser.bio = mergedUser.bio || resumeProfile?.summary || '';
            mergedUser.skills = mergedUser.skills?.length ? mergedUser.skills : [
                ...(resumeProfile.skills?.programming || []),
                ...(resumeProfile.skills?.frameworks || []),
                ...(resumeProfile.skills?.databases || []),
                ...(resumeProfile.skills?.tools || []),
                ...(resumeProfile.skills?.soft || [])
            ];
            mergedUser.education = mergedUser.education?.length ? mergedUser.education : (resumeProfile.education || []).map((item) => ({
                institution: item.institution || '',
                degree: [item.degree, item.field].filter(Boolean).join(' - '),
                year: item.duration || item.score || ''
            }));
            mergedUser.experience = mergedUser.experience?.length ? mergedUser.experience : (resumeProfile.workExperience || []);
            mergedUser.languages = mergedUser.languages?.length ? mergedUser.languages : (resumeProfile.languages || []);
            mergedUser.projects = mergedUser.projects?.length ? mergedUser.projects : (resumeProfile.projects || []);
            mergedUser.professionalProfiles = mergedUser.professionalProfiles?.length
                ? mergedUser.professionalProfiles
                : (resumeProfile.professionalProfiles || []);
        }

        res.json(mergedUser);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        delete updateData._id;
        delete updateData.isPro;
        delete updateData.hiringPattern;
        let query = {};
        if (mongoose.Types.ObjectId.isValid(userId)) {
            query = { _id: userId };
        } else {
            if (updateData.email) {
                const existingUser = await User.findOne({ email: updateData.email });
                if (existingUser) {
                    if (existingUser.uid !== userId) {
                        existingUser.uid = userId;
                        await existingUser.save();
                    }
                    query = { _id: existingUser._id };
                } else {
                    query = { uid: userId };
                }
            } else {
                query = { uid: userId };
            }
        }
        const user = await User.findOneAndUpdate(query, updateData, { new: true, upsert: true });
        let clientCredentials = null;
        if (user) {
            const { syncUserToProfile } = require('../utils/dbSync');
            await syncUserToProfile(user);

            // Generate unique API Client Credentials for Recruiter if they don't exist yet
            if (user.role === 'recruiter') {
                const Client = require('../models/Client');
                const PlaintextClientCredential = require('../models/PlaintextClientCredential');
                const bcrypt = require('bcryptjs');
                
                const expectedClientId = `client_${user.uid || user._id}`;
                const existingClient = await Client.findOne({ clientId: expectedClientId });
                
                if (!existingClient) {
                    const clientSecretRaw = `h1p_sec_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
                    const hashedSecret = await bcrypt.hash(clientSecretRaw, 10);

                    const newClient = new Client({
                        clientId: expectedClientId,
                        clientSecret: hashedSecret,
                        name: `Client for Recruiter ${user.name || user.email}`,
                        description: `API Client for recruiter: ${user.email}`,
                        status: 'active'
                    });
                    await newClient.save();

                    const newPlaintext = new PlaintextClientCredential({
                        clientId: expectedClientId,
                        clientSecretRaw: clientSecretRaw,
                        name: `Client for Recruiter ${user.name || user.email}`,
                        description: `API Client for recruiter: ${user.email}`,
                        status: 'active'
                    });
                    await newPlaintext.save();
                    
                    clientCredentials = {
                        clientId: expectedClientId,
                        clientSecret: clientSecretRaw
                    };
                    
                    console.log(`[CLIENT-GENERATION] Generated API Client Credentials for Recruiter: ${user.email}`);
                }
            }
        }

        const isSeekerComplete = updateData.skills && updateData.skills.length > 3;
        const isRecruiterComplete = updateData.company && updateData.company.name && updateData.designation;
        
        const userObj = user.toObject();
        if (clientCredentials) {
            userObj.client = clientCredentials;
        }
        res.json(userObj);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};



const getAnalyticsData = async (req, res) => {
    try {
        const users = await User.find({}, 'name email role company designation skills phone isPro createdAt uid');
        
        const recruiters = users.filter(u => u.role === 'recruiter');
        const seekers = users.filter(u => u.role === 'seeker');
        
        // Fetch ResumeProfiles in one batch for seekers to enrich their location and skills
        const seekerUids = seekers.map(u => u.uid).filter(Boolean);
        const seekerIds = seekers.map(u => String(u._id));
        const resumeProfiles = await ResumeProfile.find({
            userId: { $in: [...seekerUids, ...seekerIds] }
        }).lean();

        // Create a fast lookup map
        const resumeProfileMap = new Map();
        for (const rp of resumeProfiles) {
            resumeProfileMap.set(rp.userId, rp);
        }

        const candidates = [];
        for (const s of seekers) {
            const candidateObj = s.toObject();
            const rp = resumeProfileMap.get(candidateObj.uid) || resumeProfileMap.get(String(candidateObj._id));
            
            // Enrich location from ResumeProfile
            candidateObj.location = rp?.basics?.location || '';
            
            // Enrich phone if not present in User
            candidateObj.phone = candidateObj.phone || rp?.basics?.phone || '';

            // Enrich skills from ResumeProfile if not present or empty in User
            if (!candidateObj.skills || candidateObj.skills.length === 0) {
                candidateObj.skills = rp ? [
                    ...(rp.skills?.programming || []),
                    ...(rp.skills?.frameworks || []),
                    ...(rp.skills?.databases || []),
                    ...(rp.skills?.tools || []),
                    ...(rp.skills?.soft || [])
                ] : [];
            }
            
            candidates.push(candidateObj);
        }
        
        // Sync to separate collections (as requested: store recruiters data separately and separate for candidate)
        for (const r of recruiters) {
            await Recruiter.findOneAndUpdate({ userId: r._id }, {
                name: r.name, email: r.email, phone: r.phone, company: r.company, designation: r.designation, isPro: r.isPro, createdAt: r.createdAt
            }, { upsert: true });
        }
        for (const c of candidates) {
            await Candidate.findOneAndUpdate({ userId: c._id }, {
                name: c.name,
                email: c.email,
                phone: c.phone,
                skills: c.skills,
                location: c.location,
                createdAt: c.createdAt
            }, { upsert: true });
        }

        res.json({
            recruiters,
            candidates,
            stats: {
                totalRecruiters: recruiters.length,
                totalCandidates: candidates.length,
            }
        });
    } catch (error) {
        console.error("[GET-ANALYTICS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const addUser = async (req, res) => {
    try {
        const { name, email, role, phone, designation, companyName, skills, location } = req.body;
        const newUser = new User({
            name, email, role, phone, designation, company: { name: companyName }, skills, location,
            uid: new mongoose.Types.ObjectId().toString(), // Generate a fake uid since they are added manually
        });
        await newUser.save();
        
        const { syncUserToProfile } = require('../utils/dbSync');
        await syncUserToProfile(newUser);
        
        res.json(newUser);
    } catch (error) {
        console.error("[ADD-USER] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (user) {
            if (user.role === 'recruiter') await Recruiter.deleteOne({ userId: user._id });
            if (user.role === 'seeker') await Candidate.deleteOne({ userId: user._id });
            await User.findByIdAndDelete(userId);
        }
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("[DELETE-USER] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getSampleSeekers = async (req, res) => {
    try {
        const seekers = await User.find({ role: 'seeker' }, '-password');
        res.json(seekers);
    } catch (error) {
        console.error("[GET-SAMPLE-SEEKERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllUsers, getUserProfile, updateUserProfile, getSampleSeekers, getAnalyticsData, addUser, deleteUser };
