import '../setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { RecruiterService } from '../../src/services/recruiter.service.js';
import recruiterRepository from '../../src/repositories/RecruiterRepository.js';
import jobClient from '../../src/clients/job.client.js';
import candidateClient from '../../src/clients/candidate.client.js';

test('RecruiterService: calculateCompletion calculates accurate scores', (t) => {
  const service = new RecruiterService();

  // Basic Profile (Name + Email) = 20%
  const p1 = {
    basics: { name: 'John Doe', email: 'john@example.com' },
  };
  assert.strictEqual(service.calculateCompletion(p1), 20);

  // Complete Basics (name, email, phone, designation, profilePic) = 50%
  const p2 = {
    basics: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '12345',
      designation: 'HR Lead',
      profilePic: 'url-pic',
    },
  };
  assert.strictEqual(service.calculateCompletion(p2), 50);

  // Complete Basics + Company name = 60%
  const p3 = {
    ...p2,
    company: { name: 'Acme Corp' },
  };
  assert.strictEqual(service.calculateCompletion(p3), 60);

  // Full Profile (Basics 50% + Company 40% + Organization linked 10%) = 100%
  const pFull = {
    basics: {
      name: 'John',
      email: 'john@example.com',
      phone: '123',
      designation: 'Recruiter',
      profilePic: 'pic',
    },
    company: {
      name: 'Acme',
      website: 'acme.com',
      logo: 'logo',
      description: 'Acme description',
    },
    organizationId: 'org_xyz',
  };
  assert.strictEqual(service.calculateCompletion(pFull), 100);
});

test('RecruiterService: getProfile triggers self-healing if own profile missing', async (t) => {
  const service = new RecruiterService();
  let createdData = null;

  t.mock.method(recruiterRepository, 'findByUserId', async (userId) => {
    return null;
  });

  t.mock.method(recruiterRepository, 'createProfile', async (data) => {
    createdData = data;
    return { ...data, toObject() { return this; } };
  });

  const userContext = { userId: 'rec_123', email: 'rec@test.com', name: 'Rec Test', role: 'recruiter' };
  const res = await service.getProfile('rec_123', userContext);

  assert.ok(createdData);
  assert.strictEqual(createdData.userId, 'rec_123');
  assert.strictEqual(createdData.basics.email, 'rec@test.com');
  assert.strictEqual(createdData.basics.name, 'Rec Test');
  assert.strictEqual(res.userId, 'rec_123');
});

test('RecruiterService: checkAccess rejects strangers and permits authorized roles', (t) => {
  const service = new RecruiterService();

  const ownContext = { userId: 'rec_1', role: 'recruiter' };
  const strangerContext = { userId: 'rec_2', role: 'recruiter' };
  const candidateContext = { userId: 'cand_1', role: 'candidate' };
  const adminContext = { userId: 'admin_1', role: 'admin' };

  // Read checks
  assert.doesNotThrow(() => service.checkAccess('rec_1', ownContext, 'read'));
  assert.doesNotThrow(() => service.checkAccess('rec_1', adminContext, 'read'));
  assert.throws(() => service.checkAccess('rec_1', candidateContext, 'read'), /You do not have permission/);
  // Another recruiter check: Recruiters can view other profiles if needed in system
  assert.doesNotThrow(() => service.checkAccess('rec_1', strangerContext, 'read'));

  // Write checks
  assert.doesNotThrow(() => service.checkAccess('rec_1', ownContext, 'write'));
  assert.doesNotThrow(() => service.checkAccess('rec_1', adminContext, 'write'));
  assert.throws(() => service.checkAccess('rec_1', strangerContext, 'write'), /You do not have permission/);
});

test('RecruiterService: getDashboard aggregates stats from clients', async (t) => {
  const service = new RecruiterService();

  t.mock.method(recruiterRepository, 'findByUserId', async (userId) => {
    return {
      userId,
      basics: { name: 'Acme Recruiter', email: 'rec@acme.com' },
      profileCompletion: 40,
      organizationId: 'org_acme',
      role: 'admin',
      settings: { emailNotifications: true, theme: 'dark' },
      toObject() { return this; }
    };
  });

  t.mock.method(jobClient, 'getActiveJobsCount', async (recruiterId) => {
    return 10;
  });

  t.mock.method(candidateClient, 'getCandidatesCount', async () => {
    return 200;
  });

  const userCtx = { userId: 'rec_1', role: 'recruiter' };
  const dash = await service.getDashboard('rec_1', userCtx);

  assert.strictEqual(dash.profileCompletion, 40);
  assert.strictEqual(dash.organizationId, 'org_acme');
  assert.strictEqual(dash.roleInOrganization, 'admin');
  assert.strictEqual(dash.activeJobsCount, 10);
  assert.strictEqual(dash.candidatesCount, 200);
});
