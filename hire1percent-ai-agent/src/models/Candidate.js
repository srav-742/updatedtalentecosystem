const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({}, {
  strict: false
});

module.exports = mongoose.model(
  "Candidate",
  candidateSchema,
  "candidates"
);