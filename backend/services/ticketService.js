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

    if (!jobId) {
        throw new Error('A job is required to assign purchased tickets.');
    }

    const { allIds } = await resolveRecruiterIdentifiers(primaryId);
    let targetJob = null;
    try {
        targetJob = await Job.findOne({
            _id: jobId,
            recruiterId: { $in: Array.from(new Set([primaryId, ...(allIds || [])])) }
        }).lean();
    } catch (jobErr) {
        throw new Error('A valid job is required to assign purchased tickets.');
    }
    if (!targetJob) {
        throw new Error('The selected job was not found for this recruiter.');
    }
    const targetJobTitle = targetJob.title || 'Job Assessment';

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

    // Ensure the wallet has an allocation row, then update both the job and
    // combined wallet counters in one atomic write.
    await getWallet(primaryId);
    const purchasedAt = new Date();
    const wallet = await RecruiterTicketWallet.findOneAndUpdate(
        { recruiterId: primaryId, 'jobs.jobId': targetJob._id },
        {
            $inc: {
                totalPurchased: count,
                availableTickets: count,
                'jobs.$.totalPurchased': count,
                'jobs.$.availableTickets': count
            },
            $set: {
                'jobs.$.jobTitle': targetJobTitle,
                'jobs.$.lastPurchasedAt': purchasedAt,
                lastTransactionAt: purchasedAt
            }
        },
        { new: true }
    );
    if (!wallet) {
        throw new Error('Could not find this job in the recruiter ticket wallet. Please refresh and try again.');
    }

    const balanceAfter = wallet.availableTickets;
    const balanceBefore = balanceAfter - count;

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

    if (!jobId || !applicationId || !candidateId) {
        return {
            success: false,
            reason: 'INVALID_ASSESSMENT_CONTEXT',
            message: 'A job, application, and candidate are required to start an assessment.'
        };
    }

    const { allIds } = await resolveRecruiterIdentifiers(primaryId);
    const targetJob = await Job.findOne({
        _id: jobId,
        recruiterId: { $in: Array.from(new Set([primaryId, ...(allIds || [])])) }
    }).lean();
    if (!targetJob) {
        return {
            success: false,
            reason: 'JOB_NOT_OWNED',
            message: 'The assessment job could not be matched to its recruiter.'
        };
    }
    const targetJobTitle = targetJob.title || '';

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
        const jobEntry = wallet?.jobs?.find(j => j.jobId && j.jobId.toString() === jobId.toString());
        return {
            success: true,
            alreadyConsumed: true,
            availableTickets: wallet?.availableTickets || 0,
            jobAvailableTickets: jobEntry?.availableTickets || 0,
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

    // Compare and decrement atomically so simultaneous starts cannot consume
    // more tickets than this specific job owns.
    const balanceAfterWallet = await RecruiterTicketWallet.findOneAndUpdate(
        {
            recruiterId: primaryId,
            availableTickets: { $gte: 1 },
            jobs: { $elemMatch: { jobId, availableTickets: { $gte: 1 } } }
        },
        {
            $inc: {
                availableTickets: -1,
                totalConsumed: 1,
                'jobs.$.availableTickets': -1,
                'jobs.$.totalConsumed': 1
            },
            $set: { lastTransactionAt: new Date() }
        },
        { new: true }
    );

    if (!balanceAfterWallet) {
        const currentWallet = await getWallet(primaryId);
        const currentJob = currentWallet?.jobs?.find(j => j.jobId && j.jobId.toString() === jobId.toString());
        console.warn(`[TICKET-SERVICE] Insufficient tickets for recruiter ${primaryId} on job ${jobId}.`);
        return {
            success: false,
            reason: 'INSUFFICIENT_TICKETS',
            availableTickets: currentWallet?.availableTickets || 0,
            jobAvailableTickets: currentJob?.availableTickets || 0,
            message: targetJobTitle
                ? `No available interview tickets remaining for "${targetJobTitle}". Please purchase tickets for this job.`
                : 'No available interview tickets remaining for this job.'
        };
    }

    const updatedJobEntry = balanceAfterWallet.jobs.find(j => j.jobId && j.jobId.toString() === jobId.toString());
    const balanceBefore = balanceAfterWallet.availableTickets + 1;
    const balanceAfter = balanceAfterWallet.availableTickets;
    let transaction = null;
    let consumption = null;

    try {
        // Save the unique consumption record after the atomic reservation. Its
        // unique indexes make retries idempotent; a duplicate reservation is
        // returned to the wallet below.
        consumption = new AssessmentTicketConsumption({
            recruiterId: primaryId,
            jobId,
            candidateId: String(candidateId),
            candidateEmail: candidateEmail ? candidateEmail.toLowerCase().trim() : '',
            applicationId
        });
        await consumption.save();

        transaction = new TicketTransaction({
            recruiterId: primaryId,
            candidateId: String(candidateId),
            jobId,
            jobTitle: targetJobTitle,
            applicationId,
            type: 'DEBIT',
            quantity: 1,
            balanceBefore,
            balanceAfter,
            status: 'completed',
            notes: `Assessment started by candidate ${candidateEmail || candidateId} for job ${targetJobTitle || jobId}`
        });
        await transaction.save();
        consumption.transactionId = transaction._id;
        await consumption.save();
    } catch (writeErr) {
        if (writeErr.code === 11000) {
            if (transaction) {
                await TicketTransaction.findByIdAndUpdate(transaction._id, {
                    $set: { status: 'failed', notes: 'Duplicate assessment start; ticket reservation rolled back.' }
                });
            }
            await RecruiterTicketWallet.updateOne(
                { recruiterId: primaryId, 'jobs.jobId': jobId },
                {
                    $inc: {
                        availableTickets: 1,
                        totalConsumed: -1,
                        'jobs.$.availableTickets': 1,
                        'jobs.$.totalConsumed': -1
                    },
                    $set: { lastTransactionAt: new Date() }
                }
            );
            const existing = await AssessmentTicketConsumption.findOne({
                jobId,
                $or: [
                    { applicationId },
                    { candidateId: String(candidateId) },
                    ...(candidateEmail ? [{ candidateEmail: candidateEmail.toLowerCase().trim() }] : [])
                ]
            });
            const currentWallet = await getWallet(primaryId);
            const currentJob = currentWallet?.jobs?.find(j => j.jobId && j.jobId.toString() === jobId.toString());
            if (existing) {
                return {
                    success: true,
                    alreadyConsumed: true,
                    availableTickets: currentWallet?.availableTickets || 0,
                    jobAvailableTickets: currentJob?.availableTickets || 0,
                    consumption: existing,
                    message: 'Session resumed. No additional ticket was consumed.'
                };
            }
            if (consumption) await AssessmentTicketConsumption.deleteOne({ _id: consumption._id });
            if (transaction) {
                await TicketTransaction.findByIdAndUpdate(transaction._id, { $set: { status: 'failed' } });
            }
            throw writeErr;
        } else {
            if (consumption) await AssessmentTicketConsumption.deleteOne({ _id: consumption._id });
            if (transaction) await TicketTransaction.findByIdAndUpdate(transaction._id, { $set: { status: 'failed' } });
            await RecruiterTicketWallet.updateOne(
                { recruiterId: primaryId, 'jobs.jobId': jobId },
                {
                    $inc: {
                        availableTickets: 1,
                        totalConsumed: -1,
                        'jobs.$.availableTickets': 1,
                        'jobs.$.totalConsumed': -1
                    },
                    $set: { lastTransactionAt: new Date() }
                }
            );
            throw writeErr;
        }
    }

    if (!transaction) {
        throw new Error('Could not record the assessment ticket transaction.');
    }

    console.log(`[TICKET-SERVICE] Deducted 1 ticket for job ${jobId}. Remaining tickets for recruiter ${primaryId}: ${balanceAfter}`);

    return {
        success: true,
        alreadyConsumed: false,
        availableTickets: balanceAfter,
        jobAvailableTickets: updatedJobEntry?.availableTickets || 0,
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

    // Strictly unlocked if tickets exist specifically for this job
    const isUnlocked = jobAvailable > 0;

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
