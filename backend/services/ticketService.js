const RecruiterTicketWallet = require('../models/RecruiterTicketWallet');
const TicketPackage = require('../models/TicketPackage');
const TicketTransaction = require('../models/TicketTransaction');
const AssessmentTicketConsumption = require('../models/AssessmentTicketConsumption');
const Job = require('../models/Job');
const User = require('../models/User');
const { findRecruiterUser, resolveRecruiterIdentifiers } = require('../utils/userResolver');

const DEFAULT_PACKAGES = [
    {
        packageId: 'starter',
        name: 'Starter Package',
        ticketCount: 5,
        price: 999,
        currency: 'INR',
        badge: 'Small Hiring',
        description: 'Perfect for quick hiring of 1-5 candidate assessments with comprehensive AI evaluation.',
        features: [
            '5 Candidate Skill Assessments & Interviews',
            'Full Candidate Profiles & Resumes',
            'AI Integrity & 4-Layer Proctoring Summaries',
            'Speech-to-Text Candidate Transcripts',
            'Automated Gateway Client Credentials'
        ],
        popular: false,
        accentColor: 'from-blue-600 to-indigo-600',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        sortOrder: 1
    },
    {
        packageId: 'growth',
        name: 'Growth Package',
        ticketCount: 25,
        price: 3999,
        currency: 'INR',
        badge: 'Most Popular · Best Value',
        description: 'Comprehensive high-speed screening for teams evaluating multiple roles simultaneously.',
        features: [
            '25 Candidate Skill Assessments & Interviews',
            'Video Interview Defense & Audio Playback',
            'Real-time Proctoring Logs & Replay Audit',
            'Instant OAuth Session Token & Gateway Entitlement',
            'Priority Recruiter Support'
        ],
        popular: true,
        accentColor: 'from-amber-500 to-yellow-400',
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        sortOrder: 2
    },
    {
        packageId: 'business',
        name: 'Business Package',
        ticketCount: 50,
        price: 6999,
        currency: 'INR',
        badge: 'High Volume',
        description: 'Designed for scaling companies running regular department-level hiring drives.',
        features: [
            '50 Candidate Skill Assessments & Interviews',
            'Custom Coding Challenges & AST Execution',
            'Deep Semantic Talent Search & Scorecards',
            'Candidate CSV/JSON Pipeline Exports',
            'Dedicated Account Manager'
        ],
        popular: false,
        accentColor: 'from-teal-500 to-emerald-400',
        badgeColor: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
        sortOrder: 3
    },
    {
        packageId: 'enterprise',
        name: 'Enterprise Package',
        ticketCount: 100,
        price: 11999,
        currency: 'INR',
        badge: 'Enterprise Scale',
        description: 'Full-scale enterprise assessment capacity for nationwide campus drives and bulk hiring.',
        features: [
            '100+ Candidate Skill Assessments & Interviews',
            'Multi-stage Coding, MCQ & AI Technical Interviews',
            'Custom Assessment Questions & Question Bank Sync',
            '99.9% Uptime SLA & Dedicated Technical Support',
            'Continuous Candidate Auditing & Proctoring History'
        ],
        popular: false,
        accentColor: 'from-purple-600 to-pink-500',
        badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
        sortOrder: 4
    }
];

/**
 * Seed default ticket packages if none exist
 */
const seedDefaultPackages = async () => {
    try {
        const count = await TicketPackage.countDocuments({});
        if (count === 0) {
            console.log('[TICKET-SERVICE] Seeding default ticket packages...');
            await TicketPackage.insertMany(DEFAULT_PACKAGES);
            console.log('[TICKET-SERVICE] Successfully seeded 4 default ticket packages.');
        }
    } catch (err) {
        console.error('[TICKET-SERVICE] Error seeding ticket packages:', err.message);
    }
};

/**
 * Fetch all active ticket packages
 */
const getPackages = async () => {
    await seedDefaultPackages();
    return await TicketPackage.find({ isActive: true }).sort({ sortOrder: 1, ticketCount: 1 }).lean();
};

