module.exports = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'];
    const MASTER_ADMIN_KEY = process.env.ADMIN_SECRET || "talent_admin_2026";

    if (adminKey === MASTER_ADMIN_KEY) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Admin access required" });
    }
};
