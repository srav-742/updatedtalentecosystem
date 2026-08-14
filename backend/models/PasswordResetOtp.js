const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        index: true 
    },
    otp: { 
        type: String, 
        required: true 
    },
    expiresAt: { 
        type: Date, 
        required: true, 
        index: { expiresAfterSeconds: 0 } // Automatically expires the document
    },
    verified: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
