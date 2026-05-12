require("dotenv").config();
const mongoose = require("mongoose");
const Candidate = require("./src/models/Candidate");
const Job = require("./src/models/Job");

const seed = async () => {
    try {
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);

        // --- SEED JOBS ---
        await Job.deleteMany({ title: { $in: ["AI Engineer", "MLOps Engineer", "Backend Developer", "Frontend Developer"] } });

        await Job.create({
            title: "AI Engineer",
            description: "Build state-of-the-art LLM agents and automation pipelines.",
            skills: ["Node.js", "Python", "MongoDB", "Generative AI", "React"],
            experienceLevel: "Senior"
        });

        await Job.create({
            title: "MLOps Engineer",
            description: "Deploy and scale machine learning models in production.",
            skills: ["Docker", "Kubernetes", "AWS", "Python", "CI/CD"],
            experienceLevel: "Intermediate"
        });

        // --- SEED CANDIDATES WITH RICH DATA ---
        await Candidate.deleteMany({ name: { $in: ["Sravya", "Shankar", "Prashanth", "Hemangi"] } });

        await Candidate.create({
            name: "Sravya",
            email: "sravya@example.com",
            appliedJob: "AI Engineer",
            skills: ["Node.js", "React", "MongoDB"], // Missing Python and Generative AI
            experience: "3 years",
            lastActiveAt: new Date(),
            resumeScore: 85
        });

        await Candidate.create({
            name: "Shankar",
            email: "shankar@example.com",
            appliedJob: "MLOps Engineer",
            skills: ["Python", "AWS"], // Missing Docker, Kubernetes
            experience: "5 years",
            lastActiveAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            resumeScore: 72
        });

        await Candidate.create({
            name: "Prashanth",
            email: "prashanth@example.com",
            appliedJob: "Backend Developer",
            skills: ["Java", "Spring Boot", "MySQL"],
            experience: "2 years",
            lastActiveAt: new Date(),
            assessmentScore: 92,
            resumeAnalyzed: true
        });

        await Candidate.create({
            name: "Hemangi",
            email: "hemangi@example.com",
            appliedJob: "Frontend Developer",
            skills: ["React", "CSS", "TypeScript"],
            experience: "4 years",
            lastActiveAt: new Date(),
            resumeAnalyzed: true,
            assessmentCompleted: true,
            interviewCompleted: true,
            assessmentScore: 95
        });

        console.log("Rich Database seeded with Jobs and Candidates!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seed();
