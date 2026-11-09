const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { findRecruiterUser } = require('../utils/userResolver');

// Initialize Razorpay Instance with environment variables (with sandbox fallback)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'Ux8B43q4JDdmsFYV527STi34',
});

/**
 * Create a new payment order
 * POST /api/payments/order
 */
exports.createOrder = async (req, res) => {
    try {
        const { amount, userId, plan, jobId } = req.body;

        if (!amount || !userId) {
            return res.status(400).json({ 
                success: false, 
                message: "Amount and userId are required." 
            });
        }

        // Validate user exists in DB (supports Mongo ID, Firebase UID, Email)
        const user = await findRecruiterUser(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found." 
            });
        }

        // Razorpay expects amount in the smallest currency unit (Paisa for INR)
        // E.g., ₹500 INR = 500 * 100 = 50000 Paisa
        const amountInPaisa = Math.round(amount * 100);
        const receiptId = `rcpt_${userId.toString().slice(-6)}_${Date.now()}`;

        const options = {
            amount: amountInPaisa,
            currency: 'INR',
            receipt: receiptId,
        };

        const order = await razorpay.orders.create(options);

        // Store transaction in database with "pending" status
        const transaction = new Transaction({
            userId: user._id,
            orderId: order.id,
            amount: amountInPaisa,
            currency: 'INR',
            status: 'pending',
            receipt: receiptId,
            metadata: { plan: plan || 'job_posting', jobId: jobId || null }
        });
        await transaction.save();

        return res.status(201).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu'
        });
    } catch (error) {
        console.error("[PAYMENT-ORDER-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create payment order",
            error: error.message
        });
    }
};

