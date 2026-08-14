const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, index: true }, // e.g. 'admin', 'chairman', 'chairperson', 'user', 'seeker', 'recruiter'
    description: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
