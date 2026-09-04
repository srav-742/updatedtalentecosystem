require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function migrate() {
    console.log('[MIGRATION] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    const BlogPost = require('../blog/models/BlogPost');

    const posts = await BlogPost.find({});
    console.log(`[MIGRATION] Total posts found: ${posts.length}`);

    let updatedCount = 0;
    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        if (post.coverImage && post.coverImage.startsWith('data:image')) {
            console.log(`[MIGRATION] [${i + 1}/${posts.length}] Uploading base64 cover for: "${post.title.slice(0, 35)}..." (${Math.round(post.coverImage.length / 1024)} KB)`);
            try {
                const res = await cloudinary.uploader.upload(post.coverImage, {
                    folder: 'blog_covers',
                    resource_type: 'image'
                });
                post.coverImage = res.secure_url;
                await BlogPost.findByIdAndUpdate(post._id, { coverImage: res.secure_url });
                console.log(`  ✅ Done: ${res.secure_url}`);
                updatedCount++;
            } catch (err) {
                console.error(`  ❌ Error on post ${post._id}:`, err.message);
            }
        } else {
            console.log(`[MIGRATION] [${i + 1}/${posts.length}] Skipping (already URL): "${post.title.slice(0, 35)}..."`);
        }
    }

    console.log(`[MIGRATION] Finished! Updated ${updatedCount} posts to Cloudinary URLs.`);
    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error('[MIGRATION FATAL]', err);
    process.exit(1);
});
