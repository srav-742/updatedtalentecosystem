const mongoose = require('mongoose');

const questionLogSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    skill: String,
    difficulty: String,
    category: String,
    hash: { type: String, unique: true, index: true },
    userId: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuestionLog', questionLogSchema);
