require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/talent-ecosystem";
    console.log("Connecting to MongoDB...");
    
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected successfully!");

        const blogPostSchema = new mongoose.Schema({}, { strict: false });
        const BlogPost = mongoose.model('BlogPost', blogPostSchema, 'blogposts');

        const countBefore = await BlogPost.countDocuments({});
        console.log(`Found ${countBefore} blog posts currently in the database.`);

        if (countBefore > 0) {
            const blogs = await BlogPost.find({});
            console.log("Details of existing blogs:");
            blogs.forEach(b => {
                console.log(`- Title: "${b.get('title')}", Slug: "${b.get('slug')}", AuthorId: ${b.get('authorId')}, Status: ${b.get('status')}`);
            });

            console.log("Deleting all blog posts...");
            const deleteResult = await BlogPost.deleteMany({});
            console.log(`Delete operation finished. Deleted count: ${deleteResult.deletedCount}`);
        } else {
            console.log("No blog posts to delete.");
        }

    } catch (err) {
        console.error("Error running script:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

run();
