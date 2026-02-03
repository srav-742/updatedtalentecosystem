const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/talent-ecosystem", {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000
        });
        console.log("Connected to MongoDB Cluster (IPv4)");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    }
};

module.exports = connectDB;
