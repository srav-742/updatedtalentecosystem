const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    clientId: { type: String, required: true, unique: true, index: true },
    clientSecret: { type: String, required: true }, // Hashed with bcrypt
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: true, strictPopulate: false });

module.exports = mongoose.model('Client', clientSchema);
