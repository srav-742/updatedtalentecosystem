const fs = require('fs');
const path = './server.js';
let content = fs.readFileSync(path, 'utf8');

const startSig = "app.post('/api/generate-full-assessment', async (req, res) => {";
const endSig = "/* DISABLED ROUTES";

const startIdx = content.indexOf(startSig);
const endIdx = content.indexOf(endSig);

if (startIdx !== -1 && endIdx !== -1) {
    const before = content.substring(0, startIdx);
    const after = content.substring(endIdx);

    const newCode = `app.post('/api/generate-full-assessment', async (req, res) => {
    try {
        const { jobId, userId } = req.body;

        if (!jobId || !userId) {
            return res.status(400).json({ message: "jobId and userId are required" });
        }

        // 🔐 Recruiter config is the ONLY source of truth
        const job = await Job.findById(jobId);
        if (!job || !job.assessment?.enabled) {
            return res.status(400).json({ message: "Assessment not enabled for this job" });
        }

        // 💰 Coin deduction (soft-fail)
        await deductCoins(userId, 20, 'Dynamic Skill Assessment');

        // Robust Limits: Request proper count, cap at 10 for AI stability
        const totalQuestions = Math.min(job.assessment.totalQuestions || 5, 10);
        const assessmentType = (job.assessment.type || 'mixed').toLowerCase();
        const skills = job.skills || [];

        // 🧠 Fetch previously asked questions
        const previous = await QuestionLog.find({ userId }).select("hash");
        const usedHashes = new Set(previous.map(q => q.hash));

        // 🌱 Unique seed
        const seed = crypto
            .createHash('sha256')
            .update(userId + jobId + Date.now())
            .digest('hex');

        const prompt = \`
You are an API that generates assessment questions.

Return JSON only.
If extra text is added, JSON must still be extractable.

Generate UP TO \${totalQuestions} questions.
Type: \${assessmentType.toUpperCase()} (MCQ or Coding)

JOB TITLE: \${job.title}
SKILLS: \${skills.join(', ')}

JSON FORMAT:
{
  "questions": [
    {
      "type": "mcq",
      "skill": "string",
      "question": "string",
      "options": ["A","B","C","D"],
      "correctAnswer": 0
    },
    {
      "type": "coding",
      "skill": "string",
      "question": "string",
      "starterCode": "function..."
    }
  ]
}
\`;

        let parsed = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const raw = await callGeminiWithFallback(prompt);
                
                if (raw && raw.length > 20) {
                    parsed = fixMalformedJson(raw);
                    
                    // Tolerance: array -> object
                    if (Array.isArray(parsed)) parsed = { questions: parsed };
                    // Tolerance: data key -> questions key
                    if (parsed && !parsed.questions && parsed.data) parsed.questions = parsed.data;

                    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                        break;
                    }
                }
            } catch (e) {
                console.warn(\`[ASSESSMENT] Attempt \${attempt} error:\`, e.message);
            }
            console.warn(\`[ASSESSMENT] Retry \${attempt} failed\`);
        }

        if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            console.error("[AI] Final Failure. Parsed:", JSON.stringify(parsed));
            return res.status(503).json({ message: "Elite assessment failed. AI returned no questions." });
        }

        const finalQuestions = [];

        for (const q of parsed.questions) {
            if (!q.question) continue;

            const hash = generateHash(q.question);
            if (usedHashes.has(hash)) continue;

            const type = (q.type || 'mcq').toLowerCase();
            
            // Basic Validation
            if (type === 'mcq' && (!q.options || q.options.length < 2)) continue;

            // Correction
            if (type === 'coding' && !q.starterCode) q.starterCode = "// Write your solution here";

            await QuestionLog.create({
                questionText: q.question,
                skill: q.skill || 'General',
                difficulty: 'medium',
                category: type.toUpperCase(),
                hash,
                userId
            });

            finalQuestions.push(q);
            usedHashes.add(hash);
        }

        if (finalQuestions.length === 0) {
             return res.status(503).json({ message: "Elite assessment failed. No unique questions generated." });
        }

        res.json({
            sessionId: seed,
            questions: finalQuestions
        });

    } catch (error) {
        console.error("[ASSESSMENT ERROR]", error);
        res.status(500).json({ message: "Skill assessment generation failed" });
    }
});

`;
    fs.writeFileSync(path, before + newCode + after);
    console.log("Replaced function successfully.");
} else {
    console.error("Could not find markers.", startIdx, endIdx);
}