/**
 * Normalize recruiter identifier to primary uid or mongo _id
 */
const resolvePrimaryRecruiterId = async (recruiterId) => {
    if (!recruiterId) return null;
    const user = await findRecruiterUser(recruiterId);
    if (!user) return String(recruiterId).trim();
    return user.uid || user._id.toString();
};

/**
 * Get or initialize recruiter ticket wallet, enriched with all posted jobs
 */
const getWallet = async (recruiterId) => {
    const primaryId = await resolvePrimaryRecruiterId(recruiterId);
    if (!primaryId) return null;

    let wallet = await RecruiterTicketWallet.findOne({ recruiterId: primaryId });

    if (!wallet) {
        // Fallback: check if wallet exists under any alias
        const { allIds } = await resolveRecruiterIdentifiers(recruiterId);
        if (allIds.length > 0) {
            wallet = await RecruiterTicketWallet.findOne({ recruiterId: { $in: allIds } });
            if (wallet && wallet.recruiterId !== primaryId) {
                wallet.recruiterId = primaryId;
                await wallet.save();
            }
        }
    }

    if (!wallet) {
        wallet = new RecruiterTicketWallet({
            recruiterId: primaryId,
            totalPurchased: 0,
            totalConsumed: 0,
            availableTickets: 0,
            totalRefunded: 0,
            jobs: []
        });
        await wallet.save();
    }

    if (!wallet.jobs) {
        wallet.jobs = [];
    }

    // Enrich wallet with all jobs posted by this recruiter
    try {
        const { allIds } = await resolveRecruiterIdentifiers(recruiterId);
        const queryIds = Array.from(new Set([primaryId, ...(allIds || [])]));
        const recruiterJobs = await Job.find({ recruiterId: { $in: queryIds } }).sort({ createdAt: -1 }).lean();

        let modified = false;

        // Deduplicate existing wallet.jobs by jobId
        const uniqueJobsMap = new Map();
        for (const j of (wallet.jobs || [])) {
            const idKey = j.jobId ? j.jobId.toString() : null;
            if (!idKey) continue;
            if (!uniqueJobsMap.has(idKey)) {
                uniqueJobsMap.set(idKey, j);
            } else {
                const primary = uniqueJobsMap.get(idKey);
                primary.totalPurchased = Math.max(primary.totalPurchased || 0, j.totalPurchased || 0);
                primary.totalConsumed = Math.max(primary.totalConsumed || 0, j.totalConsumed || 0);
                primary.availableTickets = Math.max(primary.availableTickets || 0, j.availableTickets || 0);
                modified = true;
            }
        }
        if (wallet.jobs && uniqueJobsMap.size !== wallet.jobs.length) {
            wallet.jobs = Array.from(uniqueJobsMap.values());
            modified = true;
        }

        for (const job of recruiterJobs) {
            const strJobId = job._id.toString();
            let existingAllocation = wallet.jobs.find(j => j.jobId && j.jobId.toString() === strJobId);

            if (!existingAllocation) {
                // Count any candidate ticket consumptions for this job
                const consumedCount = await AssessmentTicketConsumption.countDocuments({ jobId: job._id });
                wallet.jobs.push({
                    jobId: job._id,
                    jobTitle: job.title || 'Untitled Role',
                    totalPurchased: consumedCount, // Baseline
                    totalConsumed: consumedCount,
                    availableTickets: 0,
                    lastPurchasedAt: null
                });
                modified = true;
            } else if (!existingAllocation.jobTitle && job.title) {
                existingAllocation.jobTitle = job.title;
                modified = true;
            }
        }

        if (modified) {
            await wallet.save();
        }
    } catch (enrichErr) {
        console.warn('[TICKET-SERVICE] Warning enriching wallet jobs:', enrichErr.message);
    }

    return wallet;
};

/**
 * Credit purchased tickets to recruiter wallet (globally and per-job)
 */
