const Razorpay = require('razorpay');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { findRecruiterUser } = require('../utils/userResolver');

/**
 * Provision / Update recruiter client and roles in Authorization Service (MySQL) & MongoDB
 */
const provisionClientForRecruiter = async (user, plan = 'combined', customClientName = null) => {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:8080/oauth-service';
    const apiGatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:9090';
    let clientProvisionResult = null;
    let authSessionTokens = null;

    const uid = user.uid || user._id.toString();
    const clientId = `client_${uid}`;

    // 1. Resolve or generate unique client secret
    const Client = require('../models/Client');
    const Role = require('../models/Role');
    const ClientRole = require('../models/ClientRole');
    const PlaintextClientCredential = require('../models/PlaintextClientCredential');

    let clientSecretPlain = null;
    try {
        const existingPlaintext = await PlaintextClientCredential.findOne({ clientId });
        if (existingPlaintext && existingPlaintext.clientSecretRaw) {
            clientSecretPlain = existingPlaintext.clientSecretRaw;
        } else {
            clientSecretPlain = `h1p_sec_${crypto.randomBytes(8).toString('hex')}`;
        }
    } catch (e) {
        clientSecretPlain = `h1p_sec_${crypto.randomBytes(8).toString('hex')}`;
    }

    // 2. Provision / Update Client & Roles in API Gateway Inbound / Auth Service
    let clientName = customClientName
        || (user.company && user.company.name)
        || user.name
        || (user.email ? user.email.split('@')[0] : 'Recruiter Client');

    const registerPayload = {
        uid: uid,
        plan: plan, // Grants RECRUITER_POST_JOB & RECRUITER_VIEW_APPLICANTS
        clientName: clientName
    };

    // Try API Gateway inbound first (/oauth-service/api/v1/auth/client/register), then direct Auth-Service
    const targetEndpoints = [
        `${apiGatewayUrl}/oauth-service/api/v1/auth/client/register`,
        `${authServiceUrl}/api/v1/auth/client/register`,
        `${apiGatewayUrl}/api/v1/auth/client/register`,
        `${apiGatewayUrl}/api/gateway/client/register`
    ];

    for (const endpoint of targetEndpoints) {
        try {
            const regRes = await axios.post(endpoint, registerPayload, {
                headers: { 
                    'Content-Type': 'application/json'
                },
                timeout: 4000
            });
            if (regRes.data && (regRes.data.success || regRes.data.clientId)) {
                clientProvisionResult = regRes.data;
                if (regRes.data.clientSecret) {
                    clientSecretPlain = regRes.data.clientSecret;
                }
                if (regRes.data.clientName) {
                    clientName = regRes.data.clientName;
                }
                console.log(`[PROVISION] Successfully registered client with Gateway/Auth-Service via ${endpoint}`);
                break;
            }
        } catch (callErr) {
            console.warn(`[PROVISION] Failed registering client at ${endpoint}:`, callErr.response?.data?.message || callErr.response?.data || callErr.message);
        }
    }

    // 3. Synchronize with MongoDB Client, Role, ClientRole, and PlaintextClientCredential models
    try {
        const hashedSecret = await bcrypt.hash(clientSecretPlain, 10);

        let mongoClient = await Client.findOne({ clientId });
        if (!mongoClient) {
            mongoClient = new Client({
                clientId,
                clientSecret: hashedSecret,
                name: clientName,
                status: 'active'
            });
            await mongoClient.save();
        } else {
            mongoClient.clientSecret = hashedSecret;
            mongoClient.name = clientName;
            mongoClient.status = 'active';
            await mongoClient.save();
        }

        let premiumRole = await Role.findOne({ name: 'premium_recruiter' });
        if (!premiumRole) {
            premiumRole = new Role({
                name: 'premium_recruiter',
                description: 'Paid/pro recruiter with access to applicants'
            });
            await premiumRole.save();
        }

        await ClientRole.findOneAndUpdate(
            { client: mongoClient._id, role: premiumRole._id },
            { client: mongoClient._id, role: premiumRole._id },
            { upsert: true, new: true }
        );

        await PlaintextClientCredential.findOneAndUpdate(
            { clientId },
            { 
                clientId, 
                clientSecretRaw: clientSecretPlain,
                name: clientName,
                description: `API Client for recruiter: ${user.email}`,
                status: 'active'
            },
            { upsert: true, new: true }
        );

        console.log(`[PROVISION] Stored client credentials for ${user.email} (Client ID: ${clientId})`);
    } catch (mongoErr) {
        console.error('[PROVISION] MongoDB client sync error:', mongoErr.message);
    }

    // 4. Authenticate to generate active OAuth session tokens if auth service available
    try {
        const basicAuth = Buffer.from(`${clientId}:${clientSecretPlain}`).toString('base64');
        const tokenRes = await axios.post(`${authServiceUrl}/oauth/authenticate`, {}, {
            headers: { 'Authorization': `Basic ${basicAuth}` },
            timeout: 3000
        });
        if (tokenRes.data) {
            authSessionTokens = tokenRes.data;
        }
    } catch (tokErr) {
        // Fallback local JWT tokens
        try {
            const { generateAccessToken, generateRefreshToken } = require('../services/authService');
            authSessionTokens = {
                accessToken: generateAccessToken(user),
                refreshToken: generateRefreshToken(user)
            };
        } catch (jwtErr) {}
    }

    return {
        client: {
            clientId: clientId,
            clientSecret: clientSecretPlain,
            name: clientName,
            roles: ['premium_recruiter', 'RECRUITER_VIEW_APPLICANTS', 'RECRUITER_POST_JOB']
        },
        tokens: authSessionTokens
    };
};

