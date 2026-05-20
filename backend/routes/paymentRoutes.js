const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// 1. Create a Razorpay Order
router.post('/payments/order', paymentController.createOrder);

// 2. Verify Razorpay Payment Signature
router.post('/payments/verify', paymentController.verifyPayment);

// 3. Retrieve User Premium Payment Status
router.get('/payments/status/:userId', paymentController.getPaymentStatus);

module.exports = router;
