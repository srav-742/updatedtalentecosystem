const mongoose = require('mongoose');

const jobTicketAllocationSchema = new mongoose.Schema({
    jobId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job', 
        required: true 
    },
    jobTitle: { 
        type: String, 
        default: '' 
    },
    totalPurchased: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    totalConsumed: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    availableTickets: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    lastPurchasedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { _id: false });

const recruiterTicketWalletSchema = new mongoose.Schema({
    recruiterId: { 
        type: String, 
        required: true, 
        unique: true, 
        index: true,
        trim: true 
    },
    totalPurchased: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    totalConsumed: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    availableTickets: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    totalRefunded: { 
        type: Number, 
        default: 0, 
        min: 0 
    },
    jobs: {
        type: [jobTicketAllocationSchema],
        default: []
    },
    lastTransactionAt: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('RecruiterTicketWallet', recruiterTicketWalletSchema);
