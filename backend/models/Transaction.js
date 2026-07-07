const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    paymentId: { type: String, default: null, index: true },
    signature: { type: String, default: null },
    amount: { type: Number, required: true }, // in Paisa
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
    type: { type: String, enum: ['premium_upgrade', 'wallet_topup', 'applicant_unlock'], default: 'premium_upgrade', index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    receipt: { type: String, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
