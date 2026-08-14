const axios = require("axios");

exports.fetchHackerNews = async () => {
    try {
        // 1. Get top story IDs
        const idsRes = await axios.get(
            "https://hacker-news.firebaseio.com/v0/topstories.json"
        );

        const topIds = idsRes.data.slice(0, 20);

        // 2. Get story details
        const stories = await Promise.all(
            topIds.map(id =>
                axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
            )
        );

        return stories.map(s => ({
            title: s.data.title,
            url: s.data.url
        }));
    } catch (error) {
        console.error("Hacker News fetch error:", error);
        return [];
    }
};
