const axios = require("axios");

exports.fetchNews = async () => {
    try {
        const res = await axios.get(
            `https://newsapi.org/v2/everything?q=software jobs OR layoffs OR developers India&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`
        );

        return res.data.articles.slice(0, 20).map(a => ({
            title: a.title,
            url: a.url
        }));
    } catch (error) {
        console.error("News API fetch error:", error);
        return [];
    }
};