// Initialize Razorpay Instance with environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Sr8a8DZ72jBYCu',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'g3rX2v3RjUf2F2h9a3A0K2cQ',
});

/**
 * Create a new payment order
 * POST /api/payments/order
 */
exports.createOrder = async (req, res) => {
    try {
        const { amount, userId } = req.body;

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

        // Idempotency: Return early if already verified and paid
        if (transaction.status === 'paid') {
            return res.status(200).json({
                success: true,
                message: "Payment already verified and processed.",
                transactionId: transaction._id,
                alreadyProcessed: true
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

            // Unlock premium recruiter plan
            const updatedUser = await User.findByIdAndUpdate(transaction.userId, {
                $set: { hiringPattern: "Premium Recruiter", isPro: true }
            }, { new: true });

            let provisionData = null;
            if (updatedUser) {
                const { syncUserToProfile } = require('../utils/dbSync');
                await syncUserToProfile(updatedUser);

                // Automatic Client Provisioning in Auth Service (MySQL 8.4) & MongoDB
                provisionData = await provisionClientForRecruiter(updatedUser, 'combined');
            }

            return res.status(200).json({
                success: true,
                message: "Payment verified and recruiter credentials provisioned successfully.",
                transactionId: transaction._id,
                user: updatedUser ? {
                    id: updatedUser._id,
                    uid: updatedUser.uid,
                    email: updatedUser.email,
                    isPro: true,
                    hiringPattern: updatedUser.hiringPattern
                } : null,
                client: provisionData?.client ? {
                    clientId: provisionData.client.clientId,
                    roles: provisionData.client.roles
                } : null,
                tokens: provisionData?.tokens
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

        return res.status(200).json({
            success: true,
            isPremium: transactions.length > 0 && user.isPro === true,
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

        // Automatic Client Provisioning in Auth Service (MySQL 8.4) & MongoDB
        const provisionData = await provisionClientForRecruiter(user, 'combined');

        return res.status(200).json({
            success: true,
            message: "Successfully upgraded to Premium Recruiter using wallet balance!",
            balance: user.walletBalance,
            user,
            client: provisionData?.client ? {
                clientId: provisionData.client.clientId,
                roles: provisionData.client.roles
            } : null,
            tokens: provisionData?.tokens
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

exports.provisionClientForRecruiter = provisionClientForRecruiter;

