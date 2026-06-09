const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Initialize Razorpay Instance with environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
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

        // Validate user exists in DB (can be Mongo ID or Firebase UID)
        let user = null;
        if (typeof userId === 'string' && userId.length === 24 && /^[0-9a-fA-F]{24}$/.test(userId)) {
            user = await User.findById(userId);
        }
        if (!user) {
            user = await User.findOne({ uid: userId });
        }

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
            // For modularity, we will also update the user's role/plan if applicable
            const updatedUser = await User.findByIdAndUpdate(transaction.userId, {
                $set: { hiringPattern: "Premium Recruiter", isPro: true } // Updates status safely without breaking userSchema fields
            }, { new: true });

            if (updatedUser) {
                const { syncUserToProfile } = require('../utils/dbSync');
                await syncUserToProfile(updatedUser);
            }

            return res.status(200).json({
                success: true,
                message: "Payment verified and processed successfully.",
                transactionId: transaction._id
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
