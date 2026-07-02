/**
 * @fileoverview Comprehensive Enterprise Authentication Upgrade Integration Tests
 * @module tests/enterpriseUpgradeTest
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
import ClientRepository from '../repositories/ClientRepository.js';
import AuditRepository from '../repositories/AuditRepository.js';

// Services & Helpers
import passwordService from '../security/password.service.js';
import jwtService from '../security/jwt.service.js';
import logger from '../logger/logger.js';
import { hashString } from '../security/crypto.service.js';

const TEST_PORT = 5004;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const runEnterpriseUpgradeTests = async () => {
  logger.info('=====================================================');
  logger.info('   Running Enterprise Auth Upgrade Integration Tests');
  logger.info('=====================================================');

  let server;
  const testId = new mongoose.Types.ObjectId();
  const prefix = `upg_${testId.toString().slice(-6)}_`;

  const candidateEmail = `${prefix}cand@example.com`;
  const recruiterEmail = `${prefix}rec@example.com`;
  const testPassword = 'SecurePassword123!';

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

    // ─── Test 1: Candidate Signup ───
    logger.info('\n--- Test 1: Candidate Signup (No Client Credentials) ---');
    const candRes = await fetch(`${BASE_URL}/api/v1/auth/signup/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: candidateEmail,
        password: testPassword,
        name: 'Jane Candidate',
      }),
    });
    const candData = await candRes.json();
    if (candRes.status !== 201 || !candData.success) {
      throw new Error(`Candidate signup failed: ${JSON.stringify(candData)}`);
    }
    if (candData.data.client) {
      throw new Error('Security violation: Candidate received API Client Credentials!');
    }
    logger.info('✔ Candidate signed up successfully without client credentials.');

    // ─── Test 2: Recruiter Signup & Client Credentials ───
    logger.info('\n--- Test 2: Recruiter Signup (Client credentials returned ONCE and hashed in DB) ---');
    const recRes = await fetch(`${BASE_URL}/api/v1/auth/signup/recruiter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: recruiterEmail,
        password: testPassword,
        name: 'Bob Recruiter',
        company: 'Talent Inc',
      }),
    });
    const recData = await recRes.json();
    if (recRes.status !== 201 || !recData.success) {
      throw new Error(`Recruiter signup failed: ${JSON.stringify(recData)}`);
    }

    const { clientId, clientSecret } = recData.data.client || {};
    if (!clientId || !clientSecret) {
      throw new Error('Client credentials missing in recruiter signup response.');
    }
    logger.info(`✔ Plaintext Client Secret returned in signup: ${clientSecret}`);

    // Verify hashed storage in DB
    const clientRecord = await ClientRepository.findByClientId(clientId);
    if (!clientRecord) {
      throw new Error('Client record not created in database.');
    }
    if (clientRecord.clientSecret === clientSecret) {
      throw new Error('Security violation: Plaintext client secret stored in database.');
    }
    const isSecretValid = await passwordService.comparePassword(clientSecret, clientRecord.clientSecret);
    if (!isSecretValid) {
      throw new Error('Hashed client secret does not match plain secret.');
    }
    logger.info('✔ Stored client secret verified to be securely hashed.');

    // ─── Test 3: Login & JWT Access Token Validation ───
    logger.info('\n--- Test 3: Login & JWT Access Token Validation ---');
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200 || !loginData.success) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }

    const { accessToken, refreshToken } = loginData.data;
    if (!accessToken || !refreshToken) {
      throw new Error('Tokens missing in login response.');
    }

    // Verify access token is a valid JWT and contains required fields
    const decoded = jwtService.verifyToken(accessToken);
    if (!decoded.UserId || !decoded.Role || !decoded.Permissions || !decoded.TokenVersion || !decoded.SessionId) {
      throw new Error(`JWT is missing required claims: ${JSON.stringify(decoded)}`);
    }
    logger.info('✔ Access Token verified to be a valid JWT with all required enterprise claims.');

    // ─── Test 4: Refresh Token Hashed and Rotated (RTR) ───
    logger.info('\n--- Test 4: Refresh Token Hashed in DB and Rotated (RTR) ---');
    
    // Validate stored refresh token hash
    const rtHash = hashString(refreshToken, 'sha256');
    const rtRecord = await RefreshTokenRepository.findByToken(rtHash);
    if (!rtRecord) {
      throw new Error('Hashed refresh token not found in database.');
    }
    if (rtRecord.token === refreshToken) {
      throw new Error('Security violation: Refresh token stored in plaintext in DB.');
    }
    logger.info('✔ Refresh token verified to be stored securely as a hash.');

    // Perform refresh rotation
    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const refreshData = await refreshRes.json();
    if (refreshRes.status !== 200 || !refreshData.success) {
      throw new Error(`Refresh rotation failed: ${JSON.stringify(refreshData)}`);
    }

    const nextAccessToken = refreshData.data.accessToken;
    const nextRefreshToken = refreshData.data.refreshToken;
    if (nextRefreshToken === refreshToken) {
      throw new Error('Security failure: Refresh token was not rotated!');
    }
    logger.info('✔ Refresh token successfully rotated.');

    // ─── Test 5: Token Reuse Detection ───
    logger.info('\n--- Test 5: Refresh Token Reuse Detection ---');
    try {
      // Re-use the old revoked refresh token
      const reuseRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const reuseData = await reuseRes.json();
      if (reuseRes.status === 200) {
        throw new Error('Security breach: Reusing a revoked refresh token succeeded!');
      }
      logger.info(`✔ Refresh token reuse rejected correctly with status: ${reuseRes.status}`);
    } catch (err) {
      if (!err.message.includes('rejected')) throw err;
    }

    // Verify all sessions for this user were revoked due to reuse violation
    const candUserObj = await UserRepository.findByEmail(candidateEmail);
    const activeSessions = await SessionRepository.findByUserId(candUserObj._id);
    const activeRefreshTokens = await RefreshTokenRepository.findByToken(hashString(nextRefreshToken, 'sha256'));
    if (activeSessions.length > 0 || (activeRefreshTokens && !activeRefreshTokens.isRevoked)) {
      throw new Error('Security breach: Sessions and tokens were not invalidated after reuse violation!');
    }
    logger.info('✔ All user sessions and refresh tokens successfully invalidated after reuse violation.');

    // ─── Test 6: Logout All Devices (Token Version Check) ───
    logger.info('\n--- Test 6: Logout All Devices (Token Version Check) ---');
    
    // Log in again to create a new session
    const freshLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password: testPassword }),
    });
    const freshLoginData = await freshLoginRes.json();
    const freshToken = freshLoginData.data.accessToken;
    const freshDecoded = jwtService.verifyToken(freshToken);

    // Call logout-all
    const logoutAllRes = await fetch(`${BASE_URL}/api/v1/auth/logout-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshToken}`,
      },
    });
    if (logoutAllRes.status !== 200) {
      throw new Error(`Logout all devices failed: ${logoutAllRes.status}`);
    }
    logger.info('✔ Logout all devices request processed.');

    // Check that user tokenVersion in DB was incremented
    const updatedUser = await UserRepository.findById(candUserObj._id);
    if (updatedUser.tokenVersion <= freshDecoded.TokenVersion) {
      throw new Error('User tokenVersion was not incremented after logout-all!');
    }
    logger.info(`✔ User token version incremented to: ${updatedUser.tokenVersion}`);

    // Verify that the old token is now rejected on verify because of version mismatch
    const verifyFailRes = await fetch(`${BASE_URL}/api/v1/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: freshToken }),
    });
    if (verifyFailRes.status !== 401) {
      throw new Error(`Verify should fail for version mismatch, got status: ${verifyFailRes.status}`);
    }
    logger.info('✔ Token verified to be rejected due to version mismatch.');

    // ─── Cleanup ───
    logger.info('\nCleaning up integration test database records...');
    
    const candidateUser = await UserRepository.findByEmail(candidateEmail);
    const recruiterUserObj = await UserRepository.findByEmail(recruiterEmail);

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

    // Audit logs are kept for compliance

    logger.info('✔ Cleanup completed successfully.');
    logger.info('=====================================================');
    logger.info('     ALL ENTERPRISE UPGRADE TESTS COMPLETED SUCCESSFULLY!  ');
    logger.info('=====================================================');

  } catch (error) {
    logger.error('✗ Enterprise upgrade integration test suite failed:', { error: error.message, stack: error.stack });
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

runEnterpriseUpgradeTests();
