const express = require("express");
const router = express.Router();

const {
    generateContent,
    getAllContent,
    markAsPosted,
    generateJD,
    regeneratePost,
    getNewsAPIStories,
    getHackerNewsStories
} = require("../controllers/contentController");

router.post("/generate", generateContent);
router.post("/generate-jd", generateJD);
router.get("/", getAllContent);
router.get("/newsapi", getNewsAPIStories);
router.get("/hackernews", getHackerNewsStories);
router.patch("/:id", markAsPosted);
router.post("/:id/regenerate", regeneratePost);

module.exports = router;