const creditTickets = async ({
    recruiterId,
    ticketCount,
    jobId = null,
    packageId = null,
    amountPaid = 0,
    paymentOrderId = null,
    paymentId = null,
    notes = ''
}) => {
    const primaryId = await resolvePrimaryRecruiterId(recruiterId);
    if (!primaryId) {
        throw new Error('Valid recruiter identifier is required to credit tickets.');
    }

    const count = Number(ticketCount);
    if (isNaN(count) || count <= 0) {
        throw new Error('Ticket count must be a positive number.');
    }

    // Idempotency check: check if this paymentOrderId was already processed
    if (paymentOrderId) {
        const existingTx = await TicketTransaction.findOne({
            paymentOrderId,
            status: 'completed',
            type: 'CREDIT'
        });
        if (existingTx) {
            console.log(`[TICKET-SERVICE] Payment order ${paymentOrderId} already credited. Returning current wallet.`);
            const currentWallet = await getWallet(primaryId);
            return {
                wallet: currentWallet,
                transaction: existingTx,
                alreadyCredited: true
            };
        }
    }

    // Fetch existing or initialize wallet
    const wallet = await getWallet(primaryId);

    // Resolve target job if provided
    let targetJob = null;
    let targetJobTitle = '';
    if (jobId) {
        try {
            targetJob = await Job.findById(jobId).lean();
            if (targetJob) {
                targetJobTitle = targetJob.title || 'Job Assessment';
            }
        } catch (jErr) {
            console.warn('[TICKET-SERVICE] Job resolution warning:', jErr.message);
        }
    }

    // Update per-job allocation if jobId is present
    if (jobId) {
        const strJobId = jobId.toString();
        let jobEntry = wallet.jobs.find(j => j.jobId && j.jobId.toString() === strJobId);

        if (jobEntry) {
            jobEntry.totalPurchased = (jobEntry.totalPurchased || 0) + count;
            jobEntry.availableTickets = (jobEntry.availableTickets || 0) + count;
            jobEntry.jobTitle = targetJobTitle || jobEntry.jobTitle || 'Job Assessment';
            jobEntry.lastPurchasedAt = new Date();
        } else {
            wallet.jobs.push({
                jobId: targetJob ? targetJob._id : jobId,
                jobTitle: targetJobTitle || 'Job Assessment',
                totalPurchased: count,
                totalConsumed: 0,
                availableTickets: count,
                lastPurchasedAt: new Date()
            });
        }
    }

    // Update wallet top-level totals (sum across jobs or increment)
    wallet.totalPurchased = (wallet.totalPurchased || 0) + count;
    wallet.availableTickets = (wallet.availableTickets || 0) + count;
    wallet.lastTransactionAt = new Date();
    await wallet.save();

    const balanceBefore = wallet.availableTickets - count;
    const balanceAfter = wallet.availableTickets;

    // Record immutable transaction
    const transaction = new TicketTransaction({
        recruiterId: primaryId,
        jobId: jobId || null,
        jobTitle: targetJobTitle || '',
        type: 'CREDIT',
        quantity: count,
        balanceBefore: Math.max(0, balanceBefore),
        balanceAfter,
        packageId,
        amountPaid,
        paymentOrderId,
        paymentId,
        status: 'completed',
        notes: notes || `Purchased package ${packageId || 'custom'} (+${count} tickets)${targetJobTitle ? ` for ${targetJobTitle}` : ''}`
    });
    await transaction.save();

    // Synchronize recruiter user model
    try {
        const mongoose = require('mongoose');
        const userQuery = mongoose.Types.ObjectId.isValid(primaryId)
            ? { $or: [{ uid: primaryId }, { _id: primaryId }] }
            : { uid: primaryId };
        await User.findOneAndUpdate(
            userQuery,
            { 
                $set: { isPro: true, hiringPattern: 'Premium Recruiter' }
            }
        );
    } catch (uErr) {
        console.warn('[TICKET-SERVICE] User sync notice:', uErr.message);
    }

    return {
        wallet,
        transaction,
        alreadyCredited: false
    };
};

/**
 * Atomically deduct exactly 1 ticket when an eligible candidate starts assessment
 * Deducts from the specific job's ticket balance as well as the recruiter's overall wallet.
 */
