require('dotenv').config(); // Must be early!
const express = require('express');
const dns = require('dns');
// Fix for MongoDB SRV DNS resolution issues on some networks
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

const multer = require('multer');
const pdf = require('pdf-parse');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const fs = require('fs-extra');
const axios = require('axios');
const transcriptionService = require('./transcription_service');
// --- AI INTERVIEW ROUTES ---
const aiInterviewRoutes = require('./routes/aiInterviewRoutes');

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
// MongoDB Connection with Optimized Settings
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/talent-ecosystem", {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000
}).then(() => console.log("Connected to MongoDB Cluster (IPv4)"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// --- GROQ INTEGRATION (REPLACES GEMINI) ---
const callGroq = async (prompt) => {
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions', // ✅ Removed trailing spaces
            {
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 1000,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data?.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.error("[GROQ ERROR]:", error.response?.data || error.message);
        return null;
    }
};

// --- OPENROUTER INTEGRATION (FOR INTERVIEW ONLY) ---
const callOpenRouter = async (prompt, maxTokens = 500, jsonMode = false) => {
    try {
        const model = jsonMode
            ? "anthropic/claude-3.5-sonnet"
            : "x-ai/grok-beta";

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model,
                messages: [{ role: "user", content: prompt }],
                temperature: jsonMode ? 0.2 : 0.7,
                max_tokens: maxTokens,
                ...(jsonMode ? { response_format: { type: "json_object" } } : {})
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NODE_ENV === 'production'
                        ? 'https://yourdomain.com'
                        : 'http://localhost:5173',
                    'X-Title': 'TalentEcoSystem'
                }
            }
        );
        return response.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (error) {
        console.error("[OPENROUTER ERROR]:", error.response?.data || error.message);
        throw error;
    }
};

// --- MODELS ---
const jobSchema = new mongoose.Schema({
    title: String,
    company: String,
    location: String,
    type: { type: String, default: 'Full-time' },
    salary: String,
    description: String,
    skills: [String],
    experienceLevel: { type: String, default: 'Fresher' },
    education: [{
        qualification: String,
        specialization: String
    }],
    recruiterId: { type: String, index: true },
    minPercentage: { type: Number, default: 60 },
    assessment: {
        enabled: { type: Boolean, default: false },
        totalQuestions: { type: Number, default: 5 },
        type: { type: String, default: 'mcq' },
        passingScore: { type: Number, default: 70 }
    },
    mockInterview: {
        enabled: { type: Boolean, default: true },
        passingScore: { type: Number, default: 70 }
    },
    createdAt: { type: Date, default: Date.now }
});
const applicationSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
    userId: { type: String, index: true },
    applicantName: String,
    applicantEmail: String,
    applicantPic: String,
    resumeMatchPercent: Number,
    assessmentScore: Number,
    interviewScore: Number,
    finalScore: Number,
    metrics: {
        tradeOffs: { type: Number, default: 0 },
        thinkingLatency: { type: Number, default: 0 },
        bargeInResilience: { type: Number, default: 0 },
        communicationDelta: { type: Number, default: 0 },
        ownershipMindset: { type: Number, default: 0 }
    },
    interviewAnswers: [
        {
            question: String,
            answer: String,
            score: Number,
            feedback: String
        }
    ],
    status: { type: String, enum: ['APPLIED', 'SHORTLISTED', 'ELIGIBLE', 'REJECTED'], default: 'APPLIED' },
    resultsVisibleAt: { type: Date },
    appliedAt: { type: Date, default: Date.now }
});
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, index: true },
    password: { type: String },
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
    coins: { type: Number, default: 100 },
    coinHistory: [{
        amount: Number,
        type: { type: String, enum: ['CREDIT', 'DEBIT'] },
        reason: String,
        date: { type: Date, default: Date.now }
    }]
});
const questionLogSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    skill: String,
    difficulty: String,
    category: String,
    hash: { type: String, unique: true, index: true },
    userId: String,
    createdAt: { type: Date, default: Date.now }
});
const resumeProfileSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    skills: {
        programming: [String],
        frameworks: [String],
        databases: [String],
        tools: [String]
    },
    projects: [
        {
            name: String,
            tech: [String],
            role: String
        }
    ],
    experienceYears: Number,
    lastUpdated: { type: Date, default: Date.now }
});

