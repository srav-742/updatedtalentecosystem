const { callSkillAI } = require("../utils/aiClients");

exports.generateAIContent = async (input) => {
    // If input looks like a full prompt, use it. Otherwise, wrap as a topic.
    let finalPrompt = input;
    if (input.length < 200 && !input.includes("LinkedIn Post:")) {
        finalPrompt = `
Generate a highly engaging, viral LinkedIn post based on the following tech news topic: "${input}"

STRICT FORMATTING TEMPLATE:
You MUST output your response EXACTLY matching this structure (do NOT include headers like [HOOK] or [BODY] in your output):

(A perfect, highly engaging, and interesting 1-2 line hook that grabs attention immediately. Address a pain point or surprising fact based on the topic.)
(End with 🧵 or 👇)

(The most engaging body content explaining what is happening right now in the tech/jobs/layoffs space.)
(Use short paragraphs and bullet points with emojis like ✅ or 🚀 for actionable insights.)

(A perfect CTA asking a compelling question related to the topic.)
We match vetted developers directly with companies actively hiring.
No spam. No ghost rounds.
→ Join free at www.hire1percent.com

(3-5 relevant, viral hashtags like #TechNews #Jobs #Layoffs #Developers)

OUTPUT RESTRICTION:
Return ONLY the final post text. No markdown formatting blocks (\`\`\`), no quotes, no introductory conversational filler. Just the raw text ready for LinkedIn.
`;
    }

    try {
        const text = await callSkillAI(finalPrompt, 3000, 0.9);
        return text || "Skills are becoming the new currency in hiring. Are you ready?";
    } catch (error) {
        console.error("[AI-SERVICE] Error generating content:", error);
        return "The future of work is global. Hiring shouldn't be limited by borders.";
    }
};