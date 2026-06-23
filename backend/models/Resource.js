const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    pathPattern: { type: String, required: true }, // e.g. '/api/jobs', '/api/recruiter/**'
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL'], default: 'ALL' },
    description: { type: String, default: '' },
    allowedRoles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: true });

// Ensure each path+method combo is unique
resourceSchema.index({ pathPattern: 1, method: 1 }, { unique: true });

module.exports = mongoose.model('Resource', resourceSchema);
