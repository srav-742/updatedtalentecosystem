const User = require('../models/User');
const ResumeProfile = require('../models/ResumeProfile');
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

        const isSeekerComplete = updateData.skills && updateData.skills.length > 3;
        const isRecruiterComplete = updateData.company && updateData.company.name && updateData.designation;
        res.json(user);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};



const getSampleSeekers = async (req, res) => {
    try {
        const seekers = await User.find({ role: 'seeker' }, 'name skills experience bio profilePic education designation')
            .limit(6);
        res.json(seekers);
    } catch (error) {
        console.error("[GET-SAMPLE-SEEKERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllUsers, getUserProfile, updateUserProfile, getSampleSeekers };
