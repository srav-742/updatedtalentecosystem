const Community = require('../models/Community');

// Get community details
const getCommunity = async (req, res) => {
    try {
        let community = await Community.findOne();
        
        // Seed if not exists
        if (!community) {
            community = new Community({
                benefits: [
                    { title: 'AMA Sessions', description: 'Ask Me Anything sessions with top founders and recruiters.', icon: 'MessageSquare' },
                    { title: 'Workshops', description: 'Deep-dive workshops on interview skills and high-impact engineering.', icon: 'Terminal' },
                    { title: 'VC Introductions', description: 'Direct introductions to VCs for candidates building their own startups.', icon: 'Briefcase' }
                ],
                amaSessions: [
                    { title: 'De-mystifying the VC world', date: new Date(Date.now() + 86400000 * 7), speaker: 'Sarah Jane (VC at First Round)' }
                ]
            });
            await community.save();
        }
        
        res.json(community);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update community details (Admin/Recruiter only)
const updateCommunity = async (req, res) => {
    try {
        const { name, description, platform, invitationLink, benefits, amaSessions } = req.body;
        
        const community = await Community.findOneAndUpdate(
            {}, 
            { name, description, platform, invitationLink, benefits, amaSessions, updatedAt: Date.now() },
            { new: true, upsert: true }
        );
        
        res.json(community);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCommunity,
    updateCommunity
};
