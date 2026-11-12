const crypto = require('crypto');
const Razorpay = require('razorpay');
const ticketService = require('../services/ticketService');
const TicketPackage = require('../models/TicketPackage');
const TicketTransaction = require('../models/TicketTransaction');
const Job = require('../models/Job');
const mongoose = require('mongoose');
const { findRecruiterUser, resolveRecruiterIdentifiers } = require('../utils/userResolver');
const { provisionClientForRecruiter } = require('./paymentController');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'g3rX2v3RjUf2F2h9a3A0K2cQ',
});

/**
 * Get active ticket packages
 * GET /api/tickets/packages
 */
exports.getTicketPackages = async (req, res) => {
    try {
        const packages = await ticketService.getPackages();
        return res.status(200).json({
            success: true,
            packages
        });
    } catch (err) {
        console.error('[TICKET-CONTROLLER] Error fetching packages:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve ticket packages',
            error: err.message
        });
    }
};

/**
 * Get recruiter ticket wallet with combined total & per-job allocations
 * GET /api/tickets/wallet/:recruiterId
 */
exports.getRecruiterWallet = async (req, res) => {
    try {
        const { recruiterId } = req.params;
        if (!recruiterId) {
            return res.status(400).json({ success: false, message: 'Recruiter ID is required.' });
        }

        const wallet = await ticketService.getWallet(recruiterId);
        if (!wallet) {
            return res.status(404).json({ success: false, message: 'Recruiter not found.' });
        }

        return res.status(200).json({
            success: true,
            wallet: {
                recruiterId: wallet.recruiterId,
                availableTickets: wallet.availableTickets,
                totalPurchased: wallet.totalPurchased,
                totalConsumed: wallet.totalConsumed,
                totalRefunded: wallet.totalRefunded,
                lastTransactionAt: wallet.lastTransactionAt,
                jobs: (wallet.jobs || []).map(j => ({
                    jobId: j.jobId,
                    jobTitle: j.jobTitle || 'Untitled Role',
                    totalPurchased: j.totalPurchased || 0,
                    totalConsumed: j.totalConsumed || 0,
                    availableTickets: j.availableTickets || 0,
                    lastPurchasedAt: j.lastPurchasedAt
                }))
            }
        });
    } catch (err) {
        console.error('[TICKET-CONTROLLER] Error fetching wallet:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve ticket wallet',
            error: err.message
        });
    }
};

/**
 * Create a new Razorpay payment order for a ticket package
 * Supports per-job ticket purchases
 * POST /api/tickets/order
 */
