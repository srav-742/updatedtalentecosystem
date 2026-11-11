const mongoose = require('mongoose');

const ticketTransactionSchema = new mongoose.Schema({
    recruiterId: { 
        type: String, 
        required: true, 
        index: true,
        trim: true 
    },
    candidateId: { 
        type: String, 
        index: true,
        default: null 
    },
    jobId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job', 
        index: true,
        default: null 
    },
    jobTitle: {
        type: String,
        default: ''
    },
    applicationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Application', 
        index: true,
        default: null 
    },
    type: { 
        type: String, 
        enum: ['CREDIT', 'DEBIT', 'REFUND'], 
        required: true, 
        index: true 
    },
    quantity: { 
        type: Number, 
        required: true 
    },
    balanceBefore: { 
        type: Number, 
        required: true 
    },
    balanceAfter: { 
        type: Number, 
        required: true 
    },
    packageId: { 
        type: String,
        default: null 
    },
    amountPaid: { 
        type: Number,
        default: 0 
    },
    paymentOrderId: { 
        type: String, 
        index: true,
        default: null 
    },
    paymentId: { 
        type: String, 
        index: true,
        default: null 
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed', 'refunded'], 
        default: 'completed', 
        index: true 
    },
    notes: { 
        type: String,
        default: '' 
    },
    idempotencyKey: { 
        type: String, 
        unique: true, 
        sparse: true 
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('TicketTransaction', ticketTransactionSchema);