const deductTicketForAssessment = async ({
    recruiterId,
    jobId,
    applicationId,
    candidateId,
    candidateEmail = ''
}) => {
    const primaryId = await resolvePrimaryRecruiterId(recruiterId);
    if (!primaryId) {
        return {
            success: false,
            reason: 'RECRUITER_NOT_FOUND',
            message: 'Job recruiter could not be identified.'
        };
    }

    // 1. Idempotency Check: Did this candidate already consume a ticket for this job?
    const existingConsumption = await AssessmentTicketConsumption.findOne({
        jobId,
        $or: [
            { applicationId },
            { candidateId },
            ...(candidateEmail ? [{ candidateEmail: candidateEmail.toLowerCase().trim() }] : [])
        ]
    });

    if (existingConsumption) {
        console.log(`[TICKET-SERVICE] Candidate ${candidateId} / application ${applicationId} already consumed a ticket for job ${jobId}. Resuming session.`);
        const wallet = await getWallet(primaryId);
        return {
            success: true,
            alreadyConsumed: true,
            availableTickets: wallet.availableTickets,
            consumption: existingConsumption,
            message: 'Session resumed. No additional ticket was consumed.'
        };
    }

    // 2. Fetch and check wallet & per-job ticket availability
    const wallet = await getWallet(primaryId);
    if (!wallet) {
        return {
            success: false,
            reason: 'WALLET_NOT_FOUND',
            availableTickets: 0,
            message: 'Recruiter ticket wallet could not be found.'
        };
    }

    let targetJob = null;
    let targetJobTitle = '';
    if (jobId) {
        try {
            targetJob = await Job.findById(jobId).lean();
            if (targetJob) targetJobTitle = targetJob.title || '';
        } catch (e) {}
    }

    const strJobId = jobId ? jobId.toString() : null;
    let jobEntry = strJobId && wallet.jobs ? wallet.jobs.find(j => j.jobId && j.jobId.toString() === strJobId) : null;

    // Check availability: Strict per-job isolation
    if (jobId && wallet.jobs && wallet.jobs.length > 0) {
        if (!jobEntry || jobEntry.availableTickets < 1) {
            console.warn(`[TICKET-SERVICE] Insufficient tickets for recruiter ${primaryId} on job ${jobId}.`);
            return {
                success: false,
                reason: 'INSUFFICIENT_TICKETS',
                availableTickets: wallet.availableTickets,
                jobAvailableTickets: 0,
                message: targetJobTitle 
                    ? `No available interview tickets remaining for "${targetJobTitle}". Please purchase tickets for this job.`
                    : 'No available interview tickets remaining for this job.'
            };
        }
    } else if (wallet.availableTickets < 1) {
        console.warn(`[TICKET-SERVICE] Insufficient tickets for recruiter ${primaryId}.`);
        return {
            success: false,
            reason: 'INSUFFICIENT_TICKETS',
            availableTickets: 0,
            jobAvailableTickets: 0,
            message: 'Recruiter has no available interview tickets remaining.'
        };
    }

    // Deduct ticket from job allocation and top-level wallet
    if (jobEntry && jobEntry.availableTickets >= 1) {
        jobEntry.availableTickets -= 1;
        jobEntry.totalConsumed = (jobEntry.totalConsumed || 0) + 1;
    }

    wallet.availableTickets = Math.max(0, wallet.availableTickets - 1);
    wallet.totalConsumed = (wallet.totalConsumed || 0) + 1;
    wallet.lastTransactionAt = new Date();
    await wallet.save();

    const balanceBefore = wallet.availableTickets + 1;
    const balanceAfter = wallet.availableTickets;

    // 3. Record transaction ledger
    const transaction = new TicketTransaction({
        recruiterId: primaryId,
        candidateId: String(candidateId),
        jobId: jobId || null,
        jobTitle: targetJobTitle || '',
        applicationId,
        type: 'DEBIT',
        quantity: 1,
        balanceBefore,
        balanceAfter,
        status: 'completed',
        notes: `Assessment started by candidate ${candidateEmail || candidateId} for job ${targetJobTitle || jobId}`
    });
    await transaction.save();

    // 4. Record consumption entry with unique constraints
    let consumption = null;
    try {
        consumption = new AssessmentTicketConsumption({
            recruiterId: primaryId,
            jobId,
            candidateId: String(candidateId),
            candidateEmail: candidateEmail ? candidateEmail.toLowerCase().trim() : '',
            applicationId,
            transactionId: transaction._id
        });
        await consumption.save();
    } catch (dupErr) {
        // If race condition triggered duplicate consumption, roll back ticket
        if (dupErr.code === 11000) {
            console.warn('[TICKET-SERVICE] Concurrent duplicate consumption detected. Rolling back ticket.');
            if (jobEntry) {
                jobEntry.availableTickets += 1;
                jobEntry.totalConsumed = Math.max(0, jobEntry.totalConsumed - 1);
            }
            wallet.availableTickets += 1;
            wallet.totalConsumed = Math.max(0, wallet.totalConsumed - 1);
            await wallet.save();

            return {
                success: true,
                alreadyConsumed: true,
                availableTickets: balanceBefore,
                message: 'Concurrent attempt handled safely.'
            };
        }
        throw dupErr;
    }

    console.log(`[TICKET-SERVICE] Deducted 1 ticket for job ${jobId}. Remaining tickets for recruiter ${primaryId}: ${balanceAfter}`);

    return {
        success: true,
        alreadyConsumed: false,
        availableTickets: balanceAfter,
        jobAvailableTickets: jobEntry ? jobEntry.availableTickets : balanceAfter,
        transaction,
        consumption,
        message: 'Ticket deducted successfully. Assessment session authorized.'
    };
};