exports.createTicketOrder = async (req, res) => {
    try {
        const { recruiterId, packageId, customTicketCount, customAmount, jobId } = req.body;

        if (!recruiterId) {
            return res.status(400).json({ success: false, message: 'Recruiter ID is required.' });
        }

        const recruiterUser = await findRecruiterUser(recruiterId);
        if (!recruiterUser) {
            return res.status(404).json({ success: false, message: 'Recruiter user not found.' });
        }

        if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: 'Select a valid job before purchasing interview tickets.' });
        }

        const { allIds } = await resolveRecruiterIdentifiers(recruiterId);
        const ownedJob = await Job.findOne({
            _id: jobId,
            recruiterId: { $in: Array.from(new Set([recruiterUser.uid, recruiterUser._id.toString(), ...allIds].filter(Boolean))) }
        }).lean();
        if (!ownedJob) {
            return res.status(404).json({ success: false, message: 'The selected job was not found for this recruiter.' });
        }

        const targetJob = ownedJob;
        const jobTitle = targetJob.title || '';

        let ticketCount = 0;
        let amountInInr = 0;
        let pkgName = 'Custom Package';

        if (packageId) {
            const pkg = await TicketPackage.findOne({ packageId });
            if (!pkg) {
                return res.status(404).json({ success: false, message: `Package '${packageId}' not found.` });
            }
            ticketCount = pkg.ticketCount;
            amountInInr = pkg.price;
            pkgName = pkg.name;
        } else if (customTicketCount && customAmount) {
            ticketCount = Number(customTicketCount);
            amountInInr = Number(customAmount);
            pkgName = `${ticketCount} Custom Tickets`;
        } else {
            return res.status(400).json({ success: false, message: 'Either packageId or customTicketCount and customAmount are required.' });
        }

        const amountInPaisa = Math.round(amountInInr * 100);
        const receiptId = `tkt_${String(recruiterId).slice(-6)}_${Date.now()}`;

        const options = {
            amount: amountInPaisa,
            currency: 'INR',
            receipt: receiptId,
            notes: {
                recruiterId: String(recruiterId),
                packageId: packageId || 'custom',
                ticketCount: String(ticketCount),
                jobId: jobId ? String(jobId) : '',
                jobTitle: jobTitle || ''
            }
        };

        const order = await razorpay.orders.create(options);

        // Store pending transaction in DB
        const pendingTx = new TicketTransaction({
            recruiterId: recruiterUser.uid || recruiterUser._id.toString(),
            jobId: jobId || null,
            jobTitle: jobTitle || '',
            type: 'CREDIT',
            quantity: ticketCount,
            balanceBefore: recruiterUser.walletBalance || 0,
            balanceAfter: (recruiterUser.walletBalance || 0) + ticketCount,
            packageId: packageId || 'custom',
            amountPaid: amountInInr,
            paymentOrderId: order.id,
            status: 'pending',
            notes: `Order created for ${pkgName} (${ticketCount} tickets)${jobTitle ? ` for ${jobTitle}` : ''}`
        });
        await pendingTx.save();

        return res.status(201).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            ticketCount,
            packageName: pkgName,
            jobId: jobId || null,
            jobTitle: jobTitle || null,
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu'
        });
    } catch (err) {
        console.error('[TICKET-CONTROLLER] Error creating ticket order:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to create ticket payment order',
            error: err.message
        });
    }
};

/**
 * Verify Razorpay payment signature, credit tickets to specific job, and provision Auth Service credentials
 * POST /api/tickets/verify
 */
