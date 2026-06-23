const mongoose = require('mongoose');

const clientRoleSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true }
}, { timestamps: true });

// Prevent duplicate client-role mappings
clientRoleSchema.index({ client: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('ClientRole', clientRoleSchema);
