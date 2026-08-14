const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/users/sync', authController.syncUser);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/auth/google', authController.googleAuth);
router.post('/forgot-password', authController.forgotPassword);
router.post('/auth/forgot-password', authController.forgotPassword);

router.post('/verify-otp', authController.verifyOtp);
router.post('/auth/verify-otp', authController.verifyOtp);

router.post('/reset-password', authController.resetPassword);
router.post('/auth/reset-password', authController.resetPassword);

router.post('/auth/link-password', authMiddleware, authController.linkPassword);

module.exports = router;
