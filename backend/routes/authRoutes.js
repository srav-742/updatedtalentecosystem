const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/users/sync', authController.syncUser);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/auth/google', authController.googleAuth);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
