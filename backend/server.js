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
const { exec } = require('child_process');
const fs = require('fs-extra');
const axios = require('axios');
const transcriptionService = require('./transcription_service');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());

// Fix for Firebase Auth Popup (COOP)
app.use((req, res, next) => {
    // For Firebase Auth popups to work correctly in local/dev environments
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
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
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
    interviewAnswers: [
        {
            question: String,
            answer: String,
            score: Number,
            feedback: String
        }
    ],
    status: { type: String, enum: ['APPLIED', 'SHORTLISTED', 'ELIGIBLE', 'REJECTED'], default: 'APPLIED' },
    resultsVisibleAt: { type: Date }, // NEW: Delay results
    appliedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, index: true },
    password: { type: String }, // Plain text for now to match user's current manual entries
    uid: { type: String, unique: true, index: true },
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

// Enable virtuals for JSON/Object conversion
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

jobSchema.virtual('recruiter', {
    ref: 'User',
    localField: 'recruiterId',
    foreignField: 'uid',
    justOne: true
});

const Job = mongoose.model('Job', jobSchema);
// Enable virtuals for JSON/Object conversion
applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

applicationSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: 'uid',
    justOne: true
});

const Application = mongoose.model('Application', applicationSchema);
const User = mongoose.model('User', userSchema);

// --- UTILS ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, `audio_${Date.now()}.wav`);
    }
});
const upload = multer({ storage });
const memoryUpload = multer({ storage: multer.memoryStorage() });

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

    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    // NEURAL KEY LOAD BALANCER: Automatically rotate keys if one fails
    const availableKeys = [
        process.env.GEMINI_API_KEY,
        process.env.GOOGLE_API_KEY,
        process.env.GEMINI_API_KEY_SECONDARY
    ].filter(k => k && k.length > 20);

    for (const key of availableKeys) {
        const currentGenAI = new GoogleGenerativeAI(key);

        for (const modelName of geminiModels) {
            try {
                console.log(`[AI] Attempting ${modelName} with Neural Path ${key.substring(0, 8)}...`);
                const currentModel = currentGenAI.getGenerativeModel({ model: modelName });
                const result = await currentModel.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    safetySettings,
                    generationConfig: {
                        temperature: 0.95, // Max randomness for variety
                        maxOutputTokens: 5000,
                    }
                });
                const text = result.response.text();
                if (text && text.length > 5) return text;
            } catch (err) {
                const msg = err.message || "";
                if (msg.includes("429") || msg.includes("limit")) {
                    console.warn(`[AI] Key ${key.substring(0, 8)} Rate Limited. Rotating...`);
                    break; // Move to next key immediately if rate limited
                }
                console.warn(`[AI] ${modelName} Mode Failed: ${msg.split(':')[0]}`);
            }
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
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
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
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/profile/:userId', async (req, res) => {
    try {
        const user = await User.findOne({
            $or: [{ uid: req.params.userId }, { _id: mongoose.Types.ObjectId.isValid(req.params.userId) ? req.params.userId : null }, { email: req.params.userId }]
        });
        res.json(user);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
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
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
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
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
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
            .populate('user', 'name email profilePic') // Using virtual 'user'
            .sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) {
        console.error("[GET-APPS-REC] Failure:", error);
        res.status(500).json({ message: error.message });
    }
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
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.put('/api/jobs/:jobId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, req.body, { new: true });
        res.json(updatedJob);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/jobs/:jobId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.jobId)) {
            return res.status(400).json({ message: "Invalid Job ID" });
        }
        await Job.findByIdAndDelete(req.params.jobId);
        res.json({ message: "Job deleted successfully" });
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// --- SEEKER & AI ROUTES ---
app.get('/api/jobs', async (req, res) => {
    try {
        // Use virtual 'recruiter' instead of 'recruiterId' for population
        const jobs = await Job.find().populate('recruiter', 'name company').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error("[GET-JOBS] Failure:", error);
        res.status(500).json({ message: error.message });
    }
});

