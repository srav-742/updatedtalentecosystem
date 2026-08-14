const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    title: String,
    description: String,
    skills: [String],
    experienceLevel: String,
    assessment: {
        enabled: Boolean,
        passingScore: Number
    }
}, { strict: false });

module.exports = mongoose.model("Job", jobSchema, "jobs");