/**
 * Verify payment signature
 * POST /api/payments/verify
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing payment response tokens from Razorpay." 
            });
        }

        // Find the matching transaction in DB
        const transaction = await Transaction.findOne({ orderId: razorpay_order_id });
        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                message: "Transaction order not found in our database." 
            });
        }

        // Generate SHA256 HMAC digest to verify authenticity of payment
        const text = razorpay_order_id + "|" + razorpay_payment_id;
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(text.toString())
            .digest('hex');

        if (generatedSignature === razorpay_signature) {
            // Payment verified successfully!
            transaction.paymentId = razorpay_payment_id;
            transaction.signature = razorpay_signature;
            transaction.status = 'paid';
            await transaction.save();

            // Here we can unlock the premium plan / upgrade recruiter credits
            const planSelected = transaction.metadata?.plan || 'Starter Plan';
            let limit = 1;
            const pLower = planSelected.toLowerCase();
            if (pLower.includes('growth')) limit = 3;
            else if (pLower.includes('business')) limit = 5;

            const updatedUser = await User.findByIdAndUpdate(transaction.userId, {
                $set: { 
                    hiringPattern: "Premium Recruiter", 
                    isPro: true, 
                    selectedPlan: planSelected
                },
                $inc: {
                    jobLimit: limit
                },
                $push: {
                    purchasedPlans: {
                        plan: planSelected,
                        jobLimit: limit,
                        purchasedAt: new Date(),
                        orderId: transaction.orderId,
                        paymentId: razorpay_payment_id
                    }
                }
            }, { new: true });

            let clientCreds = null;

            if (updatedUser) {
                const { syncUserToProfile } = require('../utils/dbSync');
                await syncUserToProfile(updatedUser);

                // AUTOMATED CLIENT PROVISIONING IN JAVA AUTH SERVICE & MYSQL
                try {
                    const axios = require('axios');
                    const PlaintextClientCredential = require('../models/PlaintextClientCredential');

                    const recruiterUid = updatedUser.uid || updatedUser._id.toString();
                    
                    console.log(`[PAYMENT-SUCCESS] Triggering client credentials registration for ${recruiterUid} with plan ${planSelected}`);

                    const registerRes = await axios.post('http://localhost:9090/oauth-service/api/v1/auth/client/register', {
                        uid: recruiterUid,
                        plan: 'combined',
                        clientName: updatedUser.name || 'Recruiter'
                    });

                    if (registerRes.data && registerRes.data.success) {
                        const { clientId, clientSecret } = registerRes.data;

                        // Save/Update credentials in MongoDB PlaintextClientCredential collection
                        clientCreds = await PlaintextClientCredential.findOneAndUpdate(
                            { clientId: clientId },
                            {
                                clientId: clientId,
                                clientSecretRaw: clientSecret,
                                name: updatedUser.name || 'Recruiter',
                                description: `Plan: ${planSelected}`,
                                status: 'active'
                            },
                            { upsert: true, new: true }
                        );

                        console.log(`[PAYMENT-SUCCESS] Credentials saved in MongoDB for ${clientId}`);
                    }
                } catch (provisionErr) {
                    console.error('[PAYMENT-SUCCESS] Provisioning client credentials in Auth Service failed:', 
                        provisionErr.response?.data || provisionErr.message);
                }
            }

            // Move target job from draft to pending_approval
            const targetJobId = req.body.jobId || transaction.metadata?.jobId;
            if (targetJobId) {
                try {
                    const Job = require('../models/Job');
                    const { clearJobsCache } = require('./jobController');
                    const updatedJob = await Job.findByIdAndUpdate(
                        targetJobId,
                        { status: 'pending_approval' },
                        { new: true }
                    );
                    if (updatedJob) {
                        console.log(`[PAYMENT-SUCCESS] Updated job ${targetJobId} status to pending_approval`);
                        clearJobsCache();
                    }
                } catch (jobErr) {
                    console.error('[PAYMENT-SUCCESS] Failed to update job status:', jobErr.message);
                }
            }

            return res.status(200).json({
                success: true,
                message: "Payment verified and processed successfully. Job submitted for admin approval.",
                transactionId: transaction._id,
                clientId: clientCreds ? clientCreds.clientId : `client_${updatedUser.uid || updatedUser._id}`,
                clientSecret: clientCreds ? clientCreds.clientSecretRaw : null
            });
        } else {
            // Signature verification failed
            transaction.status = 'failed';
            await transaction.save();

            return res.status(400).json({
                success: false,
                message: "Security verification failed. Signature is invalid."
            });
        }
    } catch (error) {
        console.error("[PAYMENT-VERIFY-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Internal verification error.",
            error: error.message
        });
    }
};

/**
 * Get subscription / payment status for a specific user
 * GET /api/payments/status/:userId
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await findRecruiterUser(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Retrieve successful transactions
        const transactions = await Transaction.find({ 
            userId: user._id, 
            status: 'paid' 
        }).sort({ createdAt: -1 });

        const Job = require('../models/Job');
        const { buildRecruiterJobQuery } = require('../utils/userResolver');
        
        let publishedCount = 0;
        try {
            const jobQuery = await buildRecruiterJobQuery(user._id);
            publishedCount = await Job.countDocuments({
                ...jobQuery,
                status: { $in: ['pending_approval', 'approved'] }
            });
        } catch (err) {
            console.error("Error getting published count:", err.message);
        }

        let activePlans = [];
        let totalLimit = user.jobLimit || 0;
        let remainingPublished = publishedCount;

        if (user.purchasedPlans && user.purchasedPlans.length > 0) {
            activePlans = user.purchasedPlans.map(p => {
                const planLimit = p.jobLimit || 1;
                const used = Math.min(planLimit, remainingPublished);
                remainingPublished = Math.max(0, remainingPublished - planLimit);
                return {
                    plan: p.plan,
                    jobLimit: planLimit,
                    used: used,
                    purchasedAt: p.purchasedAt
                };
            });
        }

        if (totalLimit === 0 && activePlans.length > 0) {
            totalLimit = activePlans.reduce((sum, p) => sum + p.jobLimit, 0);
        }

        return res.status(200).json({
            success: true,
            isPremium: activePlans.length > 0 || user.isPro === true,
            selectedPlan: user.selectedPlan || null,
            jobLimit: totalLimit,
            publishedCount: publishedCount,
            activePlans: activePlans,
            history: transactions
        });
    } catch (error) {
        console.error("[PAYMENT-STATUS-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve payment status.",
            error: error.message
        });
    }
};

/**
 * Get wallet balance for a user
 * GET /api/wallet/balance/:userId
 */
