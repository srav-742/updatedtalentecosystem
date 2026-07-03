const blogRepository = require('../repositories/blogRepository');
const blogService = require('../services/blogService');
const BlogCategory = require('../models/BlogCategory');
const BlogPost = require('../models/BlogPost');
const Lead = require('../../models/Lead');
const cloudinary = require('../../config/cloudinary');
const mongoose = require('mongoose');

class BlogController {
    // ==========================================
    // Public Endpoints
    // ==========================================

    /**
     * Get published blog posts with pagination, search, and category filter
     */
    async getBlogPosts(req, res) {
        try {
            const { page = 1, limit = 9, category, search } = req.query;
            const result = await blogRepository.findPublishedPosts({
                categorySlug: category,
                searchQuery: search,
                page: Number(page),
                limit: Number(limit)
            });

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] getBlogPosts error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch blog posts', error: error.message });
        }
    }

    /**
     * Get a specific blog post by slug, and increment views
     */
    async getBlogPostBySlug(req, res) {
        try {
            const { slug } = req.params;
            const post = await blogRepository.findPostBySlug(slug);

            if (!post) {
                return res.status(404).json({ success: false, message: 'Blog post not found' });
            }

            // Increment views in background
            blogRepository.incrementViews(post._id).catch(err => {
                console.error('[BLOG-CONTROLLER] Failed to increment views:', err.message);
            });

            return res.json({
                success: true,
                post
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] getBlogPostBySlug error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch blog post', error: error.message });
        }
    }

    /**
     * Get the current featured blog post (most recent published article)
     */
    async getFeaturedPost(req, res) {
        try {
            const post = await blogRepository.getFeaturedPost();
            if (!post) {
                return res.status(404).json({ success: false, message: 'No featured blog post found' });
            }
            return res.json({
                success: true,
                post
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] getFeaturedPost error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch featured post', error: error.message });
        }
    }

    /**
     * Get all categories dynamically
     */
    async getBlogCategories(req, res) {
        try {
            const categories = await blogRepository.getAllCategories();
            return res.json({
                success: true,
                categories
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] getBlogCategories error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
        }
    }

    /**
     * Get related posts
     */
    async getRelatedPosts(req, res) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog post ID' });
            }

            const currentPost = await blogRepository.findPostById(id);
            if (!currentPost) {
                return res.status(404).json({ success: false, message: 'Blog post not found' });
            }

            const posts = await blogRepository.getRelatedPosts(currentPost._id, currentPost.category?._id || currentPost.category);
            return res.json({
                success: true,
                posts
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] getRelatedPosts error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch related posts', error: error.message });
        }
    }

    /**
     * Subscribe to blog newsletter
     */
    async subscribeNewsletter(req, res) {
        try {
            const { email, name } = req.body;
            if (!email || !email.trim()) {
                return res.status(400).json({ success: false, message: 'Email address is required' });
            }

            let lead = await Lead.findOne({ email, source: 'Blog Newsletter' });
            if (!lead) {
                lead = await Lead.create({
                    name: name || 'Newsletter Subscriber',
                    email,
                    source: 'Blog Newsletter',
                    bookingStatus: 'Pending'
                });
            }

            return res.json({
                success: true,
                message: 'Subscribed to newsletter successfully',
                leadId: lead._id
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] subscribeNewsletter error:', error);
            return res.status(500).json({ success: false, message: 'Failed to subscribe', error: error.message });
        }
    }

    // ==========================================
    // Admin Protected Endpoints
    // ==========================================

    /**
     * Get all posts for admin view (no filters, paginated)
     */
    async adminGetBlogPosts(req, res) {
        try {
            const { page = 1, limit = 20, status, search } = req.query;
            const result = await blogRepository.findAdminPosts({
                status,
                searchQuery: search,
                page: Number(page),
                limit: Number(limit)
            });

            return res.json({
                success: true,
                ...result
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] adminGetBlogPosts error:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch admin blog posts', error: error.message });
        }
    }

    /**
     * Create a new blog post
     */
    async createBlogPost(req, res) {
        try {
            const { title, subtitle, content, coverImage, category, tags, status, publishedAt, seo } = req.body;
            
            // Extract verified user id from Gateway headers or request context
            let authorId = req.user?._id;
            
            if (!authorId) {
                const headerUserId = req.headers['x-h1p-user-id'] || req.headers['x-user-id'];
                if (headerUserId) {
                    const User = require('../../models/User');
                    const query = {
                        $or: [
                            { uid: headerUserId }
                        ]
                    };
                    if (mongoose.Types.ObjectId.isValid(headerUserId)) {
                        query.$or.push({ _id: headerUserId });
                    }
                    const userDoc = await User.findOne(query);
                    if (userDoc) {
                        authorId = userDoc._id;
                    }
                }
            }

            if (!authorId) {
                return res.status(401).json({ success: false, message: 'Unauthorized: Author identification required' });
            }

            // Resolve category (check if ObjectId, otherwise handle as dynamic name string)
            let categoryId;
            if (mongoose.Types.ObjectId.isValid(category)) {
                categoryId = category;
            } else {
                const catDoc = await blogService.getOrCreateCategory(category);
                categoryId = catDoc._id;
            }

            const slug = await blogService.generateUniqueSlug(title);

            const post = await blogRepository.createPost({
                title,
                slug,
                subtitle,
                content,
                coverImage,
                authorId,
                category: categoryId,
                tags,
                status,
                publishedAt: publishedAt || new Date(),
                seo
            });

            return res.status(201).json({
                success: true,
                message: 'Blog post created successfully',
                post
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] createBlogPost error:', error);
            return res.status(500).json({ success: false, message: 'Failed to create blog post', error: error.message });
        }
    }

    /**
     * Update an existing blog post
     */
    async updateBlogPost(req, res) {
        try {
            const { id } = req.params;
            const { title, subtitle, content, coverImage, category, tags, status, publishedAt, seo, slug } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog post ID' });
            }

            const existingPost = await blogRepository.findPostById(id);
            if (!existingPost) {
                return res.status(404).json({ success: false, message: 'Blog post not found' });
            }

            const updateData = { subtitle, content, coverImage, tags, status, publishedAt, seo };

            // Dynamic slug update
            if (slug && slug.trim()) {
                updateData.slug = await blogService.generateUniqueSlug(slug, id);
            } else if (title && title.trim() !== existingPost.title) {
                updateData.title = title;
                updateData.slug = await blogService.generateUniqueSlug(title, id);
            } else if (title) {
                updateData.title = title;
            }

            // Resolve category if updating
            if (category) {
                if (mongoose.Types.ObjectId.isValid(category)) {
                    updateData.category = category;
                } else {
                    const catDoc = await blogService.getOrCreateCategory(category);
                    updateData.category = catDoc._id;
                }
            }

            const updatedPost = await blogRepository.updatePost(id, updateData);

            return res.json({
                success: true,
                message: 'Blog post updated successfully',
                post: updatedPost
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] updateBlogPost error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update blog post', error: error.message });
        }
    }

    /**
     * Delete a blog post
     */
    async deleteBlogPost(req, res) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: 'Invalid blog post ID' });
            }

            const deleted = await blogRepository.deletePost(id);
            if (!deleted) {
                return res.status(404).json({ success: false, message: 'Blog post not found' });
            }

            return res.json({
                success: true,
                message: 'Blog post deleted successfully'
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] deleteBlogPost error:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete blog post', error: error.message });
        }
    }

    /**
     * Upload cover image buffer directly to Cloudinary
     */
    async uploadCoverImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'blog-covers',
                        resource_type: 'image',
                        public_id: `cover_${Date.now()}`
                    },
                    (error, result) => {
                        if (error) {
                            console.error('[BLOG-CLOUDINARY-UPLOAD-ERROR]:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            return res.json({
                success: true,
                message: 'Cover image uploaded successfully',
                url: uploadResult.secure_url
            });
        } catch (error) {
            console.error('[BLOG-CONTROLLER] uploadCoverImage error:', error);
            return res.status(500).json({ success: false, message: 'Failed to upload cover image', error: error.message });
        }
    }
}

module.exports = new BlogController();
