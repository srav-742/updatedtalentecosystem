const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

// Find the dummy route and replace it
const dummyRoute = "app.post('/api/generate-full-assessment', async (req, res) => { res.send('Dummy'); });";
const startIdx = content.indexOf(dummyRoute);

if (startIdx === -1) {
    console.error("Dummy route not found! File might have changed.");
    process.exit(1);
}

const robustCode = `app.post('/api/generate-full-assessment', async (req, res) => {
  try {
    const { jobId, userId } = req.body;
    if (!jobId || !userId) {
      return res.status(400).json({ message: "jobId and userId are required" });
    }

    // 🔍 1. Fetch Job & validate assessment enabled
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (!job.assessment?.enabled) {
      return res.status(400).json({ message: "Assessment is not enabled for this job" });
    }

    // 🔍 2. Validate user exists
    const user = await User.findOne({ uid: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔍 3. Check resume analysis completed: ResumeProfile must exist
    const resumeProfile = await ResumeProfile.findOne({ userId });
    if (!resumeProfile) {
      return res.status(400).json({ 
        message: "Resume analysis not completed. Please upload and parse your resume first." 
      });
    }

    // 🔍 4. Check resume match % meets recruiter's minPercentage
    const application = await Application.findOne({
      jobId: new mongoose.Types.ObjectId(jobId),
      userId
    });
    if (!application) {
      return res.status(400).json({ 
        message: "You have not applied to this job yet. Please apply first." 
      });
    }
    if (application.resumeMatchPercent < (job.minPercentage || 60)) {
      return res.status(400).json({
        message: \`Your resume match (\${application.resumeMatchPercent}%) is below recruiter's minimum requirement (\${job.minPercentage || 60}%)\`
      });
    }

    // 💰 5. Deduct coins (soft-fail allowed)
    await deductCoins(userId, 20, 'Dynamic Skill Assessment');

    // 🎯 6. Extract config from job (source of truth)
    const totalQuestions = Math.min(job.assessment.totalQuestions || 5, 10);
    const assessmentType = (job.assessment.type || 'mixed').toLowerCase();
    const skills = job.skills || [];
    const passingScore = job.assessment.passingScore || 70;

    // 📜 7. Fetch previously asked questions (deduplication)
    const previous = await QuestionLog.find({ userId }).select("hash questionText");
    const usedHashes = new Set(previous.map(q => q.hash));

    // 🔑 8. Generate unique seed
    const seed = crypto
      .createHash('sha256')
      .update(\`\${userId}\${jobId}\${Date.now()}\`)
      .digest('hex');

    // 🧠 9. Build prompt
    const prompt = \`
You are an API that generates skill-based assessment questions.
Return ONLY valid JSON. If extra text is added, ensure JSON is still extractable.
Generate UP TO \${totalQuestions} questions. Prioritize uniqueness and relevance.
TYPE: \${assessmentType.toUpperCase()} (MCQ or CODING — mix if 'mixed')
JOB TITLE: \${job.title}
SKILLS: \${skills.join(', ')}
PASSING SCORE THRESHOLD: \${passingScore}

JSON FORMAT (strict):
{
  "questions": [
    {
      "type": "mcq",
      "skill": "string",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0
    },
    {
      "type": "coding",
      "skill": "string",
      "question": "string",
      "starterCode": "function example() { /* write here */ }"
    }
  ]
}
Do NOT include explanations, markdown, or extra fields.
\`;

    // 🔄 10. Call AI with retries & partial acceptance
    let parsed = null;
    let rawResponse = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        rawResponse = await callGeminiWithFallback(prompt);
        if (!rawResponse || rawResponse.trim().length < 10) {
          console.warn(\`[ASSESSMENT] Attempt \${attempt}: Empty response\`);
          continue;
        }

        parsed = fixMalformedJson(rawResponse);
        if (parsed && typeof parsed === 'object') {
          // Normalize: if top-level is array → wrap in { questions: [...] }
          if (Array.isArray(parsed)) {
            parsed = { questions: parsed };
          } else if (parsed.data && Array.isArray(parsed.data)) {
            parsed.questions = parsed.data;
          }
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            break;
          }
        }
      } catch (e) {
        console.warn(\`[ASSESSMENT] Attempt \${attempt} error:\`, e.message);
      }
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }

    // 🚨 Final check: accept ≥3 questions (per your spec)
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length < 3) {
      console.error("[AI] Final Failure. Raw:", rawResponse?.substring(0, 300));
      return res.status(503).json({
        message: "Elite assessment failed. AI returned fewer than 3 valid questions.",
        details: {
          attempted: parsed?.questions?.length || 0,
          minRequired: 3,
          rawPreview: rawResponse ? rawResponse.substring(0, 200) : "null"
        }
      });
    }

    // ✅ 11. Filter, dedupe, and save questions
    const finalQuestions = [];
    for (const q of parsed.questions) {
      if (!q.question || typeof q.question !== 'string') continue;

      // Normalize & hash
      const hash = generateHash(q.question);
      if (usedHashes.has(hash)) {
        console.log(\`[DEDUP] Skipped duplicate question hash: \${hash}\`);
        continue;
      }

      const type = (q.type || 'mcq').toLowerCase();
      let isValid = true;

      if (type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          isValid = false;
        }
        // Ensure correctAnswer is index in options
        if (isValid && typeof q.correctAnswer === 'number' && (q.correctAnswer < 0 || q.correctAnswer >= q.options.length)) {
          q.correctAnswer = 0; // fallback
        }
      } else if (type === 'coding') {
        if (!q.starterCode) {
          q.starterCode = "// Write your solution here";
        }
      }

      if (!isValid) continue;

      // Save to DB
      try {
        await QuestionLog.create({
          questionText: q.question,
          skill: q.skill || 'General',
          difficulty: 'medium',
          category: type.toUpperCase(),
          hash,
          userId
        });
        usedHashes.add(hash);
        finalQuestions.push(q);
      } catch (dbErr) {
        console.warn(\`[DB] Failed to save question (hash \${hash}):\`, dbErr.message);
        // Still include it — don’t block flow (soft fail)
        finalQuestions.push(q);
        usedHashes.add(hash);
      }

      // Early exit if we have enough
      if (finalQuestions.length >= totalQuestions) break;
    }

    if (finalQuestions.length < 3) {
      return res.status(503).json({
        message: "Elite assessment failed. Generated only " + finalQuestions.length + " unique questions (< 3).",
        saved: finalQuestions.length
      });
    }

    console.log(\`[ASSESSMENT] ✅ Generated \${finalQuestions.length}/\${totalQuestions} unique questions for user \${userId}\`);

    res.json({
      sessionId: seed,
      questions: finalQuestions,
      totalGenerated: finalQuestions.length,
      job: {
        title: job.title,
        skills: job.skills,
        assessment: {
          type: assessmentType,
          passingScore,
          totalQuestions
        }
      }
    });

  } catch (error) {
    console.error("[ASSESSMENT ERROR]", error.stack || error.message);
    res.status(500).json({
      message: "Skill assessment generation failed",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});`;

// Replace
const newContent = content.replace(dummyRoute, robustCode);
fs.writeFileSync('server.js', newContent);
console.log("Replaced dummy route with robust code.");
