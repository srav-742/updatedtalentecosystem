const express = require("express");
const router = express.Router();
const { authMiddleware, roleCheck } = require("../middleware/authMiddleware");

const {
    generateContent,
    getAllContent,
    markAsPosted,
    generateJD,
    regeneratePost,
    getNewsAPIStories,
    getHackerNewsStories
} = require("../controllers/contentController");

// Secure all content routes - Only admins allowed
router.use(authMiddleware);
router.use(roleCheck('admin'));

router.post("/generate", generateContent);
router.post("/generate-jd", generateJD);
router.get("/", getAllContent);
router.get("/newsapi", getNewsAPIStories);
router.get("/hackernews", getHackerNewsStories);
router.patch("/:id", markAsPosted);
router.post("/:id/regenerate", regeneratePost);

module.exports = router;