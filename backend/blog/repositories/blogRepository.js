const BlogPost = require('../models/BlogPost');
const BlogCategory = require('../models/BlogCategory');
const User = require('../../models/User'); // References global User model

class BlogRepository {
    /**
     * Create a new category
     */
    async createCategory(categoryData) {
        return await BlogCategory.create(categoryData);
    }

    /**
     * Find category by slug
     */
    async findCategoryBySlug(slug) {
        return await BlogCategory.findOne({ slug });
    }

    /**
     * Get all categories
     */
    async getAllCategories() {
        return await BlogCategory.find().sort({ name: 1 });
    }

    /**
     * Find post by slug and populate author + category
     */
    async findPostBySlug(slug) {
        return await BlogPost.findOne({ slug })
            .populate('authorId', 'name profilePic designation')
            .populate('category', 'name slug');
    }

    /**
     * Find post by ID
     */
    async findPostById(id) {
        return await BlogPost.findById(id)
            .populate('authorId', 'name profilePic designation')
            .populate('category', 'name slug');
    }

    /**
     * Get the featured post (most recent published article)
     */
    async getFeaturedPost() {
        return await BlogPost.findOne({ status: 'published', publishedAt: { $lte: new Date() } })
            .sort({ publishedAt: -1 })
            .populate('authorId', 'name profilePic designation')
            .populate('category', 'name slug');
    }

    /**
     * Find related posts (same category, excluding the current post)
     */
    async getRelatedPosts(postId, categoryId, limit = 3) {
        return await BlogPost.find({
            _id: { $ne: postId },
            category: categoryId,
            status: 'published',
            publishedAt: { $lte: new Date() }
        })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .populate('authorId', 'name profilePic designation')
        .populate('category', 'name slug');
    }

    /**
     * Search and filter published posts with pagination
     */
    async findPublishedPosts({ categorySlug, searchQuery, page = 1, limit = 9 }) {
        const query = { status: 'published', publishedAt: { $lte: new Date() } };

        // 1. Category filter
        if (categorySlug) {
            const category = await BlogCategory.findOne({ slug: categorySlug });
            if (category) {
                query.category = category._id;
            } else {
                return { posts: [], total: 0, page, pages: 0 };
            }
        }

        // 2. Optimized native text search
        if (searchQuery) {
            query.$text = { $search: searchQuery };
        }

        const skip = (page - 1) * limit;

        const postsQuery = BlogPost.find(query)
            .populate('authorId', 'name profilePic designation')
            .populate('category', 'name slug');

        // Sort by text relevance score if search is query-based, else sort by date
        if (searchQuery) {
            postsQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
        } else {
            postsQuery.sort({ publishedAt: -1 });
        }

        const [posts, total] = await Promise.all([
            postsQuery.skip(skip).limit(limit),
            BlogPost.countDocuments(query)
        ]);

        return {
            posts,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Admin: Find all posts (no date/status restrictions, full details)
     */
    async findAdminPosts({ status, searchQuery, page = 1, limit = 20 }) {
        const query = {};

        if (status) {
            query.status = status;
        }

        if (searchQuery) {
            query.$text = { $search: searchQuery };
        }

        const User = require('../../models/User');
        const adminUsers = await User.find({ role: 'admin' }).select('_id');
        const adminUserIds = adminUsers.map(u => u._id);
        query.authorId = { $in: adminUserIds };

        const skip = (page - 1) * limit;

        const postsQuery = BlogPost.find(query)
            .populate('authorId', 'name profilePic designation')
            .populate('category', 'name slug');

        if (searchQuery) {
            postsQuery.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
        } else {
            postsQuery.sort({ createdAt: -1 });
        }

        const [posts, total] = await Promise.all([
            postsQuery.skip(skip).limit(limit),
            BlogPost.countDocuments(query)
        ]);

        return {
            posts,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Create a new post
     */
    async createPost(postData) {
        return await BlogPost.create(postData);
    }

    /**
     * Update an existing post by ID
     */
    async updatePost(id, updateData) {
        return await BlogPost.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    }

    /**
     * Delete a post by ID
     */
    async deletePost(id) {
        return await BlogPost.findByIdAndDelete(id);
    }

    /**
     * Increment view counter
     */
    async incrementViews(id) {
        return await BlogPost.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
    }
}

module.exports = new BlogRepository();
