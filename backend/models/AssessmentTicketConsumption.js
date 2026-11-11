const mongoose = require('mongoose');

const assessmentTicketConsumptionSchema = new mongoose.Schema({
    recruiterId: { 
        type: String, 
        required: true, 
        index: true,
        trim: true 
    },
    jobId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job', 
        required: true, 
        index: true 
    },
    candidateId: { 
        type: String, 
        required: true, 
        index: true,
        trim: true 
    },
    candidateEmail: { 
        type: String, 
        lowercase: true, 
        trim: true,
        default: '' 
    },
    applicationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Application', 
        required: true, 
        index: true 
    },
    transactionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'TicketTransaction',
        default: null 
    },
    consumedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { 
    timestamps: true 
});

// Compound unique indexes: exactly one ticket consumed per candidate per job
assessmentTicketConsumptionSchema.index({ jobId: 1, applicationId: 1 }, { unique: true });
assessmentTicketConsumptionSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('AssessmentTicketConsumption', assessmentTicketConsumptionSchema);

