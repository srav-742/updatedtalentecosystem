const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    company: String,
    source: String,
    bookingStatus: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);
