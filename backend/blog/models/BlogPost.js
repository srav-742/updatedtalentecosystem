const mongoose = require("mongoose");

const blogPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  subtitle: { type: String, trim: true },
  content: { type: String, required: true }, // Markdown content
  coverImage: { type: String }, // Cloudinary image URL
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory', required: true, index: true },
  tags: [{ type: String, index: true }],
  status: { 
    type: String, 
    enum: ["draft", "published", "scheduled", "archived"], 
    default: "draft",
    index: true 
  },
  publishedAt: { type: Date, default: Date.now },
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }]
  },
  views: { type: Number, default: 0 }
}, { timestamps: true });

// Add text index for optimized native text search
blogPostSchema.index({ title: "text", content: "text", subtitle: "text" });

module.exports = mongoose.models.BlogPost || mongoose.model("BlogPost", blogPostSchema);
