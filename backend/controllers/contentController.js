const ContentPost = require("../models/contentPost");
const { fetchNews } = require("../services/newsService");
const { fetchHackerNews } = require("../services/hackerNewsService");
const { generateAIContent } = require("../services/aiService");

// Core logic that can be reused by cron jobs
exports.generateContentLogic = async () => {
    const rawNews = await fetchNews();
    const rawHackerNews = await fetchHackerNews();

    const existingPosts = await ContentPost.find().select("url");
    const existingUrls = existingPosts.map(p => p.url).filter(url => url);

    const newNews = rawNews.filter(n => !existingUrls.includes(n.url)).slice(0, 5);
    const newHackerNews = rawHackerNews.filter(h => !existingUrls.includes(h.url)).slice(0, 5);

    const topics = [
        ...newNews.map(n => ({ title: n.title, url: n.url, source: "News API" })),
        ...newHackerNews.map(h => ({ title: h.title, url: h.url, source: "Hacker News" }))
    ];

    let savedPosts = [];

    for (let topic of topics) {
        const aiPost = await generateAIContent(topic.title);

        const saved = await ContentPost.create({
            source: topic.source,
            topicTitle: topic.title,
            url: topic.url,
            generatedPost: aiPost,
            status: "draft"
        });

        savedPosts.push(saved);
    }
    return savedPosts;
};

exports.generateContent = async (req, res) => {
    try {
        const result = await exports.generateContentLogic();
        res.json(result);
    } catch (err) {
        console.error("[CONTENT-GEN] Error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getAllContent = async (req, res) => {
    try {
        const content = await ContentPost.find().sort({ createdAt: -1 });
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.markAsPosted = async (req, res) => {
    try {
        const updated = await ContentPost.findByIdAndUpdate(
            req.params.id,
            { status: "posted" },
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getNewsAPIStories = async (req, res) => {
    try {
        const news = await fetchNews();
        res.json(news);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getHackerNewsStories = async (req, res) => {
    try {
        const hn = await fetchHackerNews();
        res.json(hn);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.regeneratePost = async (req, res) => {
    try {
        const post = await ContentPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        const newAiPost = await generateAIContent(post.topicTitle);
        post.generatedPost = newAiPost;
        await post.save();
        res.json(post);
    } catch (err) {
        console.error("[CONTENT-GEN] Error regenerating:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.generateJD = async (req, res) => {
    const { post } = req.body;
    if (!post) return res.status(400).json({ error: "Post content is required" });

    try {
        const prompt = `
Convert the following LinkedIn post into a professional Job Description.

LinkedIn Post:
"${post}"

FORMAT:
Return the Job Description as a structured JSON object:
{
  "title": "...",
  "responsibilities": ["...", "..."],
  "skills": ["...", "..."],
  "about": "..."
}

Return ONLY the JSON. No markdown.
`;
        const raw = await generateAIContent(prompt);
        // Basic parser for AI output
        let jd;
        try {
            let cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
            jd = JSON.parse(cleaned);
        } catch (e) {
            jd = { title: "New Role", responsibilities: [raw], skills: [], about: "" };
        }
        res.json(jd);
    } catch (err) {
        res.status(500).json({ error: "Failed to generate JD", details: err.message });
    }
};