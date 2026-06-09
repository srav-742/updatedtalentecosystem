const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const ResumeProfile = require('../models/ResumeProfile');
const mongoose = require('mongoose');

/**
 * Synchronizes a User document's data to the Candidate or Recruiter collection
 * based on their role.
 * @param {string|mongoose.Types.ObjectId|object} userOrId - The User document or User's ID
 */
const syncUserToProfile = async (userOrId) => {
    try {
        let user = userOrId;
        if (typeof userOrId === 'string' || userOrId instanceof mongoose.Types.ObjectId) {
            user = await User.findById(userOrId);
        }
        
        if (!user) {
            console.warn(`[dbSync] Sync failed: User not found for ID: ${userOrId}`);
            return;
        }

        if (user.role === 'recruiter') {
            await Recruiter.findOneAndUpdate(
                { userId: user._id },
                {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    company: user.company,
                    designation: user.designation,
                    isPro: user.isPro,
                    createdAt: user.createdAt || new Date()
                },
                { upsert: true, new: true }
            );
            console.log(`[dbSync] Successfully synced Recruiter profile for User ${user.email}`);
        } else if (user.role === 'seeker') {
            // Seeker - Candidate Profile
            // Attempt to enrich with location from ResumeProfile
            const resumeProfile = await ResumeProfile.findOne({
                $or: [
                    { userId: user.uid },
                    { userId: String(user._id) }
                ]
            }).lean();

            const location = user.location || resumeProfile?.basics?.location || '';
            let skills = user.skills || [];
            if (!skills || skills.length === 0) {
                skills = resumeProfile ? [
                    ...(resumeProfile.skills?.programming || []),
                    ...(resumeProfile.skills?.frameworks || []),
                    ...(resumeProfile.skills?.databases || []),
                    ...(resumeProfile.skills?.tools || []),
                    ...(resumeProfile.skills?.soft || [])
                ] : [];
            }

            await Candidate.findOneAndUpdate(
                { userId: user._id },
                {
                    name: user.name,
                    email: user.email,
                    phone: user.phone || resumeProfile?.basics?.phone || '',
                    skills: skills,
                    location: location,
                    education: user.education || [],
                    experience: user.experience || [],
                    createdAt: user.createdAt || new Date()
                },
                { upsert: true, new: true }
            );
            console.log(`[dbSync] Successfully synced Candidate profile for User ${user.email}`);
        }
    } catch (error) {
        console.error(`[dbSync] Error syncing user to profile:`, error);
    }
};

module.exports = { syncUserToProfile };
