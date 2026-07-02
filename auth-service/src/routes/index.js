/**
 * @fileoverview Main Route Index
 * @module routes/index
 *
 * Configures and mounts all routes for the Auth Service.
 */

import { Router } from 'express';
import healthController from '../health/health.controller.js';
import keyManager from '../security/keyManager.js';

// Controller
import authController from '../controllers/auth.controller.js';

// Validators
import {
  validateLogin,
  validateVerify,
  validateRefresh,
  validateAccessCheck,
  validateSignupCandidate,
  validateSignupRecruiter,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateVerifyEmail,
  validateConfirmEmail,
  validateGoogleAuth,
} from '../validators/auth.validator.js';

const router = Router();

// ─── Health check routes (root and prefixed) ───────────
router.use('/', healthController);
router.use('/api/v1/auth', healthController);

// ─── Auth API Endpoints (v1) ───────────────────────────
const authRouter = Router();

// Mount mapped Auth endpoints
authRouter.post('/login', validateLogin, authController.login);
authRouter.post('/verify', validateVerify, authController.verify);
authRouter.post('/refresh', validateRefresh, authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.post('/logout-all', authController.logoutAll);
authRouter.post('/resource-access-check', validateAccessCheck, authController.resourceAccessCheck);

// New Enterprise Auth endpoints
authRouter.post('/signup/recruiter', validateSignupRecruiter, authController.signupRecruiter);
authRouter.post('/signup/candidate', validateSignupCandidate, authController.signupCandidate);
authRouter.post('/google', validateGoogleAuth, authController.googleLogin);
authRouter.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
authRouter.post('/verify-otp', authController.verifyOtp);
authRouter.post('/reset-password', validateResetPassword, authController.resetPassword);
authRouter.post('/change-password', validateChangePassword, authController.changePassword);
authRouter.post('/verify-email', validateVerifyEmail, authController.verifyEmail);
authRouter.post('/verify-email/confirm', validateConfirmEmail, authController.confirmEmail);

// JWKS Endpoint (Renders RFC 7517 JSON Web Key Sets)
authRouter.get('/jwks', (req, res) => {
  res.json(keyManager.getJwks());
});

// Diagnostics endpoint for floating UI overlay
authRouter.get('/diagnostics/state', authController.getDiagnosticsState);

// Mount the Auth Router under v1 prefix
router.use('/api/v1/auth', authRouter);

// Support gateway token exchange and refresh directly on root router for API Gateway routing
router.post('/api/gateway/token', authController.gatewayTokenExchange);
router.post('/api/gateway/refresh', authController.refresh);

export default router;
