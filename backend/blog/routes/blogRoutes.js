const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const blogValidator = require('../validators/blogValidator');
const upload = require('../../config/multer'); // Global multer config
const { authMiddleware, roleCheck } = require('../../middleware/authMiddleware');

// ==========================================
// Public Endpoints
// ==========================================
router.get('/v1/blogs', blogController.getBlogPosts);
router.get('/v1/blogs/featured', blogController.getFeaturedPost);
router.get('/v1/blogs/categories', blogController.getBlogCategories);
router.get('/v1/blogs/related/:id', blogController.getRelatedPosts);
router.get('/v1/blogs/:slug', blogController.getBlogPostBySlug);
router.post('/v1/blogs/subscribe', blogController.subscribeNewsletter);

// ==========================================
// Admin Protected Endpoints
// ==========================================
router.get('/v1/admin/blogs', authMiddleware, roleCheck(['admin', 'recruiter']), blogController.adminGetBlogPosts);
router.get('/v1/admin/blogs/:id', authMiddleware, roleCheck(['admin', 'recruiter']), blogController.adminGetBlogPostById);
router.post('/v1/admin/blogs', authMiddleware, roleCheck(['admin', 'recruiter']), blogValidator.validateCreatePost, blogController.createBlogPost);
router.put('/v1/admin/blogs/:id', authMiddleware, roleCheck(['admin', 'recruiter']), blogValidator.validateUpdatePost, blogController.updateBlogPost);
router.delete('/v1/admin/blogs/:id', authMiddleware, roleCheck(['admin', 'recruiter']), blogController.deleteBlogPost);
router.post('/v1/admin/blogs/upload-cover', authMiddleware, roleCheck(['admin', 'recruiter']), upload.single('image'), blogController.uploadCoverImage);
// Compatibility Aliases (/v1/blogs/admin -> /v1/admin/blogs)
// Removed duplicate aliases to avoid redundant route definitions

module.exports = router;
