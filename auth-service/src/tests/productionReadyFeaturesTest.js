/**
 * @fileoverview Integration Test for New Enterprise Authentication Features
 * @module tests/productionReadyFeaturesTest
 */

import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDatabase, closeDatabase } from '../config/database.js';
import { connectRedis, closeRedis } from '../config/redis.js';

// Repositories
import UserRepository from '../repositories/UserRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import PermissionRepository from '../repositories/PermissionRepository.js';
import SessionRepository from '../repositories/SessionRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import PasswordResetOtpRepository from '../repositories/PasswordResetOtpRepository.js';
import ClientRepository from '../repositories/ClientRepository.js';
import AuditRepository from '../repositories/AuditRepository.js';

// Services
import passwordService from '../security/password.service.js';
import logger from '../logger/logger.js';

const TEST_PORT = 5003;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const runEnterpriseTests = async () => {
  logger.info('=====================================================');
  logger.info('   Running Enterprise Auth Features Integration Tests');
  logger.info('=====================================================');

  let server;
  const testId = new mongoose.Types.ObjectId();
  const prefix = `ent_${testId.toString().slice(-6)}_`;

  const candidateEmail = `${prefix}candidate@example.com`;
  const recruiterEmail = `${prefix}recruiter@example.com`;
  const googleEmail = `${prefix}google@example.com`;
  const testPassword = 'Password123!';
  const newPassword = 'NewPassword123!';

  try {
    // 1. Connect to Database & Cache
    await connectDatabase();
    await connectRedis().catch(() => {
      logger.warn('Redis is not running. Session caching will fallback to database.');
    });

    // 2. Spin up Express Server
    logger.info(`Starting Express server on port ${TEST_PORT}...`);
    server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.listen(TEST_PORT, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    logger.info('✔ Server is listening.');

    // ─── Test 1: Candidate Signup ────────────────────────
    logger.info('\n--- Test 1: Candidate Signup ---');
    const candSignupRes = await fetch(`${BASE_URL}/api/v1/auth/signup/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: candidateEmail,
        password: testPassword,
        name: 'John Candidate',
        location: 'New York',
      }),
    });

    if (candSignupRes.status !== 201) {
      throw new Error(`Candidate signup failed with status: ${candSignupRes.status}`);
    }

    const candSignupData = await candSignupRes.json();
    if (!candSignupData.success || candSignupData.data.user.role !== 'candidate') {
      throw new Error('Invalid candidate signup response structure');
    }
    logger.info('✔ Candidate signup successful.');

    // Duplicate Email Check
    const candSignupDupRes = await fetch(`${BASE_URL}/api/v1/auth/signup/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: candidateEmail,
        password: testPassword,
        name: 'John Candidate Duplicate',
      }),
    });

    if (candSignupDupRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for duplicate email, got: ${candSignupDupRes.status}`);
    }
    logger.info('✔ Candidate signup duplicate email check passed.');

    // ─── Test 2: Recruiter Signup & Client Gen ───────────
    logger.info('\n--- Test 2: Recruiter Signup & Client Generation ---');
    const recSignupRes = await fetch(`${BASE_URL}/api/v1/auth/signup/recruiter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: recruiterEmail,
        password: testPassword,
        name: 'Alice Recruiter',
        company: { name: 'Acme Corp', size: '10-50' },
      }),
    });

    if (recSignupRes.status !== 201) {
      throw new Error(`Recruiter signup failed with status: ${recSignupRes.status}`);
    }

    const recSignupData = await recSignupRes.json();
    if (!recSignupData.success || recSignupData.data.user.role !== 'recruiter') {
      throw new Error('Invalid recruiter signup response structure');
    }

    const { clientId, clientSecret } = recSignupData.data.client;
    if (!clientId || !clientSecret) {
      throw new Error('Recruiter signup response missing Client Credentials!');
    }
    logger.info(`✔ Recruiter signup successful. Client ID: ${clientId}`);

    // Verify Client Secret is Hashed (not stored in plaintext)
    const clientRecord = await ClientRepository.findByClientId(clientId);
    if (!clientRecord) {
      throw new Error('Generated Client credentials record not found in database!');
    }
    if (clientRecord.clientSecret === clientSecret) {
      throw new Error('Security Violation: Client secret stored in plaintext!');
    }
    const isSecretMatch = await passwordService.comparePassword(clientSecret, clientRecord.clientSecret);
    if (!isSecretMatch) {
      throw new Error('Stored client secret hash does not match original plaintext!');
    }
    logger.info('✔ Client Secret securely hashed and verified successfully.');

    // Verify Default Permission (POST_JOB)
    const recruiterUser = await UserRepository.findByEmailWithPermissions(recruiterEmail);
    const hasPostJob = recruiterUser.roleRef?.permissions?.some((p) => p.name === 'POST_JOB');
    if (!hasPostJob) {
      throw new Error('Default permission POST_JOB was not assigned to recruiter role!');
    }
    logger.info('✔ Recruiter role successfully assigned default permission (POST_JOB).');

    // ─── Test 3: Forgot Password & OTP Flow ──────────────
    logger.info('\n--- Test 3: Forgot Password & OTP Generation ---');
    const forgotRes = await fetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: candidateEmail,
        role: 'seeker',
      }),
    });

    if (forgotRes.status !== 200) {
      throw new Error(`Forgot password request failed: ${forgotRes.status}`);
    }

    const forgotData = await forgotRes.json();
    const devOtp = forgotData.data.devOtp;
    if (!devOtp) {
      throw new Error('Development OTP was not returned in response!');
    }
    logger.info(`✔ Forgot password OTP generated: ${devOtp}`);

    // ─── Test 4: Verify OTP ─────────────────────────────
    logger.info('\n--- Test 4: Verify OTP ---');
    const verifyOtpRes = await fetch(`${BASE_URL}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: candidateEmail,
        otp: devOtp,
      }),
    });

    if (verifyOtpRes.status !== 200) {
      throw new Error(`OTP verification failed: ${verifyOtpRes.status}`);
    }
    logger.info('✔ OTP verified successfully.');

    // ─── Test 5: Reset Password & Token Revocation ────────
    logger.info('\n--- Test 5: Reset Password & Invalidation ---');
    
    // First, login to create an active session
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    const activeToken = loginData.data.accessToken;

    // Reset password
    const resetRes = await fetch(`${BASE_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: candidateEmail,
        role: 'candidate',
        otp: devOtp,
        newPassword: newPassword,
      }),
    });

    if (resetRes.status !== 200) {
      throw new Error(`Password reset failed: ${resetRes.status}`);
    }
    logger.info('✔ Password reset successful.');

    // Verify session invalidation (the activeToken should now be invalid)
    const checkSessionRes = await fetch(`${BASE_URL}/api/v1/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: activeToken }),
    });

    if (checkSessionRes.status !== 401) {
      throw new Error(`Expected session to be invalidated. Got status: ${checkSessionRes.status}`);
    }
    logger.info('✔ Session successfully invalidated after password reset.');

    // Login with new password
    const loginNewRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password: newPassword }),
    });

    if (loginNewRes.status !== 200) {
      throw new Error('Failed to log in with new password');
    }
    const loginNewData = await loginNewRes.json();
    const currentToken = loginNewData.data.accessToken;
    logger.info('✔ Login with new password successful.');

    // ─── Test 6: Change Password (Authenticated) ──────────
    logger.info('\n--- Test 6: Change Password (Authenticated) ---');
    const changeRes = await fetch(`${BASE_URL}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        currentPassword: newPassword,
        newPassword: testPassword,
      }),
    });

    if (changeRes.status !== 200) {
      throw new Error(`Change password failed: ${changeRes.status}`);
    }
    logger.info('✔ Password changed successfully.');

    // Verify that currentToken was invalidated
    const verifyInvalidRes = await fetch(`${BASE_URL}/api/v1/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
    });

    if (verifyInvalidRes.status !== 401) {
      throw new Error(`Expected session to be invalidated after password change. Got status: ${verifyInvalidRes.status}`);
    }
    logger.info('✔ Session successfully invalidated after password change.');

    // Restore original candidate password
    const loginRestoreRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password: testPassword }),
    });
    const loginRestoreData = await loginRestoreRes.json();
    const candidateToken = loginRestoreData.data.accessToken;

    // ─── Test 7: Email Verification Flow ──────────────────
    logger.info('\n--- Test 7: Email Verification Flow ---');
    const verifyEmailRes = await fetch(`${BASE_URL}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail }),
    });

    const verifyEmailData = await verifyEmailRes.json();
    const verificationToken = verifyEmailData.data.devToken;
    if (!verificationToken) {
      throw new Error('Verification token not returned in dev mode!');
    }
    logger.info(`✔ Email verification token generated: ${verificationToken}`);

    // Confirm verification
    const confirmEmailRes = await fetch(`${BASE_URL}/api/v1/auth/verify-email/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken }),
    });

    if (confirmEmailRes.status !== 200) {
      throw new Error(`Confirm email verification failed: ${confirmEmailRes.status}`);
    }

    const updatedUser = await UserRepository.findByEmail(candidateEmail);
    if (!updatedUser.isEmailVerified) {
      throw new Error('User isEmailVerified remains false after confirmation!');
    }
    logger.info('✔ Email verification confirmed and active.');

    // ─── Test 8: Google Login & Signup ───────────────────
    logger.info('\n--- Test 8: Google Login & Signup ---');
    
    // Google Signup (First time)
    const googleSignupRes = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        name: 'Google Recruiter',
        role: 'recruiter',
        profilePic: 'https://lh3.googleusercontent.com/a/avatar',
      }),
    });

    if (googleSignupRes.status !== 200) {
      throw new Error(`Google signup failed with status: ${googleSignupRes.status}`);
    }

    const googleSignupData = await googleSignupRes.json();
    const googleClientCreds = googleSignupData.data.client;
    if (!googleClientCreds || !googleClientCreds.clientId || !googleClientCreds.clientSecret) {
      throw new Error('Google recruiter signup did not generate client credentials!');
    }
    logger.info(`✔ Google recruiter signup completed. Client ID: ${googleClientCreds.clientId}`);

    // Google Login (Existing user)
    const googleLoginRes = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: googleEmail,
        name: 'Google Recruiter Updated',
      }),
    });

    if (googleLoginRes.status !== 200) {
      throw new Error(`Google login failed with status: ${googleLoginRes.status}`);
    }
    logger.info('✔ Google login successful.');

    // ─── Test 9: Audit Logging Verification ──────────────
    logger.info('\n--- Test 9: Audit Logging ---');
    const userObj = await UserRepository.findByEmail(candidateEmail);
    const audits = await AuditRepository.findFiltered({ userId: userObj._id });
    logger.info(`✔ Found ${audits.length} audit logs for candidate user.`);
    
    const requiredActions = ['SIGNUP_CANDIDATE', 'FORGOT_PASSWORD_REQUEST', 'RESET_PASSWORD'];
    for (const action of requiredActions) {
      const log = audits.find((a) => a.action === action);
      if (!log) {
        throw new Error(`Audit log action '${action}' was not found in candidate logs!`);
      }
    }
    logger.info('✔ All expected security actions successfully logged to Audit database.');

    // ─── Cleanup ──────────────────────────────────────────
    logger.info('\nCleaning up integration test database records...');
    
    const candidateUser = await UserRepository.findByEmail(candidateEmail);
    const recruiterUserObj = await UserRepository.findByEmail(recruiterEmail);
    const googleUser = await UserRepository.findByEmail(googleEmail);

    if (candidateUser) {
      await SessionRepository.revokeAllByUserId(candidateUser._id);
      await RefreshTokenRepository.revokeAllByUserId(candidateUser._id);
      await UserRepository.delete(candidateUser._id);
    }
    if (recruiterUserObj) {
      await SessionRepository.revokeAllByUserId(recruiterUserObj._id);
      await RefreshTokenRepository.revokeAllByUserId(recruiterUserObj._id);
      await ClientRepository.deleteByUserId(recruiterUserObj._id);
      await UserRepository.delete(recruiterUserObj._id);
    }
    if (googleUser) {
      await SessionRepository.revokeAllByUserId(googleUser._id);
      await RefreshTokenRepository.revokeAllByUserId(googleUser._id);
      await ClientRepository.deleteByUserId(googleUser._id);
      await UserRepository.delete(googleUser._id);
    }

    await PasswordResetOtpRepository.deleteManyByEmail(candidateEmail);

    logger.info('✔ Cleanup completed successfully.');
    logger.info('=====================================================');
    logger.info('     ALL ENTERPRISE AUTH TESTS COMPLETED SUCCESSFULLY!  ');
    logger.info('=====================================================');

  } catch (error) {
    logger.error('✗ Enterprise integration test suite failed:', { error: error.message, stack: error.stack });
    process.exitCode = 1;
  } finally {
    if (server && server.listening) {
      await new Promise((resolve) => server.close(resolve));
      logger.info('Express server shut down.');
    }
    await closeRedis();
    await closeDatabase();
    logger.info('Disconnected from database/cache.');
  }
};

runEnterpriseTests();
