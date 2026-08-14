const mongoose = require('mongoose');
const MONGO_URI = 'mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0';

const BlogSchema = new mongoose.Schema({ authorId: String, title: String }, { strict: false });
const Blog = mongoose.model('BlogPost', BlogSchema, 'blogposts');

async function checkBlogs() {
    try {
        await mongoose.connect(MONGO_URI);
        const blogs = await Blog.find({}).sort({ createdAt: -1 }).limit(10);
        console.log("Recent blogs:");
        blogs.forEach(b => console.log(`Blog ID: ${b._id}, AuthorId: ${b.authorId}, title: ${b.title}`));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkBlogs();
