const cron = require("node-cron");
const { generateContentLogic } = require("../controllers/contentController");

cron.schedule("0 12 * * *", async () => {
    console.log("[CRON] Starting daily content generation...");
    try {
        await generateContentLogic();
        console.log("[CRON] Daily content generation successful.");
    } catch (err) {
        console.error("[CRON] Content generation failed:", err);
    }
});