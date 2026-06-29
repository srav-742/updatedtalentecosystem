const mongoose = require('mongoose');

const PlaintextClientCredentialSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true, index: true },
    clientSecretRaw: { type: String, required: true }, // Plain-text or encrypted client secret
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('PlaintextClientCredential', PlaintextClientCredentialSchema);
