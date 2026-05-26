const mongoose = require('mongoose');
const path = require('path');

// Configure dotenv
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const Application = require('../backend/models/Application');
const ResumeProfile = require('../backend/models/ResumeProfile');
const ResumeAnalysis = require('../backend/models/ResumeAnalysis');
const AssessmentSubmission = require('../backend/models/AssessmentSubmission');
const User = require('../backend/models/User');
const Job = require('../backend/models/Job');
const { getRecommendationSummary } = require('../backend/controllers/recommendationController');

async function run() {
    try {
        console.log("Connecting to database: ", process.env.MONGO_URI ? "URI Present" : "Missing");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully!");

        // Find an application with interview answers or assessments
        let application = await Application.findOne({
            $or: [
                { interviewAnswers: { $exists: true, $not: { $size: 0 } } },
                { assessmentScore: { $exists: true } }
            ]
        });

        if (!application) {
            console.log("No completed applications found. Fetching first application...");
            application = await Application.findOne();
        }

        if (!application) {
            console.log("No applications found in the database. Creating dummy application...");
            // Create a dummy job first
            const job = await Job.create({
                title: "NodeJS Developer",
                company: "Tech Corp",
                description: "We are looking for a senior node developer who is expert in Express and MongoDB.",
                skills: ["NodeJS", "Express", "MongoDB"]
            });

            application = await Application.create({
                userId: "test-user-id",
                jobId: job._id,
                applicantName: "John Doe",
                applicantEmail: "john@example.com",
                resumeMatchPercent: 18,
                assessmentScore: 25,
                interviewScore: 40,
                interviewAnswers: [
                    {
                        question: "Explain event loop in Node.js",
                        answer: "The event loop is what allows Node.js to perform non-blocking I/O operations by offloading operations to the system kernel whenever possible.",
                        score: 90,
                        marks: 9,
                        feedback: "Excellent understanding of event loop"
                    }
                ],
                metrics: {
                    communicationDelta: 85,
                    thinkingLatency: 1.2,
                    ownershipMindset: 90
                }
            });
            console.log("Created dummy application:", application._id);
        }

        console.log(`Testing recommendation generation for Application ID: ${application._id}`);
        console.log(`Candidate Name: ${application.applicantName}`);

        // Mock req and res
        const req = {
            params: {
                applicationId: application._id.toString()
            }
        };

        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log("\n--- AI SUMMARY RESPONSE ---");
                console.log(JSON.stringify(data, null, 2));
                return this;
            }
        };

        // Clear existing summary to force regeneration for testing
        await Application.findByIdAndUpdate(application._id, { $unset: { recommendationSummary: 1 } });
        console.log("Cleared existing summary (if any) to test clean generation...");

        await getRecommendationSummary(req, res);

    } catch (e) {
        console.error("Test execution failed:", e);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from database.");
    }
}

run();
