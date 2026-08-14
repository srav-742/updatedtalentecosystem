/**
 * @fileoverview Integration Test for Database and Security Modules
 * @module tests/securityAndDbLayerTest
 */

import mongoose from 'mongoose';
import { connectDatabase, closeDatabase } from '../config/database.js';
import { connectRedis, closeRedis } from '../config/redis.js';

// Repositories
import UserRepository from '../repositories/UserRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import PermissionRepository from '../repositories/PermissionRepository.js';
import SessionRepository from '../repositories/SessionRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import AuditRepository from '../repositories/AuditRepository.js';

// Models (for cleanup directly)
import Tenant from '../models/Tenant.js';
import Organization from '../models/Organization.js';

// Services
import passwordService from '../security/password.service.js';
import jwtService from '../security/jwt.service.js';
import keyManager from '../security/keyManager.js';
import sessionService from '../security/session.service.js';
import logger from '../logger/logger.js';

const runTests = async () => {
  logger.info('=====================================================');
  logger.info('   Running Database Layer & Security Module Tests    ');
  logger.info('=====================================================');

  try {
    // 1. Connect to DB and Cache
    await connectDatabase();
    // Catch Redis error if down, but still proceed since we can test fallback to DB
    await connectRedis().catch(() => {
      logger.warn('Redis is not running. Session caching will fallback to database.');
    });

    const testId = new mongoose.Types.ObjectId();
    const prefix = `test_${testId.toString().slice(-6)}_`;

    // ─── Test 1: Mongoose Models & Repositories ─────────
    logger.info('Test 1: Seeding multi-tenant and RBAC structures...');

    // A. Tenant
    const tenant = await Tenant.create({
      name: `${prefix}Tenant`,
      code: `${prefix}tenant_code`,
      domain: `${prefix}domain.com`,
    });
    logger.info(`✔ Tenant seeded: ${tenant._id}`);

    // B. Organization
    const organization = await Organization.create({
      name: `${prefix}Org`,
      code: `${prefix}org_code`,
      tenantId: tenant._id,
    });
    logger.info(`✔ Organization seeded: ${organization._id}`);

    // C. Permissions
    const permissions = await PermissionRepository.createMany([
      { name: `${prefix}JOB_CREATE`, description: 'Create jobs', module: 'jobs' },
      { name: `${prefix}JOBS_READ`, description: 'Read jobs', module: 'jobs' },
    ]);
    logger.info(`✔ Permissions seeded: ${permissions.map((p) => p.name).join(', ')}`);

    // D. Role
    const role = await RoleRepository.create({
      name: `${prefix}recruiter_role`,
      description: 'Recruiter role for test',
      permissions: permissions.map((p) => p._id),
    });
    logger.info(`✔ Role seeded: ${role._id} with permissions`);

    // E. User & Password Service
    const plainPassword = 'SuperSecurePassword123!';
    const hashedPassword = await passwordService.hashPassword(plainPassword);
    const passwordMatch = await passwordService.comparePassword(plainPassword, hashedPassword);

    if (!passwordMatch) {
      throw new Error('Password verification comparison failed!');
    }
    logger.info('✔ Password Service verification matches.');

    const user = await UserRepository.create({
      email: `${prefix}user@example.com`,
      password: hashedPassword,
      name: 'John Test Recruiter',
      role: 'recruiter',
      tenantId: tenant._id,
      organizationId: organization._id,
      roleRef: role._id,
    });
    logger.info(`✔ User seeded: ${user._id}`);

    // ─── Test 2: JWT Service (RSA) ──────────────────────
    logger.info('Test 2: Testing JWT Service (RSA Sign & Verify)...');
    const jwtPayload = { userId: user._id.toString(), email: user.email };
    const token = jwtService.signToken(jwtPayload, { expiresIn: '5m' });
    const verified = jwtService.verifyToken(token);

    if (verified.userId !== user._id.toString()) {
      throw new Error('JWT verification payload mismatch!');
    }
    logger.info('✔ JWT Service RSA sign and verify successful.');

    // ─── Test 3: Session Service (Opaque tokens) ────────
    logger.info('Test 3: Testing Session Service (UUID Opaque tokens)...');
    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Node-TestRunner' };
    
    // A. Create Session
    const sessionSet = await sessionService.createSession(user._id, clientMetadata);
    logger.info(`✔ Session tokens issued. AccessToken: ${sessionSet.accessToken}, RefreshToken: ${sessionSet.refreshToken}`);

    // B. Verify Session
    const verification = await sessionService.verifySession(sessionSet.accessToken);
    if (!verification.success || verification.user.id !== user._id.toString()) {
      throw new Error('Session verification failed!');
    }
    logger.info('✔ Session verification successful.');

    // C. Refresh Session (Rotation)
    const refreshedSet = await sessionService.refreshSession(sessionSet.refreshToken, clientMetadata);
    logger.info(`✔ Token rotated successfully. New AccessToken: ${refreshedSet.accessToken}`);

    // D. Token Reuse Detection
    logger.info('Test 3D: Testing token reuse detection (security validation)...');
    try {
      // Attempt to refresh again using the ALREADY ROTATED refresh token
      await sessionService.refreshSession(sessionSet.refreshToken, clientMetadata);
      throw new Error('Security failure: rotated refresh token was reused but not blocked!');
    } catch (err) {
      if (err.message.includes('Security violation')) {
        logger.info('✔ Token reuse detection successfully blocked reuse and revoked all sessions.');
      } else {
        throw err;
      }
    }

    // E. Verify old sessions are revoked
    const checkRevoked = await sessionService.verifySession(refreshedSet.accessToken);
    if (checkRevoked.success) {
      throw new Error('Verify failed: sessions were not revoked after reuse detection!');
    }
    logger.info('✔ Confirmed that all sessions were revoked due to reuse violation.');

    // F. Test Audit logs
    const auditLogs = await AuditRepository.findFiltered({ userId: user._id });
    logger.info(`✔ Audit Log entries created: ${auditLogs.length}`);
    const reuseLog = auditLogs.find((l) => l.action === 'TOKEN_REUSE_VIOLATION');
    if (!reuseLog) {
      throw new Error('Audit log missing reuse violation record!');
    }
    logger.info('✔ Verified reuse violation was logged to Audit database.');

    // ─── Test 4: JWKS Endpoint ──────────────────────────
    logger.info('Test 4: Testing JWKS generation...');
    const jwks = keyManager.getJwks();
    if (!jwks.keys || jwks.keys.length === 0 || jwks.keys[0].kid !== keyManager.CURRENT_KEY_ID) {
      throw new Error('JWKS generation failed or kid mismatch!');
    }
    logger.info('✔ JWKS generated successfully with correct key ID.');

    // ─── Cleanup ────────────────────────────────────────
    logger.info('Cleaning up database seeded test records...');
    
    // Cleanup models directly
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
    logger.info('         ALL TESTS COMPLETED SUCCESSFULLY!           ');
    logger.info('=====================================================');

  } catch (error) {
    logger.error('✗ Test suite failed with error:', { error: error.message, stack: error.stack });
    process.exitCode = 1;
  } finally {
    await closeRedis();
    await closeDatabase();
    logger.info('Disconnected from database/cache.');
  }
};

runTests();
