require('dotenv').config({ path: './hire1percent-ai-agent/.env' });
const mongoose = require('mongoose');

async function listCollections() {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections:");
        collections.forEach(c => console.log(" - " + c.name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listCollections();
