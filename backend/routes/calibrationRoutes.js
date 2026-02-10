const express = require('express');
const router = express.Router();
const LeadModel = require('../models/Lead');
const AppointmentModel = require('../models/Appointment');

// Route to Save Lead (Before Booking)
router.post("/save-calibration-lead", async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        await LeadModel.create({
            name,
            email,
            phone,
            source: "Calibration Call",
            bookingStatus: "Pending",
            createdAt: new Date()
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to save lead" });
    }
});

// Webhook Route (After Booking)
router.post("/cal-webhook", async (req, res) => {
    try {
        console.log("===== WEBHOOK RECEIVED =====");
        console.log(JSON.stringify(req.body, null, 2));

        res.status(200).send("Webhook received");
    } catch (err) {
        console.error("Webhook error:", err);
        res.status(500).send("Error");
    }
});

module.exports = router;