/**
 * Get ticket transaction history for a recruiter
 */
const getTransactionHistory = async (recruiterId) => {
    const primaryId = await resolvePrimaryRecruiterId(recruiterId);
    if (!primaryId) return [];

    const { allIds } = await resolveRecruiterIdentifiers(recruiterId);
    const queryIds = Array.from(new Set([primaryId, ...(allIds || [])]));

    return await TicketTransaction.find({ recruiterId: { $in: queryIds } })
        .populate('jobId', 'title')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
};

/**
 * Check if assessment for a given job is unlocked (recruiter has tickets for this specific job)
 */
const checkJobAssessmentStatus = async (jobId) => {
    const job = await Job.findById(jobId).lean();
    if (!job) {
        return { exists: false, isUnlocked: false, availableTickets: 0 };
    }

    const wallet = await getWallet(job.recruiterId);
    const strJobId = job._id.toString();
    const jobEntry = wallet && wallet.jobs ? wallet.jobs.find(j => j.jobId && j.jobId.toString() === strJobId) : null;

    const jobAvailable = jobEntry ? jobEntry.availableTickets : 0;
    const jobPurchased = jobEntry ? jobEntry.totalPurchased : 0;
    const jobConsumed = jobEntry ? jobEntry.totalConsumed : 0;

    // Unlocked if tickets exist specifically for this job, or overall wallet balance exists
    const isUnlocked = jobAvailable > 0 || (wallet && wallet.availableTickets > 0 && (!wallet.jobs || wallet.jobs.length === 0));

    return {
        exists: true,
        jobId: job._id,
        jobTitle: job.title,
        recruiterId: job.recruiterId,
        availableTickets: jobAvailable,
        totalPurchased: jobPurchased,
        totalConsumed: jobConsumed,
        overallAvailableTickets: wallet ? wallet.availableTickets : 0,
        isUnlocked,
        isRestrictedToWhitelist: Boolean(job.isRestrictedToWhitelist),
        allowedCandidatesCount: Array.isArray(job.allowedCandidates) ? job.allowedCandidates.length : 0
    };
};

module.exports = {
    seedDefaultPackages,
    getPackages,
    getWallet,
    creditTickets,
    deductTicketForAssessment,
    getTransactionHistory,
    checkJobAssessmentStatus,
    resolvePrimaryRecruiterId
};
