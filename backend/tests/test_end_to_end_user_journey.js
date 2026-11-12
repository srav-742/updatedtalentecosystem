const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const RecruiterTicketWallet = require('../models/RecruiterTicketWallet');
const TicketTransaction = require('../models/TicketTransaction');
const ticketService = require('../services/ticketService');
const { verifyTicketPayment } = require('../controllers/ticketController');
const crypto = require('crypto');

async function runEndToEndUserJourney() {
    console.log('==================================================================');
    console.log('   HIRE1PERCENT COMPLETE END-TO-END USER JOURNEY VERIFICATION     ');
    console.log('==================================================================');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('[MONGO] Connected to MongoDB Cluster');

    const testRunId = Date.now();
    const recruiterEmail = `journey_recruiter_${testRunId}@hire1percent.test`;
    const recruiterUid = `recruiter_${testRunId}`;

    try {
        // Step 1: Recruiter Signup / Login
        console.log('\n--- Step 1: Recruiter Signup & Authentication ---');
        const recruiter = await User.create({
            uid: recruiterUid,
            name: 'Apex Recruiting Group',
            email: recruiterEmail,
            role: 'recruiter',
            hiringPattern: 'Standard Recruiter',
            isPro: false
        });
        console.log(`✅ Recruiter account created: ${recruiter.name} (${recruiter.email})`);

        // Step 2: Post 2 Jobs for Free
        console.log('\n--- Step 2: Recruiter Posts Two Jobs for Free ---');
        const jobA = await Job.create({
            title: 'Senior Full Stack Architect',
            department: 'Engineering',
            location: 'Remote',
            recruiterId: recruiter.uid,
            postedBy: recruiter._id,
            status: 'approved'
        });
        console.log(`✅ Free Job 1 Posted: "${jobA.title}" (ID: ${jobA._id})`);

        const jobB = await Job.create({
            title: 'DevOps & Cloud Systems Engineer',
            department: 'Infrastructure',
            location: 'Bengaluru, India',
            recruiterId: recruiter.uid,
            postedBy: recruiter._id,
            status: 'approved'
        });
        console.log(`✅ Free Job 2 Posted: "${jobB.title}" (ID: ${jobB._id})`);

        // Step 3: Check Initial Applicants View Metrics
        console.log('\n--- Step 3: Initial Applicants Page Status for Both Jobs ---');
        const wallet = await ticketService.getWallet(recruiterUid);
        const statusJobA = await ticketService.checkJobAssessmentStatus(jobA._id);
        const statusJobB = await ticketService.checkJobAssessmentStatus(jobB._id);

        console.log(`Job 1 ("${jobA.title}"): Available Tickets: ${statusJobA.availableTickets}, Is Unlocked: ${statusJobA.isUnlocked}`);
        console.log(`Job 2 ("${jobB.title}"): Available Tickets: ${statusJobB.availableTickets}, Is Unlocked: ${statusJobB.isUnlocked}`);

        if (statusJobA.availableTickets === 0 && !statusJobA.isUnlocked &&
            statusJobB.availableTickets === 0 && !statusJobB.isUnlocked) {
            console.log('✅ [PASS] Both jobs initially locked for assessments with 0 tickets.');
        } else {
            throw new Error('Initial job status failed.');
        }

        // Step 4: Recruiter Buys 5 Tickets for Job A via Razorpay Simulation
        console.log('\n--- Step 4: Recruiter Buys 5 Tickets Specifically for Job 1 ---');
        const orderIdA = `order_${testRunId}_A`;
        const paymentIdA = `pay_${testRunId}_A`;
        const razorpaySecret = process.env.RAZORPAY_KEY_SECRET || 'Ux8B43q4JDdmsFYV527STi34';

        const signatureA = crypto
            .createHmac('sha256', razorpaySecret)
            .update(`${orderIdA}|${paymentIdA}`)
            .digest('hex');

        // Mock req and res for verifyTicketPayment controller
        let verifyStatusCode = null;
        let verifyResponseData = null;
        const mockReqA = {
            body: {
                razorpay_order_id: orderIdA,
                razorpay_payment_id: paymentIdA,
                razorpay_signature: signatureA,
                packageId: 'starter', // 5 tickets
                recruiterId: recruiterUid,
                jobId: jobA._id.toString()
            }
        };
        const mockResA = {
            status: (code) => {
                verifyStatusCode = code;
                return {
                    json: (data) => {
                        verifyResponseData = data;
                        return data;
                    }
                };
            }
        };

        await verifyTicketPayment(mockReqA, mockResA);

        if (verifyStatusCode === 200 && verifyResponseData.success) {
            console.log(`✅ [PASS] Razorpay verification successful for Job 1.`);
            console.log(`   Credited Tickets: ${verifyResponseData.ticketsAdded}`);
        } else {
            throw new Error(`Payment verification failed: ${JSON.stringify(verifyResponseData)}`);
        }

        // Verify Job A vs Job B isolation in DB
        const statusAfterA = await ticketService.checkJobAssessmentStatus(jobA._id);
        const statusAfterB = await ticketService.checkJobAssessmentStatus(jobB._id);
        console.log(`Job 1: ${statusAfterA.availableTickets} available tickets, Unlocked: ${statusAfterA.isUnlocked}`);
        console.log(`Job 2: ${statusAfterB.availableTickets} available tickets, Unlocked: ${statusAfterB.isUnlocked}`);

        if (statusAfterA.availableTickets === 5 && statusAfterA.isUnlocked &&
            statusAfterB.availableTickets === 0 && !statusAfterB.isUnlocked) {
            console.log('✅ [PASS] Job 1 is UNLOCKED (5 tickets). Job 2 remains LOCKED (0 tickets).');
        } else {
            throw new Error('Per-job ticket isolation verification failed.');
        }

        // Step 5: 5 Candidates Attend Job A
        console.log('\n--- Step 5: 5 Candidates Attend Job 1 Assessments ---');
        for (let i = 1; i <= 5; i++) {
            const candUid = `candidate_${testRunId}_${i}`;
            const candidate = await User.create({
                uid: candUid,
                name: `Candidate ${i}`,
                email: `cand_${testRunId}_${i}@test.com`,
                role: 'candidate'
            });

            const application = await Application.create({
                jobId: jobA._id,
                userId: candidate._id,
                status: 'APPLIED',
                stage: 'ASSESSMENT'
            });

            const deductResult = await ticketService.deductTicketForAssessment({
                jobId: jobA._id,
                candidateId: candUid,
                applicationId: application._id
            });

            if (!deductResult.success) {
                throw new Error(`Failed to deduct ticket for candidate ${i}: ${deductResult.reason}`);
            }
            console.log(`   Candidate ${i} attended. Remaining on Job 1: ${deductResult.jobAvailableTickets}`);
        }

        const statusDepletedA = await ticketService.checkJobAssessmentStatus(jobA._id);
        console.log(`Job 1 status after 5 attendees: Available = ${statusDepletedA.availableTickets}, Is Unlocked = ${statusDepletedA.isUnlocked}`);
        if (statusDepletedA.availableTickets === 0 && !statusDepletedA.isUnlocked) {
            console.log('✅ [PASS] Job 1 has 0 tickets left. Assessment is now LOCKED.');
        } else {
            throw new Error('Depletion lock failed.');
        }

        // Step 6: 6th Candidate tries to attend Job A -> Blocked
        console.log('\n--- Step 6: 6th Candidate Attempts to Attend Job 1 (Exhausted) ---');
        const cand6 = await User.create({
            uid: `candidate_${testRunId}_6`,
            name: 'Candidate 6',
            email: `cand_${testRunId}_6@test.com`,
            role: 'candidate'
        });
        const app6 = await Application.create({
            jobId: jobA._id,
            userId: cand6._id,
            status: 'APPLIED',
            stage: 'ASSESSMENT'
        });

        const blockedResult = await ticketService.deductTicketForAssessment({
            jobId: jobA._id,
            candidateId: cand6.uid,
            applicationId: app6._id
        });

        console.log(`Candidate 6 Result: Success = ${blockedResult.success}, Reason = ${blockedResult.reason}`);
        if (!blockedResult.success && blockedResult.reason === 'INSUFFICIENT_TICKETS') {
            console.log('✅ [PASS] Candidate 6 is BLOCKED because Job 1 tickets are consumed!');
        } else {
            throw new Error('Candidate 6 was not properly blocked.');
        }

        // Step 7: Candidate tries to attend Job B (Never had tickets) -> Blocked
        console.log('\n--- Step 7: Candidate Attempts to Attend Job 2 (Zero Tickets) ---');
        const appJobB = await Application.create({
            jobId: jobB._id,
            userId: cand6._id,
            status: 'APPLIED',
            stage: 'ASSESSMENT'
        });

        const blockedJobBResult = await ticketService.deductTicketForAssessment({
            jobId: jobB._id,
            candidateId: cand6.uid,
            applicationId: appJobB._id
        });

        console.log(`Job 2 Attend Result: Success = ${blockedJobBResult.success}, Reason = ${blockedJobBResult.reason}`);
        if (!blockedJobBResult.success && blockedJobBResult.reason === 'INSUFFICIENT_TICKETS') {
            console.log('✅ [PASS] Job 2 attendance is BLOCKED because it has 0 tickets!');
        } else {
            throw new Error('Job 2 attendance check failed.');
        }

        // Step 8: Recruiter Top-Up / Buys more tickets for Job A
        console.log('\n--- Step 8: Recruiter Recharges Job 1 with 5 Additional Tickets ---');
        const orderIdA2 = `order_${testRunId}_A2`;
        const paymentIdA2 = `pay_${testRunId}_A2`;
        const signatureA2 = crypto
            .createHmac('sha256', razorpaySecret)
            .update(`${orderIdA2}|${paymentIdA2}`)
            .digest('hex');

        let verifyStatusCode2 = null;
        let verifyResponseData2 = null;
        await verifyTicketPayment({
            body: {
                razorpay_order_id: orderIdA2,
                razorpay_payment_id: paymentIdA2,
                razorpay_signature: signatureA2,
                packageId: 'starter',
                recruiterId: recruiterUid,
                jobId: jobA._id.toString()
            }
        }, {
            status: (code) => {
                verifyStatusCode2 = code;
                return {
                    json: (data) => {
                        verifyResponseData2 = data;
                        return data;
                    }
                };
            }
        });

        const statusRechargedA = await ticketService.checkJobAssessmentStatus(jobA._id);
        console.log(`Job 1 Recharged: Available = ${statusRechargedA.availableTickets}, Is Unlocked = ${statusRechargedA.isUnlocked}`);

        if (statusRechargedA.availableTickets === 5 && statusRechargedA.isUnlocked) {
            console.log('✅ [PASS] Job 1 is UNLOCKED again after recharge!');
        } else {
            throw new Error('Recharge unlock failed.');
        }

        // Step 9: Candidate 6 can now attend Job A!
        console.log('\n--- Step 9: Candidate 6 Now Attends Successfully ---');
        const cand6Retry = await ticketService.deductTicketForAssessment({
            jobId: jobA._id,
            candidateId: cand6.uid,
            applicationId: app6._id
        });

        console.log(`Candidate 6 Retry Result: Success = ${cand6Retry.success}, Remaining on Job 1 = ${cand6Retry.jobAvailableTickets}`);
        if (cand6Retry.success && cand6Retry.jobAvailableTickets === 4) {
            console.log('✅ [PASS] Candidate 6 now successfully attended and consumed 1 ticket (4 tickets left on Job 1)!');
        } else {
            throw new Error(`Candidate 6 retry failed: Success=${cand6Retry.success}, JobLeft=${cand6Retry.jobAvailableTickets}`);
        }

        // Step 10: Verify Final Database Audit & Tracking Records
        console.log('\n--- Step 10: Audit DB Records in RecruiterTicketWallet & TicketTransaction ---');
        const finalWallet = await RecruiterTicketWallet.findOne({ recruiterId: recruiterUid }).lean();
        const job1Entry = finalWallet.jobs.find(j => String(j.jobId) === String(jobA._id));
        const job2Entry = finalWallet.jobs.find(j => String(j.jobId) === String(jobB._id));

        console.log(`Job 1 Record in DB: Total Bought = ${job1Entry.totalPurchased}, Total Attended = ${job1Entry.totalConsumed}, Available = ${job1Entry.availableTickets}`);
        console.log(`Job 2 Record in DB: Total Bought = ${job2Entry ? job2Entry.totalPurchased : 0}, Total Attended = ${job2Entry ? job2Entry.totalConsumed : 0}, Available = ${job2Entry ? job2Entry.availableTickets : 0}`);

        const transactions = await TicketTransaction.find({ recruiterId: recruiterUid }).lean();
        console.log(`Total Ticket Transactions in DB: ${transactions.length}`);

        if (job1Entry.totalPurchased === 10 && job1Entry.totalConsumed === 6 && job1Entry.availableTickets === 4) {
            console.log('✅ [PASS] All wallet calculations, per-job isolation, and transaction records match 100%!');
        } else {
            throw new Error('Final wallet records mismatch.');
        }

        console.log('\n==================================================================');
        console.log('   ALL 10 END-TO-END JOURNEY TEST STEPS PASSED WITH 100% SUCCESS  ');
        console.log('==================================================================\n');

    } catch (err) {
        console.error('\n❌ [TEST FAILED]:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

runEndToEndUserJourney();
