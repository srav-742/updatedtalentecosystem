/**
 * @fileoverview API Integration Test for Authentication and Authorization Endpoints
 * @module tests/authAndAuthzApiTest
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

// Models for direct cleanup
import Tenant from '../models/Tenant.js';
import Organization from '../models/Organization.js';

// Services
import passwordService from '../security/password.service.js';
import logger from '../logger/logger.js';

const TEST_PORT = 5002;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const runApiTests = async () => {
  logger.info('=====================================================');
  logger.info('   Running Authentication & Authorization API Tests  ');
  logger.info('=====================================================');

  let server;
  try {
    // 1. Connect to Database & Cache
    await connectDatabase();
    await connectRedis().catch(() => {
      logger.warn('Redis is not running. Session caching will fallback to database.');
    });

    const testId = new mongoose.Types.ObjectId();
    const prefix = `apitest_${testId.toString().slice(-6)}_`;

    // 2. Seed Test Structures
    logger.info('Seeding test Tenant, Org, Permissions, Role, and User...');
    
    const tenant = await Tenant.create({
      name: `${prefix}Tenant`,
      code: `${prefix}tenant_code`,
      domain: `${prefix}domain.com`,
    });

    const organization = await Organization.create({
      name: `${prefix}Org`,
      code: `${prefix}org_code`,
      tenantId: tenant._id,
    });

    const permissions = await PermissionRepository.createMany([
      { name: 'jobs:read', description: 'Read jobs permission', module: 'jobs' },
      { name: 'jobs:write', description: 'Create/Edit jobs permission', module: 'jobs' },
    ]);

    // Role named recruiter_role, with user role = 'seeker' in DB to test normalization to 'candidate'
    const role = await RoleRepository.create({
      name: `${prefix}seeker_role`,
      description: 'Candidate role for api test',
      permissions: permissions.map((p) => p._id),
    });

    const plainPassword = 'SuperSecurePassword123!';
    const hashedPassword = await passwordService.hashPassword(plainPassword);

    const user = await UserRepository.create({
      email: `${prefix}user@example.com`,
      password: hashedPassword,
      name: 'Jane Api Seeker',
      role: 'seeker', // seeker is mapped to candidate in Gateway
      tenantId: tenant._id,
      organizationId: organization._id,
      roleRef: role._id,
    });

    logger.info(`✔ Seed completed successfully. User ID: ${user._id}`);

    // 3. Spin up Express Server
    logger.info(`Starting Express server on port ${TEST_PORT}...`);
    server = http.createServer(app);
    await new Promise((resolve, reject) => {
      server.listen(TEST_PORT, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    logger.info('✔ Server is listening.');

    // ─── Test 1: POST /login (Success) ────────────────────
    logger.info('Test 1: POST /api/v1/auth/login - Success');
    const loginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: plainPassword }),
    });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed with status: ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.data.accessToken || !loginData.data.refreshToken) {
      throw new Error('Login response missing tokens or marked unsuccessful');
    }

    // Role normalization validation: 'seeker' in DB -> 'candidate' in API response
    if (loginData.data.user.role !== 'candidate') {
      throw new Error(`Role normalization failed! Expected 'candidate', got '${loginData.data.user.role}'`);
    }

    // Permission list population validation
    const permNames = loginData.data.user.permissions;
    if (
      (!permNames.includes('JOBS:READ') && !permNames.includes('JOBS_READ')) ||
      (!permNames.includes('JOBS:WRITE') && !permNames.includes('JOBS_WRITE'))
    ) {
      throw new Error(`Missing expected permissions: ${JSON.stringify(permNames)}`);
    }

    logger.info('✔ POST /login successful with normalized role and permissions.');
    let { accessToken, refreshToken } = loginData.data;

    // ─── Test 2: POST /login (Failure - Invalid Password) ──
    logger.info('Test 2: POST /api/v1/auth/login - Invalid Password');
    const loginFailRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'WrongPassword' }),
    });

    if (loginFailRes.status !== 401) {
      throw new Error(`Expected status 401, got ${loginFailRes.status}`);
    }
    const loginFailData = await loginFailRes.json();
    if (loginFailData.success || loginFailData.error.code !== 'AUTH_004') {
      throw new Error('Incorrect failure response payload or error code');
    }
    logger.info('✔ POST /login failed correctly with AUTH_004.');

    // ─── Test 3: POST /verify (Success) ───────────────────
    logger.info('Test 3: POST /api/v1/auth/verify - Success');
    const verifyRes = await fetch(`${BASE_URL}/api/v1/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: accessToken }),
    });

    if (verifyRes.status !== 200) {
      throw new Error(`Verify failed with status: ${verifyRes.status}`);
    }

    const verifyData = await verifyRes.json();
    
    // Validate both API Gateway direct fields and OpenAPI data fields
    if (!verifyData.success || !verifyData.user || !verifyData.session || !verifyData.data.user) {
      throw new Error('Verify response is invalid or missing required direct/data fields');
    }

    if (verifyData.user.role !== 'candidate') {
      throw new Error(`Verify role normalization failed. Got '${verifyData.user.role}'`);
    }

    logger.info('✔ POST /verify returned expected response containing direct and nested fields.');

    // ─── Test 4: POST /resource-access-check (Success) ───
    logger.info('Test 4: POST /api/v1/auth/resource-access-check - Success');
    const accessRes = await fetch(`${BASE_URL}/api/v1/auth/resource-access-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id.toString(),
        resource: 'job:12345',
        action: 'read',
      }),
    });

    if (accessRes.status !== 200) {
      throw new Error(`Resource access check failed with status: ${accessRes.status}`);
    }

    const accessData = await accessRes.json();
    if (!accessData.success || !accessData.data.allowed) {
      throw new Error(`Access check returned not allowed or unsuccessful. Details: ${JSON.stringify(accessData)}`);
    }
    logger.info('✔ POST /resource-access-check returned allowed: true.');

    // ─── Test 5: POST /resource-access-check (Deny) ──────
    logger.info('Test 5: POST /api/v1/auth/resource-access-check - Deny (Admin resource)');
    const accessDenyRes = await fetch(`${BASE_URL}/api/v1/auth/resource-access-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id.toString(),
        resource: 'admin:analytics',
        action: 'write',
      }),
    });

    const accessDenyData = await accessDenyRes.json();
    if (!accessDenyData.success || accessDenyData.data.allowed) {
      throw new Error('Access check allowed candidate to access admin resources');
    }
    logger.info('✔ POST /resource-access-check returned allowed: false for unauthorized action.');

    // ─── Test 6: POST /refresh (Success Rotation) ─────────
    logger.info('Test 6: POST /api/v1/auth/refresh - Success Rotation');
    const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (refreshRes.status !== 200) {
      throw new Error(`Refresh failed with status: ${refreshRes.status}`);
    }

    const refreshData = await refreshRes.json();
    if (!refreshData.success || !refreshData.data.accessToken || !refreshData.data.refreshToken) {
      throw new Error('Refresh response missing tokens');
    }

    logger.info('✔ POST /refresh successfully rotated tokens.');
    const nextAccessToken = refreshData.data.accessToken;
    const nextRefreshToken = refreshData.data.refreshToken;

    // ─── Test 7: POST /logout ─────────────────────────────
    logger.info('Test 7: POST /api/v1/auth/logout - Success');
    const logoutRes = await fetch(`${BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nextAccessToken}`,
      },
      body: JSON.stringify({ refreshToken: nextRefreshToken }),
    });

    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed with status: ${logoutRes.status}`);
    }

    const logoutData = await logoutRes.json();
    if (!logoutData.success) {
      throw new Error('Logout returned unsuccessful status');
    }
    logger.info('✔ POST /logout processed successfully.');

    // ─── Test 8: POST /verify (Revoked token failure) ─────
    logger.info('Test 8: POST /api/v1/auth/verify - Verify Revoked Access Token');
    const verifyRevokedRes = await fetch(`${BASE_URL}/api/v1/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: nextAccessToken }),
    });

    if (verifyRevokedRes.status !== 401) {
      throw new Error(`Expected 401 status for revoked token, got ${verifyRevokedRes.status}`);
    }

    const verifyRevokedData = await verifyRevokedRes.json();
    if (verifyRevokedData.success || verifyRevokedData.error.code !== 'AUTH_003') {
      throw new Error('Verify did not fail correctly for revoked session');
    }
    logger.info('✔ Verified revoked session returns AUTH_003.');

    // ─── Test 9: GET /health ──────────────────────────────
    logger.info('Test 9: GET /api/v1/auth/health');
    const healthRes = await fetch(`${BASE_URL}/api/v1/auth/health`);
    if (healthRes.status !== 200) {
      throw new Error(`Health status check failed: ${healthRes.status}`);
    }
    const healthData = await healthRes.json();
    if (!healthData.success || !healthData.data.status) {
      throw new Error('Health check response malformed');
    }
    logger.info(`✔ Health status check succeeded. Service status: ${healthData.data.status}`);

    // ─── Cleanup ──────────────────────────────────────────
    logger.info('Cleaning up seeded database test records...');
    
    await SessionRepository.revokeAllByUserId(user._id);
    await SessionRepository.cleanupExpired();
    await RefreshTokenRepository.revokeAllByUserId(user._id);
    await RefreshTokenRepository.cleanupExpired();

    await UserRepository.delete(user._id);
    await RoleRepository.delete(role._id);
    await PermissionRepository.delete(permissions[0]._id);
    await PermissionRepository.delete(permissions[1]._id);
    await Organization.deleteOne({ _id: organization._id });
    await Tenant.deleteOne({ _id: tenant._id });

    logger.info('✔ Cleanup successful.');
    logger.info('=====================================================');
    logger.info('         ALL API TESTS COMPLETED SUCCESSFULLY!       ');
    logger.info('=====================================================');

  } catch (error) {
    logger.error('✗ API integration test failed:', { error: error.message, stack: error.stack });
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

runApiTests();
