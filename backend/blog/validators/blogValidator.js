const mongoose = require('mongoose');

class BlogValidator {
    /**
     * Validate creation payload
     */
    validateCreatePost(req, res, next) {
        const { title, content, category, status } = req.body;
        const errors = {};

        if (!title || !title.trim()) {
            errors.title = "Title is required and cannot be empty";
        }

        if (!content || !content.trim()) {
            errors.content = "Content is required and cannot be empty";
        }

        if (!category) {
            errors.category = "Category is required";
        } else if (!mongoose.Types.ObjectId.isValid(category) && typeof category !== 'string') {
            errors.category = "Category must be a valid ObjectId or category name string";
        }

        if (status && !["draft", "published", "scheduled", "archived"].includes(status)) {
            errors.status = "Status must be one of: draft, published, scheduled, archived";
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        next();
    }

    /**
     * Validate update payload
     */
    validateUpdatePost(req, res, next) {
        const { category, status } = req.body;
        const errors = {};

        if (category && !mongoose.Types.ObjectId.isValid(category) && typeof category !== 'string') {
            errors.category = "Category must be a valid ObjectId or category name string";
        }

        if (status && !["draft", "published", "scheduled", "archived"].includes(status)) {
            errors.status = "Status must be one of: draft, published, scheduled, archived";
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        next();
    }
}

module.exports = new BlogValidator();
