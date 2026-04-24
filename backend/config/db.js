const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/talent-ecosystem", {
            serverSelectionTimeoutMS: 30000, // Increased to 30s
            socketTimeoutMS: 45000,
            family: 4 // Force IPv4 to avoid Atlas connection issues
        });
        console.log("Connected to MongoDB Cluster (IPv4)");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        throw err; // Throw instead of exit to allow caller to handle
    }
};

module.exports = connectDB;
