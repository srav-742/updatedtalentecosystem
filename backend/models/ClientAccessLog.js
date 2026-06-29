const mongoose = require('mongoose');

const ClientAccessLogSchema = new mongoose.Schema({
    clientId: { type: String, required: true, index: true },
    clientSecretReceived: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    endpoint: { type: String },
    method: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ClientAccessLog', ClientAccessLogSchema);
