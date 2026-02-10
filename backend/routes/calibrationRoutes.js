const express = require('express');
const router = express.Router();
const LeadModel = require('../models/Lead');
const AppointmentModel = require('../models/Appointment');

// Route to Save Lead (Before Booking)
router.post("/save-calibration-lead", async (req, res) => {
    try {
        const {
            name, email, phone, company,
            role, hiringVolume, rolesHiringFor, primaryChallenge, calibrationGoal
        } = req.body;

        await LeadModel.create({
            name,
            email,
            phone,
            company,
            role,
            hiringVolume,
            rolesHiringFor,
            primaryChallenge,
            calibrationGoal,
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

        console.log("==== WEBHOOK RECEIVED ====");
        console.log("Trigger Event:", event.triggerEvent);

        // 🔥 Correct check
        if (event.triggerEvent === "BOOKING_CREATED") {
            const booking = event.payload;
            const attendee = booking.attendees[0];

            console.log("Booking for:", attendee.email);

            // 1️⃣ Update lead
            await LeadModel.findOneAndUpdate(
                { email: attendee.email },
                { bookingStatus: "Confirmed" }
            );

            // 2️⃣ Save appointment
            await AppointmentModel.create({
                name: attendee.name,
                email: attendee.email,
                eventType: booking.eventTitle,
                startTime: booking.startTime,
                endTime: booking.endTime,
                meetingLink: booking.location,
                calEventId: booking.uid,
                status: booking.status,
                createdAt: new Date()
            });

            console.log("✅ Appointment saved successfully");
        } else {
            console.log("Skipping event type:", event.triggerEvent);
        }

        res.status(200).send("OK");
    } catch (err) {
        console.error("Webhook error:", err);
        res.status(500).send("Error");
    }
});

module.exports = router;