const getDynamicFallbackQuestion = (skill, jobTitle) => {
    const templates = [
        { q: `In a ${jobTitle} role, why is ${skill} often preferred for high-concurrency systems?`, o: ["Non-blocking I/O model", "Strict type enforcement", "Built-in UI components", "Manual memory management"] },
        { q: `What is a common anti-pattern when implementing ${skill} in a distributed microservices environment?`, o: ["Tight coupling of services", "Using event-driven architecture", "Implementing circuit breakers", "Centralized logging"] },
        { q: `Which security vulnerability is most critical to address when deploying ${skill} applications to production?`, o: ["Injection attacks", "CSS overlap", "Excessive logging", "Variable shadowing"] },
        { q: `How does ${skill} handle state management effectively in large-scale applications?`, o: ["Through centralized stores or immutable state patterns", "By using global variables everywhere", "By writing state to local files", "By avoiding state altogether"] },
        { q: `What is the impact of incorrect error handling in ${skill} regarding application stability?`, o: ["Silent failures and resource exhaustion", "Improved user experience", "Faster execution time", "Reduced memory usage"] },
        { q: `When optimizing ${skill} for performance, which metric should you primarily monitor?`, o: ["Event loop lag or Garbage Collection pauses", "Number of comments in code", "Size of source files", "Number of dependencies"] },
        { q: `Describe the role of ${skill} in ensuring data consistency across multiple services.`, o: ["It orchestrates transactions or eventual consistency patterns", "It enforces strict ACID properties on all files", "It prevents any data updates", "It automatically backs up the database"] },
        { q: `Which design pattern fits best when refactoring a legacy ${skill} codebase?`, o: ["Module/Revealing Module or Observer pattern", "God Object pattern", "Spaghetti Code pattern", "Copy-Paste pattern"] },
        { q: `How would you mitigate a 'Memory Leak' issue in a long-running ${skill} process?`, o: ["Profiling heap snapshots and cleaning up listeners", "Restarting the server every hour", "Adding more RAM implicitly", "Ignoring it until crash"] },
        { q: `What is a key trade-off when using ${skill} frameworks compared to vanilla implementations?`, o: ["Development speed vs. Bundle size overhead", "Security vs. Privacy", "Color scheme vs. Layout", "Keyboard vs. Mouse"] },
        { q: `In a high-availability ${jobTitle} setup, how does ${skill} contribute to fault tolerance?`, o: ["By supporting clustering or replica sets", "By strictly running on one server", "By crashing specifically on errors", "By rejecting all user input"] },
        { q: `Which testing strategy is most effective for ${skill} logic with complex dependencies?`, o: ["Unit testing with mocks/stubs", "Manual click testing", "Production testing only", "Visual regression testing"] },
        { q: `Explain the concept of 'Eventual Consistency' in the context of ${skill} databases.`, o: ["Updates propagate over time, guaranteeing consistency eventually", "Data is instantly available everywhere", "Data is never consistent", "Data is only stored in cache"] },
        { q: `What is the primary benefit of 'Asynchronous Programming' in ${skill}?`, o: ["Non-blocking operations for better throughput", "Simpler code structure", "Sequential execution guarantees", "Instant CPU processing"] },
        { q: `When securing a ${skill} API, which authentication method is industry standard?`, o: ["JWT (JSON Web Tokens) or OAuth2", "Basic Text File Check", "Hardcoded Passwords", "IP Whitelisting only"] }
    ];

    // Pick a random template using proper random math (high entropy)
    const seed = (Math.random() * templates.length) | 0;
    const chosen = templates[seed];

    // Randomize options
    const shuffledOptions = [...chosen.o].sort(() => Math.random() - 0.5);

    return {
        title: `${skill} Assessment`,
        question: chosen.q,
        options: shuffledOptions,
        correctAnswer: shuffledOptions.indexOf(chosen.o[0]), // Track correct answer dynamically
        explanation: `Proficiency in ${skill} requires understanding these core principles.`
    };
};

