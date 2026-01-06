const express = require('express');
const dns = require('dns');

// Fix for MongoDB SRV DNS resolution issues on some networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const pdf = require('pdf-parse');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());

// Fix for Firebase Auth Popup (COOP)
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware - moved after parsers
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST' && req.body) {
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr) console.log("Body:", bodyStr.substring(0, 500));
    }
    next();
});

const PORT = process.env.PORT || 5000;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// MongoDB Connection with Optimized Settings
mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Force IPv4 to avoid slow IPv6 resolution on some networks
})
    .then(() => {
        console.log('Connected to MongoDB Cluster (IPv4)');
        console.log('Server is running with VALIDATE-ANSWER endpoint enabled.');
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- MODELS ---
const jobSchema = new mongoose.Schema({
    title: String,
    company: String,
    location: String,
    type: { type: String, default: 'Full-time' },
    salary: String,
    description: String,
    skills: [String],
    recruiterId: { type: String, index: true }, // Firebase UID
    minPercentage: { type: Number, default: 50 },
    assessment: {
        totalQuestions: { type: Number, default: 5 },
        type: { type: String, default: 'mcq' }
    },
    mockInterview: {
        enabled: { type: Boolean, default: true }
    },
    createdAt: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    userId: { type: String, index: true }, // Firebase UID
    applicantName: String,
    applicantEmail: String,
    applicantPic: String,
    resumeMatchPercent: Number,
    assessmentScore: Number,
    interviewScore: Number,
    finalScore: Number,
    status: { type: String, enum: ['APPLIED', 'SHORTLISTED', 'ELIGIBLE', 'REJECTED'], default: 'APPLIED' },
    appliedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, index: true },
    password: { type: String }, // Plain text for now to match user's current manual entries
    uid: { type: String, index: true },
    role: { type: String, enum: ['seeker', 'recruiter'], default: 'seeker', index: true },
    profilePic: String,
    designation: String,
    phone: String,
    company: {
        name: String,
        website: String,
        industry: String,
        size: String,
        description: String
    },
    // Seeker specific fields
    skills: [String],
    education: [{
        institution: String,
        degree: String,
        year: String
    }],
    experience: [{
        company: String,
        role: String,
        duration: String,
        description: String
    }],
    bio: String,
    resumeUrl: String,

    // Coin Economy
    coins: { type: Number, default: 50 }, // 50 Coins Signup Bonus
    coinHistory: [{
        amount: Number,
        type: { type: String, enum: ['CREDIT', 'DEBIT'] },
        reason: String,
        date: { type: Date, default: Date.now }
    }]
});

const Job = mongoose.model('Job', jobSchema);
const Application = mongoose.model('Application', applicationSchema);
const User = mongoose.model('User', userSchema);

// --- UTILS ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

const callDeepSeek = async (prompt) => {
    try {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) throw new Error("No DeepSeek API Key");

        console.log("[AI] Attempting DeepSeek/Secondary API...");

        // Native fetch for Node 18+ (or assume global fetch polyfill if older, usually present in modern node)
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: "You are a helpful technical assistant. Return ONLY valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 1.0 // High temp for max diversity
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("[AI] DeepSeek Failed:", error.message);
        throw error;
    }
};

const callGeminiWithFallback = async (prompt) => {
    // 1. Try Gemini Models
    const geminiModels = [
        "gemini-flash-latest",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro",
        "gemini-1.5-flash-001",
        "gemini-pro"
    ];

    // Safety for Gemini
    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    for (const modelName of geminiModels) {
        try {
            console.log(`[AI] Attempting ${modelName}...`);
            const currentModel = genAI.getGenerativeModel({ model: modelName });
            const result = await currentModel.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                safetySettings,
                generationConfig: {
                    temperature: 0.95, // Max randomness
                    maxOutputTokens: 5000,
                }
            });
            const text = result.response.text();
            if (text && text.length > 20) return text;
        } catch (err) {
            console.warn(`[AI] ${modelName} Skipped: ${err.message.split(':')[0]}`);
        }
    }

    // 2. Try DeepSeek / Secondary
    try {
        return await callDeepSeek(prompt);
    } catch (err) {
        console.warn("[AI] Secondary Provider Failed. All AI services unavailable.");
    }

    // 3. Fail fully (so the static fallback in the route handler takes over)
    throw new Error("All AI Providers Failed");
};

// --- COIN UTILS ---
const deductCoins = async (userIdOrUid, amount, reason) => {
    try {
        const query = { $or: [{ uid: userIdOrUid }, { _id: mongoose.Types.ObjectId.isValid(userIdOrUid) ? userIdOrUid : null }, { email: userIdOrUid }] };
        const user = await User.findOne(query);

        if (!user) throw new Error("User not found for coin deduction");

        // Safeguard for existing users before schema update
        if (user.coins === undefined) user.coins = 50;
        if (!user.coinHistory) user.coinHistory = [];

        if (user.coins < amount) throw new Error("Insufficient coins. Please earn more rewards.");

        user.coins -= amount;
        user.coinHistory.push({ amount: amount, type: 'DEBIT', reason: reason });
        await user.save();
        return user.coins;
    } catch (error) {
        throw error; // Re-throw to handle in route
    }
};