exports.getWalletBalance = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await findRecruiterUser(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        return res.status(200).json({
            success: true,
            balance: user.walletBalance || 0
        });
    } catch (error) {
        console.error("[WALLET-BALANCE-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve wallet balance.",
            error: error.message
        });
    }
};

/**
 * Create a new wallet top-up payment order
 * POST /api/wallet/topup/order
 */
exports.createWalletTopupOrder = async (req, res) => {
    try {
        const { amount, userId } = req.body;
        if (!amount || !userId) {
            return res.status(400).json({ 
                success: false, 
                message: "Amount and userId are required." 
            });
        }
        const user = await findRecruiterUser(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const amountInPaisa = Math.round(amount * 100);
        const receiptId = `topup_${userId.toString().slice(-6)}_${Date.now()}`;

        const options = {
            amount: amountInPaisa,
            currency: 'INR',
            receipt: receiptId,
        };

        const order = await razorpay.orders.create(options);

        // Store transaction in database with "pending" status
        const transaction = new Transaction({
            userId: user._id,
            orderId: order.id,
            amount: amountInPaisa,
            currency: 'INR',
            status: 'pending',
            type: 'wallet_topup',
            receipt: receiptId
        });
        await transaction.save();

        return res.status(201).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt
        });
    } catch (error) {
        console.error("[WALLET-TOPUP-ORDER-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create topup order",
            error: error.message
        });
    }
};

/**
 * Verify wallet top-up payment signature and credit balance
 * POST /api/wallet/topup/verify
 */
exports.verifyWalletTopup = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing payment response tokens." 
            });
        }

        const transaction = await Transaction.findOne({ orderId: razorpay_order_id });
        if (!transaction) {
            return res.status(404).json({ 
                success: false, 
                message: "Transaction order not found in database." 
            });
        }

        const text = razorpay_order_id + "|" + razorpay_payment_id;
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(text.toString())
            .digest('hex');

        if (generatedSignature === razorpay_signature) {
            transaction.paymentId = razorpay_payment_id;
            transaction.signature = razorpay_signature;
            transaction.status = 'paid';
            await transaction.save();

            // Credit the user's wallet
            const creditAmount = transaction.amount / 100; // Paisa to Rupees
            const updatedUser = await User.findByIdAndUpdate(transaction.userId, {
                $inc: { walletBalance: creditAmount }
            }, { new: true });

            return res.status(200).json({
                success: true,
                message: "Wallet topped up successfully.",
                balance: updatedUser.walletBalance,
                transactionId: transaction._id
            });
        } else {
            transaction.status = 'failed';
            await transaction.save();
            return res.status(400).json({
                success: false,
                message: "Verification failed. Signature is invalid."
            });
        }
    } catch (error) {
        console.error("[WALLET-TOPUP-VERIFY-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Internal verification error.",
            error: error.message
        });
    }
};

/**
 * Deduct wallet balance to unlock candidate
 * POST /api/wallet/unlock
 */
