const mongoose = require("mongoose");

const blogCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.models.BlogCategory || mongoose.model("BlogCategory", blogCategorySchema);
