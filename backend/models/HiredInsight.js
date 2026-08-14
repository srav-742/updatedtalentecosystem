const mongoose = require('mongoose');

const hiredInsightSchema = new mongoose.Schema({
    applicationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Application', 
        required: true,
        index: true 
    },
    recruiterId: { 
        type: String, 
        required: true,
        index: true 
    },
    month: { 
        type: String, 
        required: true,
        index: true 
    }, // Format: YYYY-MM
    githubStats: {
        commits: { type: Number, default: 0 },
        prs: { type: Number, default: 0 },
        avgDailyActivity: { type: Number, default: 0 }
    },
    productivityScore: { 
        type: Number, 
        default: 0 
    },
    retentionRisk: { 
        type: String, 
        enum: ['Low', 'Medium', 'High'], 
        default: 'Low' 
    },
    analysis: String,
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Ensure only one insight per candidate per month
hiredInsightSchema.index({ applicationId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('HiredInsight', hiredInsightSchema);