exports.unlockApplicant = async (req, res) => {
    try {
        const { recruiterId, applicationId, itemType } = req.body;
        const UnlockedApplicant = require('../models/UnlockedApplicant');
        const Application = require('../models/Application');

        if (!recruiterId || !applicationId || !itemType) {
            return res.status(400).json({ success: false, message: "Recruiter ID, Application ID, and Item Type are required." });
        }

        const validItems = ['resume', 'assessment', 'interview'];
        if (!validItems.includes(itemType)) {
            return res.status(400).json({ success: false, message: "Invalid item type." });
        }

        // Determine cost
        let cost = 0;
        if (itemType === 'resume') {
            cost = Number(process.env.RESUME_COST || 3);
        } else if (itemType === 'assessment') {
            cost = Number(process.env.ASSESSMENT_COST || 5);
        } else if (itemType === 'interview') {
            cost = Number(process.env.INTERVIEW_COST || 10);
        }

        // Find recruiter
        const recruiterDoc = await findRecruiterUser(recruiterId);
        if (!recruiterDoc) {
            return res.status(404).json({ success: false, message: "Recruiter user not found." });
        }
        const recruiter = await User.findById(recruiterDoc._id);

        // Find application
        const application = await Application.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found." });
        }

        // Check if already unlocked
        let unlockRecord = await UnlockedApplicant.findOne({
            recruiterId: recruiter._id,
            applicationId: application._id
        });

        if (unlockRecord && unlockRecord.unlockedItems && unlockRecord.unlockedItems.includes(itemType)) {
            return res.status(200).json({
                success: true,
                message: `Applicant's ${itemType} is already unlocked.`,
                balance: recruiter.walletBalance
            });
        }

        if ((recruiter.walletBalance || 0) < cost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. You need ₹${cost.toFixed(2)} to unlock, but have ₹${(recruiter.walletBalance || 0).toFixed(2)}.`
            });
        }

        // Deduct balance and save recruiter
        recruiter.walletBalance = Number(((recruiter.walletBalance || 0) - cost).toFixed(2));
        await recruiter.save();

        const { syncUserToProfile } = require('../utils/dbSync');
        await syncUserToProfile(recruiter);

        // Create or update unlock entry
        if (!unlockRecord) {
            unlockRecord = new UnlockedApplicant({
                recruiterId: recruiter._id,
                applicationId: application._id,
                unlockedItems: [itemType],
                cost: cost
            });
        } else {
            if (!unlockRecord.unlockedItems) {
                unlockRecord.unlockedItems = [];
            }
            unlockRecord.unlockedItems.push(itemType);
            unlockRecord.cost = Number(((unlockRecord.cost || 0) + cost).toFixed(2));
        }
        await unlockRecord.save();

        // Log deduction transaction
        const receiptId = `unlock_${itemType}_${recruiter._id.toString().slice(-6)}_${Date.now()}`;
        const transaction = new Transaction({
            userId: recruiter._id,
            orderId: `ord_unlock_${itemType}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            paymentId: `pay_unlock_${itemType}_${Date.now()}`,
            amount: cost * 100, // in Paisa
            status: 'paid',
            type: 'applicant_unlock',
            receipt: receiptId,
            metadata: {
                applicationId: application._id,
                candidateName: application.applicantName,
                itemType: itemType
            }
        });
        await transaction.save();

        return res.status(200).json({
            success: true,
            message: `Applicant's ${itemType} unlocked successfully.`,
            balance: recruiter.walletBalance
        });
    } catch (error) {
        console.error("[WALLET-UNLOCK-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to unlock item.",
            error: error.message
        });
    }
};

/**
 * Deduct wallet balance to pay for Premium Upgrade
 * POST /api/wallet/pay-upgrade
 */
exports.payUpgradeWithWallet = async (req, res) => {
    try {
        const { userId, amount = 10 } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required." });
        }

        const cost = Number(amount);
        let user = null;
        if (typeof userId === 'string' && userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)) {
            user = await User.findById(userId);
        }
        if (!user) {
            user = await User.findOne({ uid: userId });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if ((user.walletBalance || 0) < cost) {
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. You need ₹${cost.toFixed(2)} to upgrade, but have ₹${(user.walletBalance || 0).toFixed(2)}. Please top up your wallet first.`
            });
        }

        // Deduct balance and update user to Premium
        user.walletBalance = Number(((user.walletBalance || 0) - cost).toFixed(2));
        user.isPro = true;
        user.hiringPattern = 'Premium Recruiter';
        await user.save();

        const { syncUserToProfile } = require('../utils/dbSync');
        await syncUserToProfile(user);

        // Record paid transaction
        const receiptId = `upgrade_wallet_${user._id.toString().slice(-6)}_${Date.now()}`;
        const transaction = new Transaction({
            userId: user._id,
            orderId: `ord_upgrade_wallet_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            paymentId: `pay_upgrade_wallet_${Date.now()}`,
            amount: cost * 100, // in Paisa
            status: 'paid',
            type: 'premium_upgrade',
            receipt: receiptId,
            metadata: {
                paymentMethod: 'wallet',
                plan: 'Premium Recruiter'
            }
        });
        await transaction.save();

        return res.status(200).json({
            success: true,
            message: "Successfully upgraded to Premium Recruiter using wallet balance!",
            balance: user.walletBalance,
            user
        });
    } catch (error) {
        console.error("[WALLET-UPGRADE-ERROR] Details:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to upgrade using wallet balance.",
            error: error.message
        });
    }
};

