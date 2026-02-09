const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    eventType: String,
    startTime: Date,
    endTime: Date,
    calEventId: String,
    status: { type: String, default: "Confirmed" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
