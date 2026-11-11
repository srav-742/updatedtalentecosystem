const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const ticketService = require('../services/ticketService');
const RecruiterTicketWallet = require('../models/RecruiterTicketWallet');
const TicketPackage = require('../models/TicketPackage');
const TicketTransaction = require('../models/TicketTransaction');
const AssessmentTicketConsumption = require('../models/AssessmentTicketConsumption');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const Client = require('../models/Client');
const PlaintextClientCredential = require('../models/PlaintextClientCredential');
const { provisionClientForRecruiter } = require('../controllers/paymentController');

const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function recordTest(name, passed, details = '') {
    if (passed) {
        results.passed++;
        console.log(`✅ [PASS] ${name}`);
    } else {
        results.failed++;
        console.error(`❌ [FAIL] ${name}: ${details}`);
    }
    results.tests.push({ name, passed, details });
}

async function runTicketSystemVerification() {
    console.log("==================================================================");
    console.log("   HIRE1PERCENT PER-JOB TICKET & GATEWAY CLIENT VERIFICATION      ");
    console.log("==================================================================\n");

    try {
        const connectDB = require('../config/db');
        await connectDB();

        const testId = Date.now();
        const testRecruiterUid = `test_recruiter_${testId}`;
        const testCandUid1 = `test_cand_1_${testId}`;
        const testCandUid2 = `test_cand_2_${testId}`;
        const testCandUid3 = `test_cand_3_${testId}`;

        // -------------------------------------------------------------
        // TEST 1: Configurable Ticket Packages Seeding & Retrieval
        // -------------------------------------------------------------
        console.log("--- 1. Testing Ticket Packages ---");
        const packages = await ticketService.getPackages();
        recordTest(
            "Default ticket packages seeded (Starter, Growth, Business, Enterprise)",
            Array.isArray(packages) && packages.length >= 4,
            `Found ${packages?.length} packages`
        );

        // -------------------------------------------------------------
        // TEST 2: Recruiter Creation & Initial Ticket Wallet
        // -------------------------------------------------------------
        console.log("\n--- 2. Testing Recruiter Wallet Initialization ---");
        const recruiterUser = new User({
            name: "Multi-Job Test Recruiter",
            email: `recruiter_${testId}@example.com`,
            uid: testRecruiterUid,
            role: "recruiter"
        });
        await recruiterUser.save();

        const initialWallet = await ticketService.getWallet(testRecruiterUid);
        recordTest(
            "Recruiter wallet initialized with 0 available tickets",
            initialWallet && initialWallet.availableTickets === 0 && initialWallet.totalPurchased === 0,
            `Balance: ${initialWallet?.availableTickets}`
        );

        // -------------------------------------------------------------
        // TEST 3: Multi-Job Posting (Job 1 & Job 2) & Initial Lock Status
        // -------------------------------------------------------------
        console.log("\n--- 3. Testing Multi-Job Posting & Initial Lock Status ---");
        const job1 = new Job({
            title: "Job 1 - Frontend React Lead",
            company: "Acme Corp",
            recruiterId: testRecruiterUid,
            assessment: { enabled: true, totalQuestions: 5, passingScore: 70 }
        });
        await job1.save();

        const job2 = new Job({
            title: "Job 2 - Cloud DevOps Engineer",
            company: "Acme Corp",
            recruiterId: testRecruiterUid,
            assessment: { enabled: true, totalQuestions: 5, passingScore: 70 }
        });
        await job2.save();

        const statusJob1_zero = await ticketService.checkJobAssessmentStatus(job1._id);
        const statusJob2_zero = await ticketService.checkJobAssessmentStatus(job2._id);

        recordTest(
            "Job 1 assessment is locked when 0 tickets purchased",
            statusJob1_zero.isUnlocked === false && statusJob1_zero.availableTickets === 0,
            `Job 1 isUnlocked: ${statusJob1_zero.isUnlocked}`
        );
        recordTest(
            "Job 2 assessment is locked when 0 tickets purchased",
            statusJob2_zero.isUnlocked === false && statusJob2_zero.availableTickets === 0,
            `Job 2 isUnlocked: ${statusJob2_zero.isUnlocked}`
        );

        // -------------------------------------------------------------
        // TEST 4: Job 1 Dedicated Ticket Purchase (5 Tickets)
        // -------------------------------------------------------------
        console.log("\n--- 4. Testing Dedicated Ticket Purchase for Job 1 ---");
        const orderId1 = `order_job1_${testId}`;
        const creditJob1 = await ticketService.creditTickets({
            recruiterId: testRecruiterUid,
            ticketCount: 5,
            jobId: job1._id,
            packageId: 'starter',
            amountPaid: 999,
            paymentOrderId: orderId1,
            paymentId: `pay_job1_${testId}`
        });

        const job1EntryAfterCredit = creditJob1.wallet.jobs.find(j => String(j.jobId) === String(job1._id));
        const job2EntryAfterCredit = creditJob1.wallet.jobs.find(j => String(j.jobId) === String(job2._id));

        recordTest(
            "Job 1 credited with 5 tickets",
            job1EntryAfterCredit && job1EntryAfterCredit.availableTickets === 5 && job1EntryAfterCredit.totalPurchased === 5,
            `Job 1 available: ${job1EntryAfterCredit?.availableTickets}`
        );
        recordTest(
            "Job 2 STILL has 0 tickets (Job isolation strictly maintained)",
            !job2EntryAfterCredit || job2EntryAfterCredit.availableTickets === 0,
            `Job 2 available: ${job2EntryAfterCredit?.availableTickets || 0}`
        );

        const statusJob1_funded = await ticketService.checkJobAssessmentStatus(job1._id);
        const statusJob2_isolated = await ticketService.checkJobAssessmentStatus(job2._id);

        recordTest(
            "Job 1 is now UNLOCKED (5 available tickets)",
            statusJob1_funded.isUnlocked === true && statusJob1_funded.availableTickets === 5,
            `Job 1 isUnlocked: ${statusJob1_funded.isUnlocked}, Tickets: ${statusJob1_funded.availableTickets}`
        );
        recordTest(
            "Job 2 remains LOCKED (0 available tickets)",
            statusJob2_isolated.isUnlocked === false && statusJob2_isolated.availableTickets === 0,
            `Job 2 isUnlocked: ${statusJob2_isolated.isUnlocked}, Tickets: ${statusJob2_isolated.availableTickets}`
        );

        // -------------------------------------------------------------
        // TEST 5: Job 2 Dedicated Ticket Purchase (10 Tickets) & Combined Wallet
        // -------------------------------------------------------------
        console.log("\n--- 5. Testing Job 2 Purchase & Combined Wallet Totals ---");
        const orderId2 = `order_job2_${testId}`;
        await ticketService.creditTickets({
            recruiterId: testRecruiterUid,
            ticketCount: 10,
            jobId: job2._id,
            packageId: 'custom',
            amountPaid: 1599,
            paymentOrderId: orderId2,
            paymentId: `pay_job2_${testId}`
        });

        const combinedWallet = await ticketService.getWallet(testRecruiterUid);
        const job1Stats = combinedWallet.jobs.find(j => String(j.jobId) === String(job1._id));
        const job2Stats = combinedWallet.jobs.find(j => String(j.jobId) === String(job2._id));

        recordTest(
            "Combined Total Tickets: 15 bought, 15 available",
            combinedWallet.totalPurchased === 15 && combinedWallet.availableTickets === 15,
            `Purchased: ${combinedWallet.totalPurchased}, Available: ${combinedWallet.availableTickets}`
        );
        recordTest(
            "Job 1 shows exactly 5 tickets bought and 5 left",
            job1Stats?.totalPurchased === 5 && job1Stats?.availableTickets === 5 && job1Stats?.totalConsumed === 0,
            `Job 1 Purchased: ${job1Stats?.totalPurchased}, Left: ${job1Stats?.availableTickets}`
        );
        recordTest(
            "Job 2 shows exactly 10 tickets bought and 10 left",
            job2Stats?.totalPurchased === 10 && job2Stats?.availableTickets === 10 && job2Stats?.totalConsumed === 0,
            `Job 2 Purchased: ${job2Stats?.totalPurchased}, Left: ${job2Stats?.availableTickets}`
        );

        // -------------------------------------------------------------
        // TEST 6: Candidate Attendance & Per-Job Ticket Deduction
        // -------------------------------------------------------------
        console.log("\n--- 6. Testing Candidate Attendance on Job 1 ---");
        const app1 = new Application({
            jobId: job1._id,
            userId: testCandUid1,
            applicantName: "Candidate Alice",
            applicantEmail: `alice_${testId}@example.com`,
            status: "APPLIED"
        });
        await app1.save();

        const deduct1 = await ticketService.deductTicketForAssessment({
            recruiterId: testRecruiterUid,
            jobId: job1._id,
            applicationId: app1._id,
            candidateId: testCandUid1,
            candidateEmail: app1.applicantEmail
        });

        recordTest(
            "Job 1 ticket deducted on candidate assessment start (5 -> 4 left, 1 consumed)",
            deduct1.success === true && deduct1.jobAvailableTickets === 4,
            `Success: ${deduct1.success}, Job 1 Left: ${deduct1.jobAvailableTickets}`
        );

        const walletAfterAlice = await ticketService.getWallet(testRecruiterUid);
        const j1AfterAlice = walletAfterAlice.jobs.find(j => String(j.jobId) === String(job1._id));
        const j2AfterAlice = walletAfterAlice.jobs.find(j => String(j.jobId) === String(job2._id));

        recordTest(
            "Job 1 reflects: 5 bought, 1 attended, 4 left",
            j1AfterAlice.totalPurchased === 5 && j1AfterAlice.totalConsumed === 1 && j1AfterAlice.availableTickets === 4,
            `J1 Consumed: ${j1AfterAlice.totalConsumed}, Left: ${j1AfterAlice.availableTickets}`
        );
        recordTest(
            "Job 2 untouched: 10 bought, 0 attended, 10 left",
            j2AfterAlice.totalPurchased === 10 && j2AfterAlice.totalConsumed === 0 && j2AfterAlice.availableTickets === 10,
            `J2 Consumed: ${j2AfterAlice.totalConsumed}, Left: ${j2AfterAlice.availableTickets}`
        );
        recordTest(
            "Combined wallet reflects: 15 bought, 1 attended, 14 left",
            walletAfterAlice.totalPurchased === 15 && walletAfterAlice.totalConsumed === 1 && walletAfterAlice.availableTickets === 14,
            `Combined Consumed: ${walletAfterAlice.totalConsumed}, Available: ${walletAfterAlice.availableTickets}`
        );

        // -------------------------------------------------------------
        // TEST 7: Page Refresh & Reconnect Idempotency
        // -------------------------------------------------------------
        console.log("\n--- 7. Testing Assessment Refresh / Reconnect Idempotency ---");
        const retestAlice = await ticketService.deductTicketForAssessment({
            recruiterId: testRecruiterUid,
            jobId: job1._id,
            applicationId: app1._id,
            candidateId: testCandUid1,
            candidateEmail: app1.applicantEmail
        });

        recordTest(
            "Refresh or re-attempt does NOT deduct additional ticket",
            retestAlice.success === true && retestAlice.alreadyConsumed === true,
            `alreadyConsumed: ${retestAlice.alreadyConsumed}`
        );

        // -------------------------------------------------------------
        // TEST 8: Depleting Job 1 Tickets & Isolation from Job 2
        // -------------------------------------------------------------
        console.log("\n--- 8. Testing Job 1 Depletion While Job 2 Remains Active ---");
        // Consume the remaining 4 tickets for Job 1
        for (let i = 2; i <= 5; i++) {
            const candUid = `cand_j1_${i}_${testId}`;
            const dummyApp = new Application({
                jobId: job1._id,
                userId: candUid,
                applicantEmail: `cand_j1_${i}_${testId}@example.com`,
                status: "APPLIED"
            });
            await dummyApp.save();

            await ticketService.deductTicketForAssessment({
                recruiterId: testRecruiterUid,
                jobId: job1._id,
                applicationId: dummyApp._id,
                candidateId: candUid,
                candidateEmail: dummyApp.applicantEmail
            });
        }

        const walletJ1Depleted = await ticketService.getWallet(testRecruiterUid);
        const j1DepletedStats = walletJ1Depleted.jobs.find(j => String(j.jobId) === String(job1._id));
        const j2UntouchedStats = walletJ1Depleted.jobs.find(j => String(j.jobId) === String(job2._id));

        recordTest(
            "Job 1 tickets exhausted: 5 bought, 5 attended, 0 left",
            j1DepletedStats.availableTickets === 0 && j1DepletedStats.totalConsumed === 5,
            `J1 Left: ${j1DepletedStats.availableTickets}, Consumed: ${j1DepletedStats.totalConsumed}`
        );
        recordTest(
            "Job 2 still has 10 tickets remaining",
            j2UntouchedStats.availableTickets === 10,
            `J2 Left: ${j2UntouchedStats.availableTickets}`
        );

        // Next candidate on Job 1 must be rejected
        const overflowAppJ1 = new Application({
            jobId: job1._id,
            userId: `overflow_j1_${testId}`,
            applicantEmail: `overflow_j1_${testId}@example.com`,
            status: "APPLIED"
        });
        await overflowAppJ1.save();

        const j1Rejected = await ticketService.deductTicketForAssessment({
            recruiterId: testRecruiterUid,
            jobId: job1._id,
            applicationId: overflowAppJ1._id,
            candidateId: overflowAppJ1.userId,
            candidateEmail: overflowAppJ1.applicantEmail
        });

        recordTest(
            "Job 1 candidate rejected with INSUFFICIENT_TICKETS when Job 1 balance is 0",
            j1Rejected.success === false && j1Rejected.reason === 'INSUFFICIENT_TICKETS',
            `Reason: ${j1Rejected.reason}, Message: ${j1Rejected.message}`
        );

        // Candidate on Job 2 CAN STILL take assessment
        const appJ2 = new Application({
            jobId: job2._id,
            userId: testCandUid2,
            applicantEmail: `bob_j2_${testId}@example.com`,
            status: "APPLIED"
        });
        await appJ2.save();

        const j2Deduct = await ticketService.deductTicketForAssessment({
            recruiterId: testRecruiterUid,
            jobId: job2._id,
            applicationId: appJ2._id,
            candidateId: testCandUid2,
            candidateEmail: appJ2.applicantEmail
        });

        recordTest(
            "Candidate on Job 2 succeeds and consumes Job 2 ticket (10 -> 9 left, 1 attended)",
            j2Deduct.success === true && j2Deduct.jobAvailableTickets === 9,
            `Success: ${j2Deduct.success}, Job 2 Left: ${j2Deduct.jobAvailableTickets}`
        );

        // -------------------------------------------------------------
        // TEST 9: Client Credentials Provisioning & Gateway Integration
        // -------------------------------------------------------------
        console.log("\n--- 9. Testing Client ID & Credentials Generation on Payment ---");
        const provisionResult = await provisionClientForRecruiter(recruiterUser, 'combined');

        const expectedClientId = `client_${recruiterUser.uid}`;
        const storedPlaintext = await PlaintextClientCredential.findOne({ clientId: expectedClientId });
        const storedClient = await Client.findOne({ clientId: expectedClientId });

        recordTest(
            "Client ID created in format 'client_<uid>'",
            provisionResult?.client?.clientId === expectedClientId,
            `Client ID: ${provisionResult?.client?.clientId}`
        );
        recordTest(
            "Plaintext client credentials stored and accessible for admin",
            storedPlaintext && storedPlaintext.clientSecretRaw && storedPlaintext.clientSecretRaw.startsWith('h1p_sec_'),
            `Plaintext Secret: ${storedPlaintext?.clientSecretRaw}`
        );
        recordTest(
            "Bcrypt hashed secret stored in Client model for secure authentication",
            storedClient && storedClient.clientSecret && storedClient.clientSecret.startsWith('$2'),
            `Hashed Secret Prefix: ${storedClient?.clientSecret?.substring(0, 10)}`
        );
        recordTest(
            "Recruiter granted 'premium_recruiter' role with applicant access",
            provisionResult?.client?.roles?.includes('premium_recruiter') && provisionResult?.client?.roles?.includes('RECRUITER_VIEW_APPLICANTS'),
            `Roles: ${JSON.stringify(provisionResult?.client?.roles)}`
        );

        // -------------------------------------------------------------
        // TEST 10: Admin Client Credentials View Verification
        // -------------------------------------------------------------
        console.log("\n--- 10. Testing Admin Client Credentials Output ---");
        const adminQuery = await PlaintextClientCredential.find({ clientId: expectedClientId }).lean();
        recordTest(
            "Admin can query client name and credentials clearly",
            adminQuery.length === 1 && adminQuery[0].name && adminQuery[0].clientSecretRaw,
            `Name: ${adminQuery[0]?.name}, Secret: ${adminQuery[0]?.clientSecretRaw}`
        );

        // Clean up test data
        await Promise.all([
            User.deleteMany({ uid: { $in: [testRecruiterUid, testCandUid1, testCandUid2, testCandUid3] } }),
            Job.deleteMany({ _id: { $in: [job1._id, job2._id] } }),
            Application.deleteMany({ jobId: { $in: [job1._id, job2._id] } }),
            RecruiterTicketWallet.deleteMany({ recruiterId: testRecruiterUid }),
            TicketTransaction.deleteMany({ recruiterId: testRecruiterUid }),
            AssessmentTicketConsumption.deleteMany({ recruiterId: testRecruiterUid }),
            Client.deleteMany({ clientId: expectedClientId }),
            PlaintextClientCredential.deleteMany({ clientId: expectedClientId })
        ]);

        console.log("\n==================================================================");
        console.log(`   TOTAL TESTS: ${results.passed + results.failed} | PASSED: ${results.passed} | FAILED: ${results.failed}   `);
        console.log("==================================================================\n");

        process.exit(results.failed === 0 ? 0 : 1);
    } catch (err) {
        console.error("Verification suite encountered an unhandled error:", err);
        process.exit(1);
    }
}

runTicketSystemVerification();
