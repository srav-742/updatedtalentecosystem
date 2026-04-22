const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
    name: { type: String, default: 'Hire1Percent Elite Club' },
    description: { type: String, default: 'The exclusive community for AI-vetted top 1% talent.' },
    platform: { type: String, enum: ['Slack', 'Discord'], default: 'Slack' },
    invitationLink: { type: String, default: '#' },
    benefits: [
        {
            title: String,
            description: String,
            icon: String
        }
    ],
    amaSessions: [
        {
            title: String,
            date: Date,
            speaker: String
        }
    ],
    isActive: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Community', communitySchema);
