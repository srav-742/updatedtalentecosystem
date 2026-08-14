const blogRepository = require('../repositories/blogRepository');
const BlogCategory = require('../models/BlogCategory');
const BlogPost = require('../models/BlogPost');

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
};

class BlogService {
    /**
     * Generate unique slug by checking database for duplicates and appending counter if needed
     */
    async generateUniqueSlug(title, id = null) {
        const baseSlug = slugify(title || 'post');
        let slug = baseSlug || 'post';
        let count = 1;
        
        while (true) {
            const query = { slug };
            if (id) {
                query._id = { $ne: id };
            }
            const existing = await BlogPost.findOne(query);
            if (!existing) {
                return slug;
            }
            count++;
            slug = `${baseSlug}-${count}`;
        }
    }

    /**
     * Seed default categories in the DB if none exist
     */
    async seedDefaultCategories() {
        const defaults = [
            { name: 'AI Recruitment', description: 'Trends and tech in AI-led recruitment processes' },
            { name: 'Career Advice', description: 'Expert guidance on navigating your career path' },
            { name: 'Tech & Coding', description: 'Tutorials, reviews, and insights into programming and engineering' },
            { name: 'Resume Building', description: 'Crafting resumes that beat the ATS and catch recruiter eyes' },
            { name: 'Interview Prep', description: 'Techniques and guides to ace behavioral and technical interviews' },
            { name: 'Technical Assessments', description: 'Insights and guides on technical coding and system design assessments' },
            { name: 'AI Hiring', description: 'Trends and tech in AI-led recruitment processes and AI screening' },
            { name: 'Interview Intelligence', description: 'Analyzing interview data and feedback to make better hiring decisions' },
            { name: 'Engineering Hiring', description: 'Best practices for hiring top-tier engineering talent' },
            { name: 'Recruiting Strategy', description: 'Strategic approaches to scaling teams and optimizing recruitment pipelines' },
            { name: 'Product Updates', description: 'Latest features, updates, and releases from Hire1Percent' }
        ];

        console.log('[BLOG-SERVICE] Running categories check/seeding...');
        let seededCount = 0;
        for (const category of defaults) {
            const slug = slugify(category.name);
            const existing = await BlogCategory.findOne({ slug });
            if (!existing) {
                await blogRepository.createCategory({ ...category, slug });
                seededCount++;
            }
        }
        if (seededCount > 0) {
            console.log(`[BLOG-SERVICE] Seeded ${seededCount} new categories successfully.`);
        } else {
            console.log('[BLOG-SERVICE] All default categories are already present.');
        }
    }

    /**
     * Get or create a category by name
     */
    async getOrCreateCategory(categoryName) {
        const slug = slugify(categoryName);
        let category = await BlogCategory.findOne({ slug });
        if (!category) {
            category = await blogRepository.createCategory({
                name: categoryName,
                slug,
                description: `Dynamic category for ${categoryName}`
            });
        }
        return category;
    }
}

const mongoose = require('mongoose');
const serviceInstance = new BlogService();

// Safe seeding that runs only when MongoDB connection is active
const seedAfterConnection = () => {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        serviceInstance.seedDefaultCategories().catch(err => {
            console.error('[BLOG-SERVICE] Failed to seed default categories:', err.message);
        });
    } else {
        mongoose.connection.once('open', () => {
            serviceInstance.seedDefaultCategories().catch(err => {
                console.error('[BLOG-SERVICE] Failed to seed default categories:', err.message);
            });
        });
    }
};

seedAfterConnection();

module.exports = serviceInstance;
