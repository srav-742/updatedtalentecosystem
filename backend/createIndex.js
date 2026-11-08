const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0';

async function createIndex() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');
        
        const BlogPost = mongoose.connection.collection('blogposts');
        
        console.log('Creating index on createdAt: -1');
        await BlogPost.createIndex({ createdAt: -1 });
        console.log('Index created successfully on createdAt');
        
        console.log('Creating index on publishedAt: -1 just in case');
        await BlogPost.createIndex({ publishedAt: -1 });
        console.log('Index created successfully on publishedAt');
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createIndex();
