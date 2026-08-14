const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate",
        required: true
    },
    role: {
        type: String,
        enum: ["user", "assistant", "system"],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("ConversationLog", conversationSchema, "conversation_logs");
