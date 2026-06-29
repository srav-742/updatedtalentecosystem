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
authRouter.post('/resource-access-check', validateAccessCheck, authController.resourceAccessCheck);

// JWKS Endpoint (Renders RFC 7517 JSON Web Key Sets)
authRouter.get('/jwks', (req, res) => {
  res.json(keyManager.getJwks());
});

// Mount the Auth Router under v1 prefix
router.use('/api/v1/auth', authRouter);

export default router;