// --- ResumeAnalysis Model (NEW) ---
const resumeAnalysisSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, index: true },

    resumeText: String,

    matchPercentage: Number,
    skillsScore: Number,
    experienceScore: Number,

    skillsFeedback: String,
    experienceFeedback: String,
    explanation: String,

    structured: {
        skills: {
            programming: [String],
            frameworks: [String],
            databases: [String],
            tools: [String]
        },
        projects: [
            {
                name: String,
                tech: [String],
                role: String
            }
        ],
        experienceYears: Number
    },

    createdAt: { type: Date, default: Date.now }
});
const QuestionLog = mongoose.model('QuestionLog', questionLogSchema);
const ResumeProfile = mongoose.model('ResumeProfile', resumeProfileSchema);
const ResumeAnalysis = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });
jobSchema.virtual('recruiter', {
    ref: 'User',
    localField: 'recruiterId',
    foreignField: 'uid',
    justOne: true
});
const Job = mongoose.model('Job', jobSchema);
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

// --- CRYPTO UTILS ---
const crypto = require('crypto');
const generateHash = (text) => {
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

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
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15 MB
});

// --- COIN UTILS ---
const deductCoins = async (userIdOrUid, amount, reason) => {
    try {
        const query = { $or: [{ uid: userIdOrUid }, { _id: mongoose.Types.ObjectId.isValid(userIdOrUid) ? userIdOrUid : null }, { email: userIdOrUid }] };
        const user = await User.findOne(query);
        if (!user) throw new Error("User not found for coin deduction");
        if (user.coins === undefined) user.coins = 50;
        if (!user.coinHistory) user.coinHistory = [];
        if (user.coins < amount) {
            console.warn(`[ECONOMY] Insufficient coins for ${userIdOrUid} (${user.coins}/${amount}). Demo Mode: Proceeding...`);
            return user.coins;
        }
        user.coins -= amount;
        user.coinHistory.push({ amount, type: 'DEBIT', reason });
        await user.save();
        return user.coins;
    } catch (error) {
        console.warn("[ECONOMY] Soft-fail:", error.message);
        return 0;
    }
};
const addCoins = async (userIdOrUid, amount, reason) => {
    try {
        const query = { $or: [{ uid: userIdOrUid }, { _id: mongoose.Types.ObjectId.isValid(userIdOrUid) ? userIdOrUid : null }, { email: userIdOrUid }] };
        const user = await User.findOne(query);
        if (!user) return;
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
        let user = await User.findOne({ $or: [{ uid }, { email }] });
        if (!user) {
            user = new User({ uid, email, name, profilePic, role: role || 'seeker' });
            await user.save();
        } else {
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
        let user = await User.findOne({ email });
        if (user) {
            if (profilePic && (!user.profilePic || user.profilePic.startsWith('http'))) {
                user.profilePic = profilePic;
                await user.save();
            }
            return res.json({ message: "Login successful", user });
        } else {
            if (!role) return res.status(400).json({ message: "Role is required for first-time signup" });
            user = new User({ name, email, profilePic, role });
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
        const { userId } = req.params;
        const updateData = req.body;
        delete updateData._id;
        let query = {};
        if (mongoose.Types.ObjectId.isValid(userId)) {
            query = { _id: userId };
        } else {
            if (updateData.email) {
                const existingUser = await User.findOne({ email: updateData.email });
                if (existingUser) {
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
        const jobs = await Job.find({ recruiterId });
        const jobIds = jobs.map(j => j._id);
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
            .populate('user', 'name email profilePic')
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
        const jobs = await Job.find().populate('recruiter', 'name company').sort({ createdAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error("[GET-JOBS] Failure:", error);
        res.status(500).json({ message: error.message });
    }
});

// ✅ UPDATED /api/generate-full-assessment — PURE GROQ, NO STATIC, FULL UNIQUENESS
app.post('/api/generate-full-assessment', async (req, res) => {
    try {
        const { jobId, userId } = req.body;
        if (!jobId || !userId) {
            return res.status(400).json({ message: "jobId and userId are required" });
        }
        // 🔒 Validation
        const job = await Job.findById(jobId).lean(); // 👈 Critical: use .lean()
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }
        // Coerce to boolean to handle "true" strings if any, though lean() usually helps
        const isEnabled = job.assessment && (job.assessment.enabled === true || job.assessment.enabled === "true");
        if (!isEnabled) {
            console.log("[DEBUG] Assessment config:", job.assessment);
            return res.status(400).json({ message: "Assessment not enabled for this job" });
        }
        const user = await User.findOne({ uid: userId });
        // Removed unnecessary ResumeProfile check. Application record is the source of truth.
        const application = await Application.findOne({ jobId: new mongoose.Types.ObjectId(jobId), userId });
        if (!application) {
            return res.status(400).json({ message: "You must apply to the job first" });
        }
        if (application.resumeMatchPercent < (job.minPercentage || 60)) {
            return res.status(400).json({ message: `Resume match below ${job.minPercentage || 60}%` });
        }
        await deductCoins(userId, 20, 'Skill Assessment');
        // 🎯 Config
        const totalQuestions = Math.min(job.assessment.totalQuestions || 5, 10);
        const assessmentType = (job.assessment.type || 'mixed').toLowerCase();
        const skills = job.skills || ['General'];
        const usedHashes = new Set((await QuestionLog.find({ userId }).select('hash')).map(q => q.hash));
        const seed = crypto.createHash('sha256').update(`${userId}${jobId}${Date.now()}`).digest('hex');
        // 🧠 Groq Prompt
        const prompt = `
Generate exactly ${totalQuestions} unique ${assessmentType.toUpperCase()} questions about: ${skills.join(', ')}.
Return ONLY a JSON object with key "questions" containing an array.
Each question must have:
- "type": "mcq" or "coding"
- "skill": one of the given skills
- "question": clear, original question text
For "mcq":
- "options": array of 4 strings
- "correctAnswer": integer (0-3)
For "coding":
- "starterCode": string with function signature
Example:
{"questions":[{"type":"mcq","skill":"JavaScript","question":"What is closure?","options":["A","B","C","D"],"correctAnswer":1}]}
NO extra text, explanations, or markdown.
`;
        // 🔁 Call Groq
        const rawResponse = await callGroq(prompt);
        if (!rawResponse) {
            return res.status(503).json({ message: "AI service unavailable. Please try again." });
        }
        // ✅ Parse JSON
        let parsed;
        try {
            parsed = JSON.parse(rawResponse);
        } catch (e) {
            console.error("[GROQ JSON PARSE FAILED]:", rawResponse.substring(0, 300));
            return res.status(503).json({ message: "AI returned invalid JSON." });
        }
        if (!parsed?.questions || !Array.isArray(parsed.questions) || parsed.questions.length < 3) {
            return res.status(503).json({ message: "AI returned insufficient questions." });
        }
        // 🔒 Dedupe & Save
        const finalQuestions = [];
        for (const q of parsed.questions) {
            if (!q.question || typeof q.question !== 'string') continue;
            const hash = generateHash(q.question);
            if (usedHashes.has(hash)) continue;
            const type = (q.type || 'mcq').toLowerCase();
            if (type === 'mcq') {
                if (!Array.isArray(q.options) || q.options.length < 2) continue;
                if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
                    q.correctAnswer = 0;
                }
            } else if (type === 'coding') {
                if (!q.starterCode) q.starterCode = "// Write your solution here";
            }
            // Save to log
            try {
                await QuestionLog.create({
                    questionText: q.question,
                    skill: q.skill || 'General',
                    difficulty: 'medium',
                    category: type.toUpperCase(),
                    hash,
                    userId
                });
            } catch (e) {
                // Soft fail
            }
            finalQuestions.push(q);
            usedHashes.add(hash);
            if (finalQuestions.length >= totalQuestions) break;
        }
        // Final trim
        const output = finalQuestions.slice(0, totalQuestions);
        if (output.length < 3) {
            return res.status(503).json({
                message: "Elite assessment failed. Generated only " + output.length + " questions (< 3)."
            });
        }
        console.log(`[ASSESSMENT] ✅ Generated ${output.length} questions (Requested: ${totalQuestions}) for user ${userId}`);
        res.json({
            sessionId: seed,
            questions: output,
            job: {
                title: job.title,
                skills: job.skills,
                assessment: {
                    type: assessmentType,
                    passingScore: job.assessment.passingScore || 70,
                    totalQuestions: totalQuestions
                }
            }
        });
    } catch (error) {
        console.error("[ASSESSMENT ERROR]", error);
        res.status(500).json({ message: "Assessment generation failed" });
    }
});

// --- RESUME INTELLIGENCE LAYER ---
app.post('/api/analyze-resume', async (req, res) => {
    try {
        const { resumeText, jobSkills, jobExperience, jobEducation, userId, jobId } = req.body;
        if (!userId || !jobId) return res.status(400).json({ message: "Recruiter/Job context missing" });
        console.log("[RESUME-ANALYSIS] Starting Analysis...");
        const prompt = `
You are an expert ATS (Applicant Tracking System) scanner.
Analyze the provided resume text against the job requirements.
Job Requirements:
- Skills: ${Array.isArray(jobSkills) ? jobSkills.join(', ') : 'General'}
- Experience Level: ${jobExperience || 'Any'}
- Education: ${JSON.stringify(jobEducation || [])}
Resume Text:
${resumeText ? resumeText.substring(0, 10000) : ''}
TASK:
1. Calculate a Skills Match Score (0-100) based strictly on the presence of required skills found in the resume.
- For each required skill, give +10 points if fully present, +5 if partial, 0 if missing.
- Max 100 points.
2. Calculate an Experience & Details Score (0-100) based on:
- Years of experience vs required (e.g., "0-1 Years" → 1 year max → 100% if ≥1 yr, else linear)
- Education match (degree/qualification match)
- Specialization match (e.g., "All Branches" → any degree OK)
3. Total Match Percentage = (Skills Score * 0.5) + (Experience Score * 0.5)
OUTPUT MUST BE A VALID JSON OBJECT EXACTLY LIKE THIS:
{
"matchPercentage": 78,
"skillsScore": 85,
"experienceScore": 70,
"skillsFeedback": "Missing: TypeScript, Tailwind CSS. Strong in HTML, CSS, JavaScript.",
"experienceFeedback": "Experience level matches. Education: B.Tech in All Branches — acceptable.",
"explanation": "Candidate has strong frontend skills but lacks modern frameworks. Experience and education are sufficient."
}
`;
        const rawResponse = await callGroq(prompt);
        if (!rawResponse) throw new Error("AI Service Failed");

        let analysis;
        try {
            analysis = JSON.parse(rawResponse);
        } catch (e) {
            console.error("JSON Parse Error:", e);
            analysis = { matchPercentage: 0, skillsScore: 0, experienceScore: 0, explanation: "Failed to parse analysis." };
        }

        // 2. Structured Extraction
        const extractPrompt = `
Extract structured resume data as JSON:
{
 "skills": {
   "programming": [],
   "frameworks": [],
   "databases": [],
   "tools": []
 },
 "projects": [{ "name": "Project", "tech": [], "role": "" }],
 "experienceYears": 0
}
Resume:
${resumeText ? resumeText.substring(0, 8000) : ''}
`;
        let structured = { skills: { programming: [], frameworks: [], databases: [], tools: [] }, projects: [], experienceYears: 0 };
        try {
            const rawIn = await callGroq(extractPrompt);
            if (rawIn) structured = JSON.parse(rawIn);
        } catch (e) { console.warn("Structured parse failed"); }

        // 3. Store
        if (userId && jobId) {
            const ResumeAnalysis = mongoose.model('ResumeAnalysis');
            await ResumeAnalysis.findOneAndUpdate(
                { userId, jobId },
                {
                    userId,
                    jobId,
                    resumeText,
                    ...analysis,
                    structured
                },
                { upsert: true, new: true }
            );
        }

        res.json(analysis);
    } catch (error) {
        console.error("[RESUME-ANALYSIS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// ✅ REPLACED: Use OpenRouter for resume parsing (as requested)
app.post('/api/parse-resume-structured', async (req, res) => {
    const { resumeText, userId } = req.body;
    try {
        if (!resumeText || resumeText.length < 50) {
            return res.status(400).json({ message: "Resume text too short" });
        }

        const prompt = `
You are a Resume Intelligence Agent.
Extract structured data from this resume text as JSON:
{
  "skills": {
    "programming": ["JavaScript", "Python"],
    "frameworks": ["React", "Express"],
    "databases": ["MongoDB", "PostgreSQL"],
    "tools": ["Git", "Docker"]
  },
  "projects": [
    {
      "name": "Project Name",
      "tech": ["React", "Node.js"],
      "role": "Full-stack Developer"
    }
  ],
  "experienceYears": 2
}
Resume:
${resumeText.substring(0, 8000)}
`;

        const rawResponse = await callGroq(prompt); // ✅ Uses Groq
        if (!rawResponse) {
            return res.status(500).json({ message: "Resume parsing failed" });
        }

        let structuredData;
        try {
            structuredData = JSON.parse(rawResponse);
        } catch (e) {
            console.error("[RESUME-PARSE] JSON parse failed:", rawResponse);
            structuredData = {
                skills: { programming: [], frameworks: [], databases: [], tools: [] },
                projects: [],
                experienceYears: 0
            };
        }

        if (userId) {
            await ResumeProfile.findOneAndUpdate(
                { userId },
                { ...structuredData, lastUpdated: new Date() },
                { upsert: true, new: true }
            );
        }

        res.json(structuredData);
    } catch (error) {
        console.error("[RESUME-PARSE] Error:", error.message);
        res.status(500).json({ message: "Failed to parse resume structure" });
    }
});

// NEW: Tool for the user to add coins
app.post('/api/users/add-coins', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        if (!userId) return res.status(400).json({ message: "Missing userId" });
        await addCoins(userId, amount || 100, 'Manual Top-up');
        res.json({ message: `Success. Added ${amount || 100} coins.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- APPLICATION SUBMISSION (KEEP THIS — NOT INTERVIEW-SPECIFIC) ---
app.post('/api/applications', async (req, res) => {
    try {
        const { jobId, userId, applicantName, applicantEmail, applicantPic, ...updateData } = req.body;
        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ message: "Invalid or Missing Job ID" });
        }
        const query = { jobId: new mongoose.Types.ObjectId(jobId), userId: userId };
        const update = {
            ...updateData,
            ...query,
            applicantName,
            applicantEmail,
            applicantPic
        };
        if (!updateData.interviewAnswers || updateData.interviewAnswers.length === 0) {
            delete update.interviewAnswers;
        }
        const application = await Application.findOneAndUpdate(query, update, { new: true, upsert: true }).populate('jobId');
        if (application.finalScore >= 60) {
            console.log(`[LEDGER] Elite Candidate Detected: ${userId} (Score: ${application.finalScore})`);
            const recruiterId = application.jobId?.recruiterId;
            if (recruiterId) {
                console.log(`[LEDGER] Crediting Recruiter ${recruiterId} for Elite find.`);
                await addCoins(recruiterId, 100, `Elite Find Bonus: Candidate ${application.applicantName}`);
            }
            application.status = 'SHORTLISTED';
            await application.save();
        }
        res.status(201).json(application);
    } catch (error) {
        console.error("[LEDGER-FINAL] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/applications/seeker/:userId', async (req, res) => {
    try {
        const apps = await Application.find({ userId: req.params.userId }).populate('jobId').sort({ createdAt: -1 });
        const validApps = apps.filter(app => app.jobId);
        res.json(validApps);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// --- STATUS UPDATE (KEEP) ---
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

// --- PDF & VOICE ROUTES (KEEP ALL) ---
app.post('/api/extract-pdf', memoryUpload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            console.warn("[PDF-EXTRACT] No file received");
            return res.status(400).json({ message: "No file uploaded" });
        }

        console.log(`[PDF-EXTRACT] File size: ${req.file.size} bytes`);

        // Reject files > 10 MB early
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: "File too large. Max size: 10 MB." });
        }

        // Try to parse
        const data = await pdf(req.file.buffer);
        const text = (data?.text || "").trim();

        if (!text) {
            console.error("[PDF-EXTRACT] Extracted text is empty");
            return res.status(400).json({ message: "PDF has no extractable text (e.g., scanned image)." });
        }

        console.log(`[PDF-EXTRACT] Success: ${text.length} characters extracted`);
        res.json({ text });
    } catch (error) {
        console.error("[PDF-EXTRACT] CRITICAL ERROR:", error.message || error);
        res.status(500).json({
            message: "PDF parsing failed",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/upload-audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No audio file uploaded" });
        const audioPath = path.resolve(req.file.path);
        console.log(`[STT] Processing: ${audioPath}`);
        const transcript = await transcriptionService.transcribeAudio(audioPath);
        console.log(`[STT] Result: ${transcript}`);
        await fs.remove(audioPath).catch(err => console.error("Cleanup error:", err));
        res.json({ text: transcript });
    } catch (error) {
        console.error("[VOICE] Error:", error.message);
        res.status(500).json({ message: "Transcription failed (JS)", details: error.message });
    }
});

app.post('/api/tts', async (req, res) => {
    try {
        const { text } = req.body;
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey || apiKey.length < 10) {
            console.warn("[TTS] Key missing. Signaling frontend to use Native Voice.");
            return res.json({ audioUrl: null });
        }
        console.log(`[TTS-GOOGLE] Synthesis requested.`);
        const response = await axios.post(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, // ✅ Fixed URL
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
        console.warn("[TTS-GOOGLE] API Failed (Quota or Invalid Key). Switching to Native.", error.message);
        res.json({ audioUrl: null, message: "Use Fallback" });
    }
});

app.get('/api/get-audio', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'output.mp3');
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        console.warn("[AUDIO] output.mp3 not found at:", filePath);
        res.status(404).json({ message: "Audio file not found" });
    }
});

// Mount AI Interview routes
app.use('/api/interview', aiInterviewRoutes);

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