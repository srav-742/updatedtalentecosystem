const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// 1. Configurable Ticket Packages
router.get('/tickets/packages', ticketController.getTicketPackages);

// 2. Recruiter Wallet Balance & Stats
router.get('/tickets/wallet/:recruiterId', ticketController.getRecruiterWallet);

// 3. Purchase Ticket Order Creation (Razorpay)
router.post('/tickets/order', ticketController.createTicketOrder);

// 4. Verify Payment Signature & Credit Wallet
router.post('/tickets/verify', ticketController.verifyTicketPayment);

// 5. Recruiter Transaction History Ledger
router.get('/tickets/history/:recruiterId', ticketController.getTransactionHistory);

// 6. Check Job Assessment Lock Status
router.get('/tickets/job-status/:jobId', ticketController.getJobAssessmentStatus);

module.exports = router;

