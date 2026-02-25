const User = require('../models/User');

const verifyAdmin = async (req, res, next) => {
    try {
        // For simplicity, we expect the user ID to be passed in a header.
        // In a production app, this would be a JWT token.
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ message: "No user ID provided" });
        }

        const user = await User.findOne({
            $or: [
                { uid: userId },
                { _id: userId.length === 24 ? userId : null }
            ]
        });

        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admin only." });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Admin verification error:", error);
        res.status(500).json({ message: "Internal server error during verification" });
    }
};

module.exports = verifyAdmin;