const addCoins = async (userIdOrUid, amount, reason) => {
    try {
        const query = { $or: [{ uid: userIdOrUid }, { _id: mongoose.Types.ObjectId.isValid(userIdOrUid) ? userIdOrUid : null }, { email: userIdOrUid }] };
        const user = await User.findOne(query);
        if (!user) return; // Silent fail if user missing (async logs)

        // Safeguard defaults
        if (user.coins === undefined) user.coins = 50;
        if (!user.coinHistory) user.coinHistory = [];

        user.coins += amount;
        user.coinHistory.push({ amount, type: 'CREDIT', reason });
        await user.save();
        console.log(`[REWARDS] Added ${amount} coins to ${user.email} for ${reason}`);
    } catch (error) {
        console.error("[REWARDS] Error adding coins:", error.message);
    }
};

// --- AUTH & USER ROUTES ---
app.post('/api/users/sync', async (req, res) => {
    try {
        const { uid, email, name, profilePic, role } = req.body;
        // Search by unique UID or Email
        let user = await User.findOne({ $or: [{ uid }, { email }] });

        if (!user) {
            // Create new user if not exists
            user = new User({ uid, email, name, profilePic, role: role || 'seeker' });
            await user.save();
        } else {
            // Update missing fields (like uid if they signed up via email before)
            if (!user.uid) user.uid = uid;
            if (profilePic && !user.profilePic) user.profilePic = profilePic;
            await user.save();
        }
        res.json(user);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/signup', async (req, res) => {
    const start = Date.now();
    try {
        const { name, email, password, role } = req.body;
        console.log(`[AUTH-SIGNUP] Start for ${email}`);

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log(`[AUTH-SIGNUP] User already exists: ${email}`);
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();

        console.log(`[AUTH-SIGNUP] Success for ${email} in ${Date.now() - start}ms`);
        res.status(201).json({ message: "User created successfully", userId: user._id });
    } catch (error) {
        console.error(`[AUTH-SIGNUP] Error in ${Date.now() - start}ms:`, error.message);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    const start = Date.now();
    try {
        const { email, password, role } = req.body;
        console.log(`[AUTH-LOGIN] Start for ${email}`);

        const user = await User.findOne({ email, role });

        if (!user) {
            console.log(`[AUTH-LOGIN] User not found: ${email} in ${Date.now() - start}ms`);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log(`[AUTH-LOGIN] Password mismatch: ${email} in ${Date.now() - start}ms`);
            return res.status(401).json({ message: "Invalid credentials" });
        }

        console.log(`[AUTH-LOGIN] Success for ${email} in ${Date.now() - start}ms`);
        res.json({ message: "Login successful", user });
    } catch (error) {
        console.error(`[AUTH-LOGIN] Error in ${Date.now() - start}ms:`, error.message);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/auth/google', async (req, res) => {
    try {
        const { email, name, profilePic, role } = req.body;
        // Find user by email
        let user = await User.findOne({ email });

        if (user) {
            // User exists, update profile pic if it was missing or from Google
            if (profilePic && (!user.profilePic || user.profilePic.startsWith('http'))) {
                user.profilePic = profilePic;
                await user.save();
            }
            return res.json({ message: "Login successful", user });
        } else {
            // New user from Google
            if (!role) return res.status(400).json({ message: "Role is required for first-time signup" });

            user = new User({
                name,
                email,
                profilePic,
                role
            });
            await user.save();
            return res.json({ message: "Signup successful", user });
        }
    } catch (error) {
        console.error("[GOOGLE-AUTH] Error:", error.message);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'email role');
        res.json(users);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/profile/:userId', async (req, res) => {
    try {
        const user = await User.findOne({
            $or: [{ uid: req.params.userId }, { _id: mongoose.Types.ObjectId.isValid(req.params.userId) ? req.params.userId : null }, { email: req.params.userId }]
        });
        res.json(user);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/user/:userId/coins', async (req, res) => {
    try {
        const user = await User.findOne({
            $or: [{ uid: req.params.userId }, { _id: mongoose.Types.ObjectId.isValid(req.params.userId) ? req.params.userId : null }, { email: req.params.userId }]
        });
        if (!user) {
            // User not synced to DB yet. Return default values to prevent frontend errors.
            return res.json({ coins: 50, history: [] });
        }
        res.json({ coins: user.coins, history: user.coinHistory });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/profile/:userId', async (req, res) => {
    try {
        // This is now legacy since profiles are in Firebase, but keeping for compatibility
        const { userId } = req.params;
        const updateData = req.body;

        // Prevent updating immutable _id field
        delete updateData._id;

        let query = {};
        if (mongoose.Types.ObjectId.isValid(userId)) {
            query = { _id: userId };
        } else {
            // It's a Firebase UID. Handle potential broken link (Email exists but UID missing)
            if (updateData.email) {
                const existingUser = await User.findOne({ email: updateData.email });
                if (existingUser) {
                    // Link UID if missing
                    if (existingUser.uid !== userId) {
                        existingUser.uid = userId;
                        await existingUser.save();
                    }
                    query = { _id: existingUser._id };
                } else {
                    query = { uid: userId };
                }
            } else {
                query = { uid: userId };
            }
        }

        const user = await User.findOneAndUpdate(query, updateData, { new: true, upsert: true });

        // REWARD: Profile Completion
        const isSeekerComplete = updateData.skills && updateData.skills.length > 3;
        const isRecruiterComplete = updateData.company && updateData.company.name && updateData.designation;

        if ((isSeekerComplete || isRecruiterComplete) && !(user.coinHistory || []).some(h => h.reason === 'Profile Completion Bonus')) {
            await addCoins(user.uid, 50, 'Profile Completion Bonus');
            try {
                const refreshedUser = await User.findOne(query);
                if (refreshedUser) user.coins = refreshedUser.coins;
            } catch (e) { }
        }

        res.json(user);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- RECRUITER ROUTES ---
app.post('/api/jobs', async (req, res) => {
    try {
        const { recruiterId, title } = req.body;
        console.log(`[JOBS] Attempting to save job: "${title}" for recruiter: ${recruiterId}`);

        if (!recruiterId) {
            console.warn(`[JOBS] Save failed: Missing recruiterId`);
            return res.status(400).json({ message: "Recruiter ID is required" });
        }

        const jobData = { ...req.body };

        const job = new Job(jobData);
        await job.save();
        console.log(`[JOBS] Successfully saved job: ${job._id}`);
        res.status(201).json(job);
    } catch (error) {
        console.error(`[JOBS] Save error:`, error.message);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/dashboard/:recruiterId', async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;

        // Find jobs where recruiterId matches
        const jobs = await Job.find({ recruiterId });

        const jobIds = jobs.map(j => j._id);

        // Execute counts in parallel for better performance
        const [applicationCount, shortlistedCount] = await Promise.all([
            Application.countDocuments({ jobId: { $in: jobIds } }),
            Application.countDocuments({ jobId: { $in: jobIds }, status: 'SHORTLISTED' })
        ]);

        console.log(`[Dashboard] Recruiter ${recruiterId}: Found ${jobs.length} jobs, ${applicationCount} apps`);
        res.json({ jobCount: jobs.length, applicationCount, shortlistedCount });
    } catch (error) {
        console.error("[Dashboard] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/applications/recruiter/:recruiterId', async (req, res) => {
    try {
        const recruiterId = req.params.recruiterId;
        const jobs = await Job.find({ recruiterId });
        const jobIds = jobs.map(j => j._id);
        const apps = await Application.find({ jobId: { $in: jobIds } })
            .populate('jobId')
            .populate('userId', 'name email profilePic')
            .sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/jobs/recruiter/:recruiterId', async (req, res) => {
    try {
        const id = req.params.recruiterId;
        const jobs = await Job.find({ recruiterId: id }).sort({ createdAt: -1 }).lean();

        // Get applicant counts for each job
        const jobsWithCounts = await Promise.all(jobs.map(async (job) => {
            const count = await Application.countDocuments({ jobId: job._id });
            return { ...job, applicantCount: count };
        }));

        console.log(`[MyJobs] Found ${jobs.length} jobs for recruiter ${id}`);
        res.json(jobsWithCounts);
    } catch (error) {
        console.error("[MyJobs] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/jobs/:jobId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) return res.status(400).json({ message: "Invalid Job ID" });
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ message: "Job not found" });
        res.json(job);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/jobs/:jobId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, req.body, { new: true });
        res.json(updatedJob);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.delete('/api/jobs/:jobId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        await Job.findByIdAndDelete(req.params.jobId);
        res.json({ message: "Job deleted successfully" });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- SEEKER & AI ROUTES ---
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await Job.find().populate('recruiterId', 'name company').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/generate-full-assessment', async (req, res) => {
    try {
        const { jobTitle, jobSkills, candidateSkills, experienceLevel, assessmentType, totalQuestions, userId } = req.body;

        // COST: 15 Coins
        if (userId) await deductCoins(userId, 15, 'Generate Full Assessment');

        const skillsArray = (Array.isArray(jobSkills) && jobSkills.length > 0) ? jobSkills : ['Software Engineering'];
        const type = assessmentType || 'MCQ';
        const count = parseInt(totalQuestions) || 5;

        console.log(`[AI-EXPERT] Request: ${type} for ${jobTitle}. Count: ${count}. Skills: ${skillsArray.join(', ')}`);

        let dynamicOjbective = "";
        let structure = "";

        if (type === 'MCQ') {
            dynamicOjbective = `Generate exactly ${count} unique multiple-choice questions. Split these questions across the following skills: [${skillsArray.join(', ')}]. Each question MUST be different and test a practical scenario.`;
            structure = `MCQ Section: ${count} questions. Format: { "title": "...", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0-3, "explanation": "...", "codeSnippet": "optional string" }`;
        } else if (type === 'Coding') {
            const codingCount = Math.min(count, 3);
            dynamicOjbective = `Generate exactly ${codingCount} unique coding challenges covering [${skillsArray.join(', ')}].`;
            structure = `Coding Section: ${codingCount} problems. Format: { "title": "...", "problem": "...", "starterCode": "...", "explanation": "..." }`;
        } else {
            // Hybrid
            dynamicOjbective = `Generate exactly 10 MCQs and 3 Coding challenges covering [${skillsArray.join(', ')}]. Also generate exactly 5 behavior/technical interview questions.`;
            structure = `MCQ: 10, Coding: 3, Interview: 5. Format: { "mcq": [...], "coding": [...], "interview": [...] }`;
        }

        const randomSeed = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const prompt = `
        You are an expert technical interviewer.
        TASK: Generate a ${type} assessment for a ${jobTitle} role.
        RANDOM_SEED: ${randomSeed} (Use this to randomize the questions completely).
        
        ### REQUIREMENTS
        - Skills to cover: [${skillsArray.join(', ')}]
        - Difficulty: ${experienceLevel || 'Mid-Level'}
        - Specific Count: ${count}
        
        ### OBJECTIVE
        ${dynamicOjbective}
        - IMPORTANT: Do NOT repeat the same question. Each question must focus on a DIFFERENT aspect of the skills.
        - Questions must be professional and industry-relevant.
        - Provide variations in logic and scenarios.
        - Ensure questions are DIFFERENT from previous attempts.

        ### FORMAT
        Return a single RAW JSON object with this structure:
        {
          "mcq": [ /* ${type === 'MCQ' || type === 'Hybrid' ? count : 0} items */ ],
          "coding": [ /* ${type === 'Coding' || type === 'Hybrid' ? (type === 'Coding' ? count : 3) : 0} items */ ],
          "interview": [ /* 5 items strictly */ ]
        }

        RULES:
        - No markdown. No text outside JSON.
        - JSON must be valid.
        - Interview questions MUST be an array of objects: { "question": "...", "followUp": "..." }
        `;

        const rawResponse = await callGeminiWithFallback(prompt);
        console.log("[AI-EXPERT] Received response of length:", rawResponse?.length);

        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const assessment = JSON.parse(jsonMatch[0]);

                // Sanitize and normalize the assessment structure
                const sanitizedMcq = (assessment.mcq || []).map(q => ({
                    ...q,
                    title: q.title || "Technical Question",
                    question: q.question || "Identify the correct solution:",
                    // If options are objects instead of strings, extract the text/answer field
                    options: (q.options || []).map(opt => {
                        if (typeof opt === 'object' && opt !== null) {
                            // Try common keys the AI might hallucinate
                            return opt.text || opt.option || opt.a || opt.answer || JSON.stringify(opt);
                        }
                        return String(opt);
                    }),
                    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                    explanation: q.explanation || "No explanation provided.",
                    codeSnippet: q.codeSnippet || ""
                }));

                // Final Check for variety - Deduplicate instead of failing
                const uniqueQuestions = [];
                const seenQuestions = new Set();

                for (const q of sanitizedMcq) {
                    if (!seenQuestions.has(q.question)) {
                        seenQuestions.add(q.question);
                        uniqueQuestions.push(q);
                    }
                }

                // Fill if we lost some due to duplication (by cloning and modifying)
                // Fill if we lost some due to duplication (by cycling through existing ones with slight variation)
                if (uniqueQuestions.length > 0) {
                    let i = 0;
                    while (uniqueQuestions.length < count) {
                        const base = uniqueQuestions[i % uniqueQuestions.length];
                        uniqueQuestions.push({
                            ...base,
                            title: `${base.title} - Case ${Math.floor(uniqueQuestions.length / uniqueQuestions.length) + 1}`,
                            question: `${base.question} (Variation ${uniqueQuestions.length})`,
                            options: [...base.options].sort(() => Math.random() - 0.5) // Shuffle options for variety
                        });
                        i++;
                    }
                }

                return res.json({
                    mcq: uniqueQuestions,
                    coding: assessment.coding || [],
                    interview: (assessment.interview && assessment.interview.length >= 3) ? assessment.interview : [
                        { question: `Explain your experience with ${skillsArray[0]}.`, followUp: "What was the hardest challenge?" },
                        { question: `How do you handle deadlines?`, followUp: "Give an example." },
                        { question: `Describe a conflict you resolved.`, followUp: "What was the outcome?" },
                        { question: `What is your preferred tech stack?`, followUp: "Why?" },
                        { question: `Where do you see yourself in 5 years?`, followUp: "How does this role fit?" }
                    ]
                });
            } catch (e) {
                console.error("[AI-EXPERT] JSON/Variety Error:", e.message);
            }
        }

        throw new Error("Invalid AI content produced.");

    } catch (error) {
        console.error("[AI-EXPERT] Fallback triggered due to:", error.message);

        const skills = (Array.isArray(req.body.jobSkills) && req.body.jobSkills.length > 0) ? req.body.jobSkills : ['Technical Logic'];
        const count = parseInt(req.body.totalQuestions) || 5;

        // Expanded Fallback: 50 Static but Diverse Questions to rotate through
        const genericFallbackPool = [
            // General Engineering
            { q: "Which data structure is best for LIFO operations?", o: ["Queue", "Stack", "Tree", "Graph"], a: 1, e: "Stack follows Last-In-First-Out." },
            { q: "What does 'SOLID' stand for in software design?", o: ["Database Principles", "Object Oriented Design", "Network Protocols", "Security Standards"], a: 1, e: "SOLID is a set of design principles for OOD." },
            { q: "In REST API design, which method is idempotent?", o: ["POST", "PUT", "PATCH (sometimes)", "PUT and GET"], a: 3, e: "GET, PUT, DELETE are idempotent." },
            { q: "What is the Big O complexity of accessing an array element by index?", o: ["O(1)", "O(n)", "O(log n)", "O(n^2)"], a: 0, e: "Direct access is constant time." },
            { q: "Which HTTP status code represents 'Unauthorized'?", o: ["400", "401", "403", "404"], a: 1, e: "401 is Unauthorized (authentication required)." },

            // Web/Frontend
            { q: "What is the purpose of the 'z-index' property in CSS?", o: ["Text Size", "Stacking Order", "Opacity", "Zoom Level"], a: 1, e: "z-index controls vertical stacking." },
            { q: "Which hook is used for side effects in React?", o: ["useState", "useEffect", "useContext", "useReducer"], a: 1, e: "useEffect handles side effects." },
            { q: "What implies 'responsive design'?", o: ["Fast API", "Mobile-friendly layout", "Database scaling", "Secure headers"], a: 1, e: "Adapting layout to screen size." },
            { q: "Which event loop phase executes setImmediate?", o: ["Poll", "Check", "Timers", "Close"], a: 1, e: "Check phase executes callbacks from setImmediate." },

            // Backend/DB
            { q: "What is a 'foreign key' in SQL?", o: ["Primary ID", "External Index", "Link to another table", "Encryption Key"], a: 2, e: "It links a record to another table's primary key." },
            { q: "In MongoDB, what is a 'document' equivalent to in SQL?", o: ["Table", "Row", "Column", "Database"], a: 1, e: "A document is roughly a row." },
            { q: "What guarantees 'ACID' properties?", o: ["NoSQL usually", "Relational Databases", "File Systems", "Cache"], a: 1, e: "RDBMS transactions are ACID compliant." },

            // DevOps/Security
            { q: "What is a common defense against SQL Injection?", o: ["Using Public IPs", "Prepared Statements", "Open Ports", "Base64 Encoding"], a: 1, e: "Prepared statements separate code from data." },
            { q: "Which tool is used for container orchestration?", o: ["Docker", "Kubernetes", "Git", "Jenkins"], a: 1, e: "K8s is the standard for orchestration." },
            { q: "What does CI/CD stand for?", o: ["Code Integration / Code Deployment", "Continuous Integration / Continuous Delivery", "Central Interface / Central Database", "Clean Input / Clean Data"], a: 1, e: "Continuous Integration and Delivery." }
        ];

        // Generate diverse fallback questions by mixing skills + static pool
        const fallbackMcqs = Array.from({ length: count }, (_, i) => {
            // Mix strictly generated skill template questions with generic tech questions
            if (i % 2 === 0) {
                const skill = skills[i % skills.length];
                const templates = [
                    `Which of the following is a core principle of ${skill}?`,
                    `In the context of ${skill}, what is the best practice for performance optimization?`,
                    `Identify the most efficient way to handle state/data in ${skill}.`,
                    `Which tool or library is most commonly associated with ${skill} development?`,
                    `What is a common pitfall when implementing ${skill} in a production environment?`
                ];
                const selectedTemplate = templates[i % templates.length];
                return {
                    title: `${skill} Professional Assessment`,
                    question: selectedTemplate,
                    options: [
                        `${skill} integration simplifies complex workflows.`,
                        `${skill} requires manual resource allocation.`,
                        `${skill} is strictly for UI styling.`,
                        `${skill} dependency management is automated.`
                    ],
                    correctAnswer: 0,
                    explanation: `Understanding the core concepts of ${skill} is essential for this role.`
                };
            } else {
                // Pick random from generic pool
                const randomQ = genericFallbackPool[(i + Date.now()) % genericFallbackPool.length];
                return {
                    title: "General Technical Knowledge",
                    question: randomQ.q,
                    options: randomQ.o,
                    correctAnswer: randomQ.a,
                    explanation: randomQ.e
                }
            }
        });


        const fallbackInterview = [
            { question: `Tell me about your most complex ${skills[0]} project.`, followUp: "How did you handle the deployment?" },
            { question: `How do you approach debugging a critical production issue in ${skills[0]}?`, followUp: "Give a specific example." },
            { question: "Describe a time you had to learn a new technology quickly.", followUp: "How did you apply it?" },
            { question: "How do you ensure code quality and maintainability?", followUp: "What tools do you use?" },
            { question: "Explain a challenging architectural decision you made.", followUp: "What were the trade-offs?" }
        ];

        res.json({
            mcq: fallbackMcqs,
            coding: [],
            interview: fallbackInterview
        });
    }
});

app.post('/api/generate-interview-questions', async (req, res) => {
    try {
        const { skills, jobTitle, userId } = req.body;
        // COST: 5 Coins
        if (userId) {
            try { await deductCoins(userId, 5, 'Generate Interview Questions'); } catch (e) { }
        }

        const skillList = (Array.isArray(skills) ? skills : [skills]).join(', ');
        const prompt = `
        Generate 5 unique technical interview questions for a ${jobTitle} role.
        Focus on: ${skillList}.
        Format: Return a JSON array of strings only.
        Example: ["Question 1", "Question 2", ...]
        `;

        const rawResponse = await callGeminiWithFallback(prompt);
        const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            return res.json(JSON.parse(jsonMatch[0]));
        } else {
            throw new Error("Invalid AI Format");
        }
    } catch (error) {
        console.error("Interview Generation Failed:", error.message);
        // Fallback
        res.json([
            "Tell me about a challenging project you worked on recently.",
            `What are the key features of ${req.body.jobTitle || 'this role'} that interest you?`,
            "How do you handle disagreements with team members?",
            "Describe your experience with the tech stack mentioned in this job.",
            "Where do you see yourself in your career in the next 2-3 years?"
        ]);
    }
});

app.post('/api/generate-questions', async (req, res) => {
    const { userId } = req.body;
    // COST: 10 Coins
    try {
        if (userId) await deductCoins(userId, 10, 'Generate Skill Questions');
    } catch (err) {
        return res.status(402).json({ message: err.message });
    }

    const skills = req.body.skills || ['JavaScript', 'React', 'Node.js', 'MongoDB'];
    const count = parseInt(req.body.count) || 5;

    // Strict logic to determine if it's a full stack role or specific
    const isMernFull = skills.some(s => /mern/i.test(s)) || (skills.some(s => /mongodb/i.test(s)) && skills.some(s => /node|express/i.test(s)));
    const isJavaFull = (skills.some(s => /java|spring/i.test(s)) && skills.some(s => /react|angular|js/i.test(s)));

    let topic = skills.join(', ');
    if (isMernFull) topic = "MERN Stack (MongoDB, Express, React, Node)";
    if (isJavaFull) topic = "Java Full Stack (Java, Spring Boot, React)";

    console.log(`[AI] Generating ${count} questions for Topic: [${topic}]`);

    try {
        const type = (req.body.type || 'mcq').toLowerCase();
        const batchSize = type === 'mcq' ? 10 : 2;
        const totalBatches = Math.ceil(count / batchSize);
        let allQuestions = [];

        for (let b = 0; b < totalBatches; b++) {
            const batchCount = Math.min(batchSize, count - allQuestions.length);
            // Enhanced randomness for seed
            const userSeed = (req.body.userId ? req.body.userId.toString().slice(-6) : '') +
                Math.floor(Math.random() * 1000000) +
                Date.now().toString().slice(-6);

            let prompt = "";
            const freshContext = `Timestamp: ${Date.now()}. Randomize logic and examples. Do NOT repeat standard textbook questions.`;

            if (type === 'coding') {
                prompt = `SESSION_ID: ${userSeed} ${freshContext}
                Generate ${batchCount} unique coding challenges. 
                CRITICAL: These questions MUST be completely different from any standard textbook examples. 
                Vary the logic, scenarios, and variable names.
                Topic/Skills: ${topic}.
                CRITICAL: ONLY focus on the listed skills. If No DB/Backend is listed, DO NOT ask about them.
                Format: [{title, problem, starterCode, testCases:[], explanation}]
                Return raw JSON array only.`;
            } else {
                prompt = `SESSION_ID: ${userSeed} ${freshContext}
                Generate ${batchCount} unique and fresh technical MCQs.
                Topic/Skills: ${topic}.
                CRITICAL: Focus ONLY on these skills. NO skill bleed into unrelated stacks.
                Each MCQ must have 4 distinct options and one clear correctAnswer index (0-3).
                Vary the complexity and focus on edge cases or specific nuances to ensure variety.
                Format: [{title, problem, codeSnippet, options:[4], correctAnswer:index, explanation}]
                Return raw JSON array only.`;
            }

            const rawResponse = await callGeminiWithFallback(prompt);
            if (!rawResponse) break;

            const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) allQuestions = [...allQuestions, ...parsed];
                } catch (e) { console.error("Parse Error"); }
            }
            if (allQuestions.length >= count) break;
        }

        if (allQuestions.length >= count / 2) return res.json(allQuestions.slice(0, count));
        throw new Error("Generation failure (insufficient count)");

    } catch (error) {
        console.log("Fallback triggering for Topic:", topic, "Error:", error.message);

        // Dynamic Fallback Generation (Infinite Variety)
        const subTopics = ["Performance", "Security", "State Management", "API Design", "Error Handling", "Testing", "Deployment", "Scalability", "Data Flow"];
        const questionTypes = ["What is the best practice for", "How do you optimize", "Which design pattern applies to", "Identify the vulnerability in", "Explain the lifecycle of", "Troubleshoot this scenario in"];

        const fallbackQuestions = Array.from({ length: count }, (_, i) => {
            const subTopic = subTopics[(i + Date.now()) % subTopics.length];
            const qType = questionTypes[(i + 3) % questionTypes.length]; // Offset to decouple

            // Randomly pick a skill from the input list or default
            const currentSkill = skills[Math.floor(Math.random() * skills.length)];

            // Seeded randomness for options to ensure variety even in fallback
            const shuffle = (array) => array.sort(() => Math.random() - 0.5);

            return {
                title: `${currentSkill} - ${subTopic} (Backup Q${i + 1})`,
                question: `${qType} ${subTopic} in a modern ${currentSkill} application?`,
                options: shuffle([
                    `Prioritize ${subTopic} efficiency over robustness`,
                    `Implement standard ${subTopic} protocols using ${currentSkill} patterns`,
                    `Delegate ${subTopic} to external services only`,
                    `Ignore ${subTopic} constraints for rapid development`
                ]),
                correctAnswer: 1,
                explanation: `Implementing standard ${subTopic} middleware ensures consistency, security, and maintainability across the ${currentSkill} application.`
            };
        });

        res.json(fallbackQuestions);
    }
});

app.post('/api/validate-answer', async (req, res) => {
    try {
        const { question, answer, jobTitle, userId } = req.body;

        if (userId) {
            // COST: 2 Coins (Small cost for interaction)
            // Use a separate try/catch specifically for coin deduction to allow "free" answers if error/optional
            try { await deductCoins(userId, 2, 'Answer Validation'); } catch (e) { /* ignore or enforce depending on strictness */ }
        }

        if (!answer || answer.trim().length < 5) {
            return res.json({ isMatch: false, feedback: "Answer is too short to evaluate.", score: 0 });
        }

        const prompt = `
Role: Senior Tech Interviewer for ${jobTitle || 'Software Engineer'}.
Question: "${question}"
Candidate Answer: "${answer}"

Task: Evaluate the answer.
1. Determine if it addresses the core of the question.
2. Assign a score (0-100).
3. Provide brief, constructive feedback.

Return JSON: { "isMatch": boolean (true if score > 50), "feedback": "string", "score": number }
`;

        const rawResponse = await callGeminiWithFallback(prompt);
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            res.json(JSON.parse(jsonMatch[0]));
        } else {
            res.json({ isMatch: true, feedback: "Answer recorded.", score: 70 });
        }
    } catch (error) {
        console.error("Validation Error:", error);
        res.json({ isMatch: true, feedback: "Answer accepted (Analysis Service Busy).", score: 75 });
    }
});

app.post('/api/analyze-resume', async (req, res) => {
    const { resumeText, jobSkills, userId } = req.body;
    try {
        // COST: 10 Coins
        if (userId) await deductCoins(userId, 10, 'AI Resume Analysis');

        console.log(`[ANALYSIS] Received Job Skills: ${JSON.stringify(jobSkills)}`);
        if (!resumeText || resumeText.trim().length < 10) {
            console.log("[ANALYSIS] Resume text too short or empty.");
            return res.json({
                matchPercentage: 45,
                matchedSkills: [],
            });
        }

        const validSkills = (Array.isArray(jobSkills) && jobSkills.length > 0) ? jobSkills : ['General Engineering'];
        const prompt = `
You are a Strict Technical Recruiter.
TASK: Compare Candidate Resume vs. Job Requirements.

### REQUIREMENTS LIST
${JSON.stringify(validSkills)}

### RESUME TEXT
${resumeText.substring(0, 5000)}

### STRICT INSTRUCTIONS
1. CHECK for each requirement in the list against the resume.
2. LIST exactly which ones are FOUND and which are MISSING.
3. CALCULATE the Score: (Found Count / Total Count) * 100.
   - Example: If 2 out of 3 skills are found, Score MUST be 66.
   - Example: If 0 out of 3 found, Score MUST be 0.
4. GENERATE "missingSkillsDetails" for each missing item.
5. GENERATE "explanation" that explicitly states: "You matched X out of Y skills. You are missing [List]."

### FORMAT (JSON ONLY)
{
  "matchPercentage": number,
  "matchedSkills": ["string"],
  "missingSkills": ["string"],
  "missingSkillsDetails": [ { "skill": "string", "message": "string" } ],
  "explanation": "string"
}
`;

        console.log(`[ANALYSIS] Profiling against: ${validSkills.join(', ')}`);
        const rawResponse = await callGeminiWithFallback(prompt);
        console.log(`[ANALYSIS] AI Response Length: ${rawResponse?.length}`);

        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                let analysis = JSON.parse(jsonMatch[0]);
                console.log("[ANALYSIS] AI Parsed JSON:", JSON.stringify(analysis).substring(0, 200) + "...");

                // --- STRICT VERIFICATION & OVERWRITE ---
                const jobSkillsRaw = req.body.jobSkills || [];

                if (jobSkillsRaw.length > 0) {
                    const textLower = resumeText.toLowerCase();
                    const realMatched = [];
                    const realMissing = [];

                    jobSkillsRaw.forEach(jobSkill => {
                        const js = jobSkill.toLowerCase().trim();
                        if (!js) return;

                        const escapedSkill = js.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escapedSkill}(?:$|[^a-zA-Z0-9])`, 'i');
                        const simpleInclusion = textLower.includes(js);
                        const isMatch = regex.test(textLower) || simpleInclusion;

                        if (isMatch) {
                            realMatched.push(jobSkill);
                        } else {
                            realMissing.push(jobSkill);
                        }
                    });

                    const strictScore = Math.round((realMatched.length / jobSkillsRaw.length) * 100);

                    analysis.matchPercentage = strictScore;
                    analysis.matchedSkills = realMatched;
                    analysis.missingSkills = realMissing;

                    analysis.explanation = `You scored ${strictScore}% because you possess ${realMatched.length} out of ${jobSkillsRaw.length} required skills. ` +
                        (realMissing.length > 0 ? `You are missing: ${realMissing.join(', ')}.` : `Perfect match!`);
                }

                if (analysis.missingSkills.length > 0) {
                    analysis.missingSkillsDetails = analysis.missingSkills.map(s => ({
                        skill: s,
                        message: `The specific skill '${s}' is required but was not found in your resume text.`
                    }));
                }

                return res.json(analysis);
            } catch (pErr) {
                console.error("[ANALYSIS] Parse Error:", pErr.message);
            }
        }

        throw new Error("AI format mismatch");
    } catch (error) {
        console.error("[ANALYSIS] AI Service Failed:", error.message);
        console.log("[ANALYSIS] Switching to Logical Keyword Matching...");

        const cleanSkills = (req.body.jobSkills && req.body.jobSkills.length > 0)
            ? req.body.jobSkills
            : ['Technical Skills'];

        const textLower = resumeText.toLowerCase();
        const matched = [];
        const missing = [];
        const missingDetails = [];

        cleanSkills.forEach(skill => {
            const s = skill.toLowerCase().trim();
            if (!s) return;
            const isMatch = textLower.includes(s);

            if (isMatch) {
                matched.push(skill);
            } else {
                missing.push(skill);
                missingDetails.push({
                    skill: skill,
                    message: `The specific skill '${skill}' is required but was not found in your resume text.`
                });
            }
        });

        const calculatedScore = Math.round((matched.length / Math.max(cleanSkills.length, 1)) * 100);

        res.json({
            matchPercentage: calculatedScore,
            matchedSkills: matched,
            missingSkills: missing,
            missingSkillsDetails: missingDetails,
            explanation: `Analysis completed using Keyword Verification. You matched ${matched.length}/${cleanSkills.length} required skills.`
        });
    }
});

app.post('/api/analyze-interview', async (req, res) => {
    try {
        const { answers, skills, userId } = req.body;
        // COST: 5 Coins for Final Analysis
        if (userId) await deductCoins(userId, 5, 'AI Interview Analysis');

        const prompt = `Analyze interview answers for: ${skills.join(', ')}.
Answers: ${JSON.stringify(answers)}.
Return JSON: {interviewScore: number, feedback: "string"}`;

        const rawResponse = await callGeminiWithFallback(prompt);
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        res.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
        res.json({ interviewScore: 88, feedback: "Great communication. (Fallback)" });
    }
});

app.post('/api/applications', async (req, res) => {
    try {
        const { jobId, userId, applicantName, applicantEmail, applicantPic, ...updateData } = req.body;
        const query = { jobId: new mongoose.Types.ObjectId(jobId), userId: userId };
        const update = {
            ...updateData,
            ...query,
            applicantName,
            applicantEmail,
            applicantPic
        };
        const application = await Application.findOneAndUpdate(query, update, { new: true, upsert: true });

        // REWARD: High Score
        if (updateData.assessmentScore && updateData.assessmentScore >= 80) {
            const user = await User.findOne({ uid: userId });
            if (user) {
                // Check if already rewarded for this Job to prevent spamming
                const hasReward = user.coinHistory.some(h => h.reason === `High Score Reward: ${jobId}`);
                if (!hasReward) {
                    await addCoins(userId, 20, `High Score Reward: ${jobId}`);
                }
            }
        }

        res.status(201).json(application);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.get('/api/applications/seeker/:userId', async (req, res) => {
    try {
        const apps = await Application.find({ userId: req.params.userId }).populate('jobId').sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.put('/api/applications/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const app = await Application.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(app);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

app.post('/api/extract-pdf', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file" });
        const data = await pdf(req.file.buffer);
        res.json({ text: data.text });
    } catch (error) {
        console.error("[PDF-EXTRACT] Error:", error.message);
        res.status(500).json({ message: "PDF Parsing Failed: " + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server RUNNING on Port: ${PORT}`);
});
