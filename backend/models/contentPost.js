const mongoose = require("mongoose");

const contentSchema = new mongoose.Schema({
    source: String,
    topicTitle: String,
    url: String,
    generatedPost: String,
    status: {
        type: String,
        default: "draft"
    }
}, { timestamps: true });

module.exports = mongoose.models.ContentPost || mongoose.model("ContentPost", contentSchema);