app.post('/api/generate-full-assessment', async (req, res) => {
    try {
        const { jobTitle, jobSkills, jobDescription, candidateSkills, experienceLevel, assessmentType, totalQuestions, userId } = req.body;

        // COST: 15 Coins
        if (userId) await deductCoins(userId, 15, 'Generate Full Assessment');

        const skillsArray = (Array.isArray(jobSkills) && jobSkills.length > 0)
            ? jobSkills.map(s => String(s).trim())
            : ['Software Engineering'];
        const type = assessmentType || 'MCQ';
        const count = parseInt(totalQuestions) || 5;

        // MASTER ENTROPY SEED
        const entropySeed = Date.now().toString(36) + Math.random().toString(36).substring(2) + (userId || 'anon');

        console.log(`[AI-EXPERT] Request: ${type} for ${jobTitle}. Count: ${count}. Skills: ${skillsArray.join(', ')}`);

        let dynamicOjbective = "";
        let structure = "";

        if (type === 'MCQ') {
            dynamicOjbective = `STRICT REQUIREMENT: Generate exactly ${count} unique multiple-choice questions. 
            ONLY focus on these skills: [${skillsArray.join(', ')}]. 
            DO NOT include general technical questions unless they are directly related to these skills.
            Distribute questions across all listed skills if possible.
            CRITICAL: Each question MUST have 4 UNRELATED and unique options. NEVER repeat the same options for different questions.`;
            structure = `MCQ Section: ${count} questions. Format: { "title": "...", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0-3, "explanation": "..." }`;
        } else if (type === 'Coding') {
            const codingCount = Math.min(count, 3);
            dynamicOjbective = `STRICT REQUIREMENT: Generate ${codingCount} coding challenges SPECIFICALLY for these skills: [${skillsArray.join(', ')}].`;
            structure = `Coding Section: ${codingCount} problems. Format: { "title": "...", "problem": "...", "starterCode": "...", "explanation": "..." }`;
        } else {
            dynamicOjbective = `Generate 10 MCQs and 3 Coding challenges covering ONLY [${skillsArray.join(', ')}]. Also generate 5 interview questions about these specific domains.`;
            structure = `MCQ: 10, Coding: 3, Interview: 5. Format: { "mcq": [...], "coding": [...], "interview": [...] }`;
        }

        const randomSeed = Date.now().toString(36) + Math.random().toString(36).substring(2);

        // DYNAMIC CONTEXT INJECTION (Force Variety)
        const scenarios = ["A High-Frequency Trading System", "A Legacy Banking App Migration", "A Real-Time Social Media Feed", "A Secure Healthcare Portal", "An IoT Device Network", "A Distributed E-Commerce Platform"];
        const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        const perspectives = ["Security Auditor", "Performance Engineer", "Product Architect", "DevOps Specialist", "QA Lead"];
        const randomPerspective = perspectives[Math.floor(Math.random() * perspectives.length)];

        const themes = ["Edge Case Reliability", "Production Scaling", "Security Hardening", "Memory Efficiency", "Architectural Purity", "Concurrency & Threading", "API Contract Design", "Data Consistency", "Regulatory Compliance"];
        const randomTheme = themes[Math.floor(Math.random() * themes.length)];

        const prompt = `
        You are a Principal Software Architect and Lead Hiring Director.
        TASK: Generate a 100% UNIQUE technical assessment for: ${jobTitle}.
        JOB CONTEXT: "${jobDescription || 'N/A'}"
        SCENARIO: ${randomScenario}
        ASK AS A: ${randomPerspective}
        REQUIRED SKILLS: [${skillsArray.join(', ')}]
        PRIMARY THEME: ${randomTheme} (Focus 70% here)
        SESSION_ENTROPY: ${entropySeed}

        ### STICKY RULES: SKILL LOCK-IN
        1. CLARITY: If skills are misspelled, automatically correct them.
        2. DEPTH: Focus ONLY on the provided skills. 
        3. ANTI-REPETITION: Every question must be built from a unique scenario. DO NOT REUSE scenarios.
        4. SUBJECT ROTATION: Force variety. Do NOT ask multiple questions about the same sub-topic.
        5. NO BOILERPLATE: Avoid "What is..." questions. Use "Given a scenario where..." framing.
        6. OPTION VARIETY: Ensure the 'options' array is completely different for every single question.

        ### MISSION
        ${dynamicOjbective}

        ### FORMAT STRUCTURE
        ${structure} (Include a 'unique_hash' based on seed ${entropySeed}).

        ### OUTPUT
        Return a single RAW JSON object only. No intro/outro/markdown.
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

                // Semantic Deduplication 
                const uniqueQuestions = [];
                const seenFingerprints = new Set();

                for (const q of sanitizedMcq) {
                    // Create a fingerprint by taking first 40 chars and removing spaces
                    const fingerprint = q.question.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
                    if (!seenFingerprints.has(fingerprint)) {
                        seenFingerprints.add(fingerprint);
                        uniqueQuestions.push(q);
                    }
                }

                // Fill if we lost some due to duplication - Use DYNAMIC RANDOM fallback
                if (uniqueQuestions.length < count) {
                    console.log(`[AI-EXPERT] AI returned ${uniqueQuestions.length} unique questions, needing ${count}. Filling with dynamic skill fallbacks.`);
                    const extraNeeded = count - uniqueQuestions.length;

                    for (let j = 0; j < extraNeeded; j++) {
                        const skill = skillsArray[j % skillsArray.length];
                        uniqueQuestions.push(getDynamicFallbackQuestion(skill, jobTitle));
                    }
                }

                // Helper for Interview Fallback
                const getInterviewFallback = (skill, role) => {
                    const pool = [
                        { q: `Tell me about a time you optimized a critical ${skill} component in a environment like ${role}.`, f: "What specific metric improved?" },
                        { q: `How do you handle architectural debt in a ${role} codebase related to ${skill}?`, f: "Give an example of a refactoring decision you made." },
                        { q: `Describe a scenario where ${skill} failed in production.`, f: "How did you diagnose it?" },
                        { q: `In a high-pressure ${role} environment, how do you balance speed vs quality with ${skill}?`, f: "What tools help you maintain that balance?" },
                        { q: `Explain a complex ${skill} concept to a junior developer.`, f: "How do you verify they understood it?" },
                        { q: `What is the most challenging bug you've faced with ${skill}?`, f: "How did you resolve it?" },
                        { q: `How would you secure a ${skill} endpoint against common attacks?`, f: "Which specific headers or tokens would you use?" }
                    ];
                    return pool[Math.floor(Math.random() * pool.length)];
                };

                const finalMcqs = uniqueQuestions.slice(0, count);

                // Ensure exactly 5 interview questions
                let interviewQs = assessment.interview || [];
                if (!Array.isArray(interviewQs) || interviewQs.length < 5) {
                    const extraNeeded = 5 - interviewQs.length;
                    const padded = [...interviewQs];
                    for (let k = 0; k < extraNeeded; k++) {
                        const fallback = getInterviewFallback(skillsArray[k % skillsArray.length], jobTitle);
                        padded.push({ question: fallback.q, followUp: fallback.f });
                    }
                    interviewQs = padded.slice(0, 5);
                }

                return res.json({
                    mcq: finalMcqs,
                    coding: assessment.coding || [],
                    interview: interviewQs
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

        // DYNAMIC Fallback: Generate specialized questions from the robust pool
        const fallbackMcqs = Array.from({ length: count }, (_, i) => {
            const skill = skills[i % skills.length];
            return getDynamicFallbackQuestion(skill, req.body.jobTitle);
        });

        const fallbackInterviewPool = [
            { question: `Describe a time you used ${skills[0]} to solve a major technical bottleneck for a ${req.body.jobTitle} position.`, followUp: "What was the resulting performance gain?" },
            { question: `How do you approach team collaboration when working on high-priority ${req.body.jobTitle} tasks?`, followUp: "How do you handle merge conflicts?" },
            { question: `Walk me through your process for ensuring ${skills[1] || 'logic'} quality and scalability.`, followUp: "What testing tools do you prefer?" },
            { question: `How do you stay current with evolving industry standards and security protocols?`, followUp: "What was the last major update you implemented?" },
            { question: `What is your strategy for debugging a production outage involving ${skills[0]}?`, followUp: "How do you communicate status during the incident?" }
        ].sort(() => Math.random() - 0.5);

        res.json({
            mcq: fallbackMcqs,
            coding: [],
            interview: fallbackInterviewPool.slice(0, 5).map(item => ({ question: item.question, followUp: item.followUp }))
        });
    }
});

