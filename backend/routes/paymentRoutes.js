const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// 1. Create a Razorpay Order
router.post('/payments/order', paymentController.createOrder);

// 2. Verify Razorpay Payment Signature
router.post('/payments/verify', paymentController.verifyPayment);

// 3. Retrieve User Premium Payment Status
router.get('/payments/status/:userId', paymentController.getPaymentStatus);

// 4. Wallet Routes
router.get('/wallet/balance/:userId', paymentController.getWalletBalance);
router.post('/wallet/topup/order', paymentController.createWalletTopupOrder);
router.post('/wallet/topup/verify', paymentController.verifyWalletTopup);
router.post('/wallet/unlock', paymentController.unlockApplicant);

module.exports = router;