exports.verifyTicketPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            packageId,
            recruiterId,
            jobId
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment response signatures from Razorpay.'
            });
        }

        // Validate HMAC SHA256 Signature
        const secret = process.env.RAZORPAY_KEY_SECRET || 'Ux8B43q4JDdmsFYV527STi34';
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            console.error('[TICKET-CONTROLLER] Signature verification mismatch.');
            await TicketTransaction.findOneAndUpdate(
                { paymentOrderId: razorpay_order_id },
                { status: 'failed', notes: 'Signature mismatch' }
            );
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed. Invalid signature.'
            });
        }

        // Locate pending transaction
        const pendingTx = await TicketTransaction.findOne({ paymentOrderId: razorpay_order_id });
        let ticketCount = pendingTx ? pendingTx.quantity : null;
        let effectiveRecruiterId = pendingTx?.recruiterId || recruiterId;
        let effectiveJobId = pendingTx?.jobId || jobId;

        if (pendingTx?.jobId && jobId && String(pendingTx.jobId) !== String(jobId)) {
            return res.status(400).json({ success: false, message: 'The selected job does not match this ticket order.' });
        }

        if (!ticketCount && packageId) {
            const pkg = await TicketPackage.findOne({ packageId });
            if (pkg) ticketCount = pkg.ticketCount;
        }

        if (!ticketCount) {
            ticketCount = 5; // Default fallback
        }

        const recruiterUser = await findRecruiterUser(effectiveRecruiterId);
        if (!recruiterUser) {
            return res.status(404).json({ success: false, message: 'Recruiter not found for ticket credit.' });
        }

        if (!effectiveJobId || !mongoose.Types.ObjectId.isValid(effectiveJobId)) {
            return res.status(400).json({ success: false, message: 'A valid job is required to credit interview tickets.' });
        }

        const { allIds } = await resolveRecruiterIdentifiers(recruiterUser.uid || recruiterUser._id.toString());
        const ownedJob = await Job.findOne({
            _id: effectiveJobId,
            recruiterId: { $in: Array.from(new Set([recruiterUser.uid, recruiterUser._id.toString(), ...allIds].filter(Boolean))) }
        }).lean();
        if (!ownedJob) {
            return res.status(403).json({ success: false, message: 'Tickets can only be credited to a job owned by this recruiter.' });
        }

        const normalizedRecruiterId = recruiterUser.uid || recruiterUser._id.toString();

        // Credit tickets into MongoDB RecruiterTicketWallet (globally & per-job)
        const creditResult = await ticketService.creditTickets({
            recruiterId: normalizedRecruiterId,
            ticketCount,
            jobId: effectiveJobId,
            packageId: packageId || (pendingTx ? pendingTx.packageId : 'custom'),
            amountPaid: pendingTx ? pendingTx.amountPaid : 0,
            paymentOrderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            notes: `Verified Razorpay Payment ${razorpay_payment_id}`
        });

        // Synchronize API Gateway / Auth Service & issue OAuth session tokens & credentials
        let provisionData = null;
        try {
            provisionData = await provisionClientForRecruiter(recruiterUser, 'combined');
            console.log('[TICKET-CONTROLLER] Client provisioned in Auth-Service for recruiter:', normalizedRecruiterId);
        } catch (provErr) {
            console.warn('[TICKET-CONTROLLER] Client provisioning notice:', provErr.message);
        }

        const updatedWallet = creditResult.wallet;

        return res.status(200).json({
            success: true,
            message: `Successfully credited ${ticketCount} tickets to your wallet!`,
            wallet: {
                recruiterId: updatedWallet.recruiterId,
                availableTickets: updatedWallet.availableTickets,
                totalPurchased: updatedWallet.totalPurchased,
                totalConsumed: updatedWallet.totalConsumed,
                jobs: (updatedWallet.jobs || []).map(j => ({
                    jobId: j.jobId,
                    jobTitle: j.jobTitle || '',
                    totalPurchased: j.totalPurchased || 0,
                    totalConsumed: j.totalConsumed || 0,
                    availableTickets: j.availableTickets || 0
                }))
            },
            jobId: effectiveJobId,
            ticketsAdded: ticketCount,
            alreadyCredited: creditResult.alreadyCredited,
            client: provisionData?.client ? {
                clientId: provisionData.client.clientId,
                name: provisionData.client.name,
                roles: provisionData.client.roles
            } : null,
            tokens: provisionData?.tokens || null
        });
    } catch (err) {
        console.error('[TICKET-CONTROLLER] Error verifying ticket payment:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal verification error',
            error: err.message
        });
    }
};

/**
 * Get ticket transaction history
 * GET /api/tickets/history/:recruiterId
 */
exports.getTransactionHistory = async (req, res) => {
    try {
        const { recruiterId } = req.params;
        if (!recruiterId) {
            return res.status(400).json({ success: false, message: 'Recruiter ID is required.' });
        }

        const history = await ticketService.getTransactionHistory(recruiterId);
        return res.status(200).json({
            success: true,
            history
        });
    } catch (err) {
        console.error('[TICKET-CONTROLLER] Error fetching history:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve transaction history',
            error: err.message
        });
    }
};

/**
 * Check job assessment status (unlocked or locked)
 * GET /api/tickets/job-status/:jobId
 */
exports.getJobAssessmentStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            return res.status(400).json({ success: false, message: 'Job ID is required.' });
        }

        const status = await ticketService.checkJobAssessmentStatus(jobId);
        return res.status(200).json({
            success: true,
            ...status
        });
    } catch (err) {
        console.error('[TICKET-CONTROLLER] Error checking job assessment status:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to check job assessment status',
            error: err.message
        });
    }
};