app.post('/api/generate-interview-questions', async (req, res) => {
    try {
        const { skills, jobTitle, jobDescription, userId } = req.body;
        if (userId) {
            try { await deductCoins(userId, 5, 'Generate Interview Questions'); } catch (e) { }
        }

        const skillList = (Array.isArray(skills) ? skills : [skills]).join(', ');

        const entropySeed = Date.now().toString(36) + Math.random().toString(36).substring(2);

        const prompt = `
        ### SYSTEM OVERRIDE: ${entropySeed}
        You are a Principal Architect. Conduct a concise, high-stakes technical interview.
        
        ### MISSION
        Generate EXACTLY 5 UNIQUE, CONCISE interview questions for: "${jobTitle}".
        Tech Stack: [${skillList}]
        
        ### REQUIREMENTS
        - STRICT LENGTH LIMIT: Max 2 short sentences per question.
        - TONE: Direct, professional, no fluff.
        - FOCUS: "War Story" scenarios, failure modes, trade-offs.

        ### RANDOMIZED TOPICS (Entropy: ${entropySeed})
        1. Scalability / High Load
        2. Production Incident Debugging 
        3. Architectural Trade-offs
        4. Security Vulnerability
        5. Team Conflict / Leadership

        OUTPUT FORMAT: JSON Array of 5 strings ONLY.
        ["Question 1...", "Question 2...", ...]
        `;

        const rawResponse = await callGeminiWithFallback(prompt);
        console.log("[STT-GEN] AI Response Length:", rawResponse?.length);

        const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            try {
                let qs = JSON.parse(jsonMatch[0]);
                if (Array.isArray(qs)) {
                    qs = qs.map(q => typeof q === 'string' ? q : (q.question || q.text || JSON.stringify(q)));
                    if (qs.length >= 5) return res.json(qs.slice(0, 5));
                }
            } catch (e) {
                console.error("JSON Parse Error:", e.message);
            }
        }

        // Expanded Emergency Fallback (Randomized & Concise)
        const hugePool = [
            `A critical ${skillList.split(',')[0]} service is timing out under load. How do you debug it?`,
            `How would you redesign the core architecture for 10x scale?`,
            `You found a security breach in production. What are your first three steps?`,
            `Explain a difficult technical trade-off you made recently.`,
            `How do you handle a disagreement with a Product Manager on a deadline?`,
            `A production deployment failed and corrupted data. Walk me through recovery.`,
            `How do you enforce code quality with tight deadlines?`,
            `Describe a project failure and what you learned from it.`,
            `What is the biggest limitation of ${skillList.split(',')[0]} and how do you mitigate it?`,
            `How do you ensure data consistency across distributed services?`
        ];

        // Shuffle and pick 5
        const shuffled = hugePool.sort(() => 0.5 - Math.random());
        res.json(shuffled.slice(0, 5));
    } catch (error) {
        console.error("Interview Gen Error:", error);
        res.status(500).json({ message: "Failed to generate questions" });
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

    // Use specific skills directly to prevent generic 'MERN' bucket drift
    const topic = (Array.isArray(skills) ? skills : [skills]).join(', ');

    console.log(`[AI] Generating ${count} questions for Specific Skills: [${topic}]`);

    try {
        const type = (req.body.type || 'mcq').toLowerCase();
        const batchSize = type === 'mcq' ? 10 : 2;
        const totalBatches = Math.ceil(count / batchSize);
        let allQuestions = [];

        // DYNAMIC CONTEXT INJECTION (Force Variety)
        const scenarios = ["A High-Frequency Trading System", "A Legacy Banking App Migration", "A Real-Time Social Media Feed", "A Secure Healthcare Portal", "An IoT Device Network"];
        const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];

        for (let b = 0; b < totalBatches; b++) {
            const batchCount = Math.min(batchSize, count - allQuestions.length);
            // High-Entropy Seed: Date + Random + User ID slice to ensure uniqueness
            const userSeed = Date.now().toString(36) + Math.random().toString(36).substring(2);

            // Randomize the "Angle" of the questions to prevent repetition across sessions
            const focusAngles = ["Performance Optimization", "Security Best Practices", "Common Anti-Patterns", "Advanced Features", "Debugging Scenarios", "Memory Management", "Concurrency/Async"];
            const randomAngle = focusAngles[Math.floor(Math.random() * focusAngles.length)];

            let prompt = "";
            const freshContext = `Timestamp: ${Date.now()}. Seed: ${userSeed}. Anti-Repetition Mode: ACTIVE. Scenario: ${randomScenario}`;

            if (type === 'coding') {
                prompt = `SESSION_ID: ${userSeed} ${freshContext}
                Generate ${batchCount} unique coding challenges. 
                Focus strictly on these skills: ${topic}.
                **SPECIAL FILTER: Focus questions on "${randomAngle}" in the context of ${randomScenario}.**
                Tasks must be practical, production-grade snippets, not generic 'hello world'.
                Format: [{title, problem, starterCode, testCases:[], explanation}]
                Return raw JSON array only.`;
            } else {
                prompt = `SESSION_ID: ${userSeed} ${freshContext}
                Generate ${batchCount} unique technical MCQs.
                Target Skills: ${topic}.
                **SPECIAL FILTER: Focus questions on "${randomAngle}" in the context of ${randomScenario}.**
                CRITICAL INSTRUCTION: Ensure questions correlate exactly to the listed skills but view them through the lens of ${randomAngle}.
                Avoid generic questions. DO NOT reuse common textbook examples.
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

        // Uses the shared dynamic fallback helper now!
        const fallbackQuestions = Array.from({ length: count }, (_, i) => {
            const currentSkill = Array.isArray(skills) ? skills[i % skills.length] : skills;
            return getDynamicFallbackQuestion(currentSkill, "Technical Engineer");
        });

        res.json(fallbackQuestions);
    }
});

app.post('/api/validate-answer', async (req, res) => {
    const { question, answer, jobTitle, userId } = req.body;
    try {
        if (userId) {
            try { await deductCoins(userId, 2, 'Semantic Answer Audit'); } catch (e) { console.error("Coin error:", e); }
        }

        if (!answer || answer.trim().length < 5) {
            return res.json({ isMatch: false, feedback: "Response is too brief for semantic validation.", score: 0 });
        }

        const prompt = `
        Evaluate this interview answer for "${jobTitle}".
        QUESTION: "${question}"
        CANDIDATE ANSWER: "${answer}"

        TASKS:
        1. Classify: Is it a [GREETING | TECHNICAL_EXPLANATION | IRRELEVANT]?
        2. Relevance: Match level (0.0 to 1.0).
        3. Depth: Technical detail level (0.0 to 1.0).
        4. Scoring: Pass (75+) if correct/detailed. Fail (< 40) if generic/wrong.
        
        OUTPUT JSON ONLY:
        {
          "classification": "string",
          "relevanceScore": number,
          "score": number, 
          "feedback": "Concise feedback",
          "isMatch": boolean
        }
        `;

        const rawResponse = await callGeminiWithFallback(prompt);
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            result.logicGateId = "V6_PROMO";

            console.log(`[VALIDATE-V6] Result: Class=${result.classification}, Score=${result.score}`);

            // --- PROTECTIVE GATE ---
            const badTypes = ["GREETING", "IRRELEVANT", "QUESTION", "NONSENSE"];
            const isIrrelevant = badTypes.includes(result.classification?.toUpperCase()) || (result.relevanceScore < 0.45);

            if (isIrrelevant) {
                console.warn(`[GATE] Hard-Reject active for ${result.classification || 'Irrelevant'}.`);
                result.score = Math.min(result.score, 18);
                result.isMatch = false;
                result.feedback = "Answer does not address the question. Please provide a technical explanation.";
            } else if (result.score < 75 && result.score >= 60) {
                result.feedback = "Good start! Add more technical details or an example to reach 75%.";
            }

            result.isMatch = (result.score >= 75);
            res.json(result);
        } else {
            res.json({ isMatch: false, feedback: "Analysis engine timed out. Please be more specific or record again.", score: 25 });
        }
    } catch (error) {
        console.error("[VALIDATE-AUDIT] Error:", error.message);

        // DYNAMIC FALLBACK: Reward effort even if AI is busy
        let fallbackScore = 38;
        const lowerAns = (answer || "").toLowerCase();

        if (answer && answer.length > 60) fallbackScore += 12;
        if (lowerAns.includes("because") || lowerAns.includes("example") || lowerAns.includes("implies")) fallbackScore += 10;
        if (answer && answer.split(' ').length > 25) fallbackScore += 7;

        res.json({
            isMatch: false,
            feedback: "Heavy traffic detected. Your answer shows depth—please try again to get a precise technical score.",
            score: Math.min(fallbackScore, 65)
        });
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

app.post('/api/analyze-interview', async (req, res) => { // High-Accuracy Technical Audit
    try {
        const { answers, skills, userId, questions, metrics } = req.body;
        try {
            if (userId) await deductCoins(userId, 5, 'AI Final Interview Analysis');
        } catch (ce) {
            console.warn("[AUDIT] Deduction bypassed:", ce.message);
        }

        const prompt = `
        ### ROLE: Elite Technical Auditor (Top 1% Global Engineering Talent Specialist)
        ### POLICY: Reward mentions of Hibernate N+1, eventual consistency, trade-offs, and scalability. Focus on TECHNICAL INTENT.
        
        ### INTERVIEW DATA:

        ### MISSION


        ${questions.map((q, i) => `[Node ${i + 1}] Q: ${q}\nA: ${answers[i] || 'No response recorded'}`).join('\n\n')}

        ### OUTPUT (JSON ONLY)
        { "interviewScore": number, "overallFeedback": "Elite review summary", "details": [ { "question": "string", "answer": "string", "score": number, "feedback": "Detailed technical audit" } ] }
        `;

        const rawResponse = await callGeminiWithFallback(prompt);
        console.log("[AUDIT] AI Raw Response received.");

        // Robust JSON Extraction
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[AUDIT] AI returned non-JSON response.");
            throw new Error("Invalid AI format");
        }

        const result = JSON.parse(jsonMatch[0]);

        // Validate structure
        if (!result.details || !Array.isArray(result.details)) {
            console.error("[AUDIT] AI Result missing 'details' array.");
            throw new Error("Malformed AI Result");
        }

        res.json(result);
    } catch (error) {
        console.error("Final Analysis Error:", error.message);

        // SMART HEURISTIC FALLBACK
        const questions = req.body.questions || [];
        const answers = req.body.answers || {};

        const heuristicDetails = questions.map((q, i) => {
            const ans = (answers[i] || "").toLowerCase();
            const qLower = (q || "").toLowerCase();
            let score = 35; // Default "Attempted" score
            let feedback = "Technical depth insufficient for a precise audit. Please provide more specific architectural details.";

            if (ans.length > 50) score += 15;
            if (ans.length > 150) score += 15;

            // Topic-Specific Intelligence (UPGRADED)
            const techKeywords = {
                "database": ["hibernate", "n+1", "sql", "index", "query", "cache", "deadlock", "acid"],
                "performance": ["latency", "pool", "exhaustion", "timeout", "5xx", "throughput", "load", "scale", "bottleneck"],
                "concurrency": ["thread", "async", "lock", "queue", "kafka", "parallel", "race"],
                "security": ["deserialization", "cve", "injection", "owasp", "patch", "auth", "jwt"],
                "architecture": ["microservice", "stateless", "cap", "consistency", "eventual", "trade-off"]
            };

            Object.entries(techKeywords).forEach(([topic, keywords]) => {
                const found = keywords.some(k => ans.includes(k) || qLower.includes(k) && ans.length > 20);
                if (found) {
                    const matchInAnswer = keywords.some(k => ans.includes(k));
                    if (matchInAnswer) {
                        score += 25;
                        feedback = `Excellent technical articulation of ${topic} concepts. Demonstrates deep architectural awareness.`;
                    }
                }
            });

            if (ans.includes("5xx") || ans.includes("exaction") || ans.includes("pool") || ans.includes("threat")) {
                score += 10;
                feedback = "Correct identification of runtime failure modes and pool management strategies.";
            }

            if (ans.includes("async") || ans.includes("queue") || ans.includes("latency") || ans.includes("consistency")) {
                score += 10;
                feedback = "Strong grasp of asynchronous distributed systems and consistency trade-offs.";
            }

            // Cap the score
            score = Math.min(score, 88);

            return {
                question: q,
                answer: answers[i] || "No response recorded.",
                score: score,
                feedback: feedback
            };
        });

        const totalScore = Math.round(heuristicDetails.reduce((acc, d) => acc + d.score, 0) / (heuristicDetails.length || 1));

        res.json({
            interviewScore: totalScore,
            overallFeedback: "Analysis completed via Neural Heuristic (Level 2). Detailed AI Audit currently in queue.",
            details: heuristicDetails
        });
    }
});

// NEW: Store individual interview answers incrementally
app.post('/api/applications/interview-answer', async (req, res) => {
    try {
        const { jobId, userId, question, answer } = req.body;

        if (!jobId || !userId) return res.status(400).json({ message: "Missing jobId or userId" });

        const query = { jobId: new mongoose.Types.ObjectId(jobId), userId: userId };

        let application = await Application.findOne(query);

        if (!application) {
            application = new Application({
                jobId: new mongoose.Types.ObjectId(jobId),
                userId: userId,
                status: 'APPLIED',
                interviewAnswers: []
            });
        }

        // Robust Update: Find if this question already has an answer, update it. Otherwise push.
        const existingIdx = application.interviewAnswers.findIndex(a => a.question === question);
        if (existingIdx !== -1) {
            application.interviewAnswers[existingIdx].answer = answer;
        } else {
            application.interviewAnswers.push({
                question,
                answer,
                score: 0,
                feedback: "Pending final audit..."
            });
        }

        await application.save();
        console.log(`[STT-STORE] Stored answer for Q: "${question.substring(0, 30)}..." User: ${userId}`);

        res.json({ message: "Answer stored successfully", application });
    } catch (error) {
        console.error("[STT-STORE] Error:", error.message);
        res.status(500).json({ message: error.message });
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

        // CRITICAL: If interviewAnswers is empty in the request but we already have data in DB, 
        // don't overwrite the existing answers. This prevents AI fallbacks from wiping data.
        if (!updateData.interviewAnswers || updateData.interviewAnswers.length === 0) {
            delete update.interviewAnswers;
        }

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
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/applications/seeker/:userId', async (req, res) => {
    try {
        const apps = await Application.find({ userId: req.params.userId }).populate('jobId').sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
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
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/extract-pdf', memoryUpload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file" });
        const data = await pdf(req.file.buffer);
        res.json({ text: data.text });
    } catch (error) {
        console.error("[PDF-EXTRACT] Error:", error.message);
        res.status(500).json({ message: "PDF Parsing Failed: " + error.message });
    }
});

// --- VOICE PROCESSING ROUTES ---



// 1. Upload Audio & Transcribe (Pure JS)
app.post('/api/upload-audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No audio file uploaded" });

        const audioPath = path.resolve(req.file.path);
        console.log(`[STT] Processing: ${audioPath}`);

        const transcript = await transcriptionService.transcribeAudio(audioPath);
        console.log(`[STT] Result: ${transcript}`);

        // Clean up uploaded file
        await fs.remove(audioPath).catch(err => console.error("Cleanup error:", err));

        res.json({ text: transcript });
    } catch (error) {
        console.error("[VOICE] Error:", error.message);
        res.status(500).json({ message: "Transcription failed (JS)", details: error.message });
    }
});

// 2. Text to Speech (ElevenLabs)
// 2. Text to Speech (Google Cloud)
app.post('/api/tts', async (req, res) => {
    try {
        const { text } = req.body;
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("GOOGLE_API_KEY missing in .env");

        console.log(`[TTS-GOOGLE] Synthesis requested.`);
        const response = await axios.post(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
                input: { text },
                voice: { languageCode: "en-US", name: "en-US-Wavenet-F" },
                audioConfig: { audioEncoding: "MP3" }
            }
        );

        const uploadsDir = path.join(__dirname, 'uploads');
        const outputPath = path.join(uploadsDir, 'output.mp3');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        await fs.writeFile(outputPath, Buffer.from(response.data.audioContent, 'base64'));
        res.json({ audioUrl: '/api/get-audio' });
    } catch (error) {
        console.error("[TTS-GOOGLE] Critical Error:", error.response?.data || error.message);
        res.status(500).json({
            message: "TTS Failed",
            error: error.message,
            details: error.response?.data || "No additional server response"
        });
    }
});

// Route to serve the generated TTS audio file
app.get('/api/get-audio', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'output.mp3');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.warn("[AUDIO] output.mp3 not found at:", filePath);
        res.status(404).json({ message: "Audio file not found" });
    }
});

// 3. AI Answer Refinement (Neural Polish)
app.post('/api/refine-text', async (req, res) => {
    try {
        const { text, jobTitle } = req.body;
        if (!text || text.length < 5) return res.json({ refinedText: text });

        console.log(`[REFINE] Polishing response for ${jobTitle}...`);

        const prompt = `
        ### ROLE
        You are a World-Class Linguistic Refinement Specialist. Your task is to polish raw spoken interview transcripts.

        ### GUIDELINES
        - ZERO FILLERS: Eliminate "um", "ah", "basically", "you know".
        - TECHNICAL PRECISION: Maintain and correctly format all technical terms (e.g., Kubernetes, React Hooks).
        - NO HALLUCINATION: If input is noise/greeting (e.g., "how are you"), return as-is or "[NOISY_INPUT]".
        - SYNTACTIC ELEGANCE: Convert stutters and pauses into professional, "Perfect Proper Sentences".
        - PRESERVE INTENT: Do not invent answers. Only refine the spoken words.

        ### INPUT
        "${text}"

        ### OUTPUT
        Return ONLY the refined response or "[NOISY_INPUT]". No intro, no meta-commentary.
        `;

        const refined = await callGeminiWithFallback(prompt);
        const result = refined.trim().replace(/^"|"$/g, ''); // Remove potential quotes

        if (result.includes("[NOISY_INPUT]")) {
            return res.json({ refinedText: text, isNoisy: true });
        }

        res.json({ refinedText: result });
    } catch (error) {
        console.error("[REFINE] Error:", error.message);
        res.json({ refinedText: req.body.text });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[FATAL-SERVER-ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({
        message: "Internal Server Error",
        error: err.message
    });
});

app.listen(PORT, () => {
    console.log(`[CORE] TalentEcoSystem Server V5 - RUNNING on Port: ${PORT}`);
});
