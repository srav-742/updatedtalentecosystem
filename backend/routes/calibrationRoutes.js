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
        const event = req.body;

        if (event.type === "BOOKING_CREATED") {
            const booking = event.payload;

            const email = booking.attendees[0].email;

            // Update existing lead to confirmed
            await LeadModel.findOneAndUpdate(
                { email },
                { bookingStatus: "Confirmed" }
            );

            // Store appointment
            await AppointmentModel.create({
                name: booking.attendees[0].name,
                email: booking.attendees[0].email,
                phone: booking.attendees[0].phone || "",
                eventType: booking.eventType.title,
                startTime: booking.startTime,
                endTime: booking.endTime,
                calEventId: booking.uid,
                status: "Confirmed",
                createdAt: new Date()
            });
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
});

module.exports = router;
