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
        console.log("Cal.com Webhook Received at:", new Date().toISOString());
        console.log("Payload Type:", req.body.type);
        console.log("Full Payload:", JSON.stringify(req.body, null, 2));

        const event = req.body;

        if (event.type === "BOOKING_CREATED") {
            console.log("Processing BOOKING_CREATED event...");
            const booking = event.payload;

            const email = booking.attendees[0].email;
            console.log("Attendee Email:", email);

            // Update existing lead to confirmed
            const updatedLead = await LeadModel.findOneAndUpdate(
                { email },
                { bookingStatus: "Confirmed" },
                { new: true }
            );
            console.log("Updated Lead Result:", updatedLead ? "Success" : "Lead Not Found");

            // Store appointment
            const newAppointment = await AppointmentModel.create({
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
            console.log("Created Appointment ID:", newAppointment._id);
        } else {
            console.log("Skipping event type:", event.type);
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("WEBHOOK ERROR:", error);
        res.status(500).send("Error");
    }
});

module.exports = router;
