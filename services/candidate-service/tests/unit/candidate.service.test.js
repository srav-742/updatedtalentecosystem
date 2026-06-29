import '../setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { CandidateService } from '../../src/services/candidate.service.js';
import candidateRepository from '../../src/repositories/CandidateRepository.js';
import jobClient from '../../src/clients/job.client.js';

test('CandidateService: calculateCompletion calculates accurate scores', (t) => {
  const service = new CandidateService();

  // Basic Profile (Name + Email) = 10%
  const p1 = {
    basics: { name: 'John Doe', email: 'john@example.com' },
  };
  assert.strictEqual(service.calculateCompletion(p1), 10);

  // Complete Basics (name, email, phone, location, bio) = 25%
  const p2 = {
    basics: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '12345',
      location: 'Remote',
      bio: 'Developer',
    },
  };
  assert.strictEqual(service.calculateCompletion(p2), 25);

  // Basics + Skills = 25 + 15 = 40%
  const p3 = {
    ...p2,
    skills: ['JavaScript', 'Node.js'],
  };
  assert.strictEqual(service.calculateCompletion(p3), 40);

  // Full Profile = Basics (25) + Skills (15) + Experience (20) + Education (20) + Socials (10) + Languages (5) + Certifications (5) = 100%
  const pFull = {
    basics: {
      name: 'John',
      email: 'john@example.com',
      phone: '123',
      location: 'US',
      bio: 'Bio',
    },
    skills: ['Node'],
    experience: [{ company: 'A', role: 'Dev' }],
    education: [{ institution: 'B', degree: 'BS' }],
    socialLinks: { linkedin: 'ln', github: 'gh', portfolio: 'pf', twitter: 'tw' },
    languages: ['English'],
    certifications: [{ name: 'Cert', issuer: 'Org' }],
  };
  assert.strictEqual(service.calculateCompletion(pFull), 100);
});

test('CandidateService: getProfile triggers self-healing if own profile missing', async (t) => {
  const service = new CandidateService();
  let createdData = null;

  t.mock.method(candidateRepository, 'findByUserId', async (userId) => {
    return null;
  });

  t.mock.method(candidateRepository, 'createProfile', async (data) => {
    createdData = data;
    return { ...data, toObject() { return this; } };
  });

  const userContext = { userId: 'cand_123', email: 'cand@test.com', name: 'Cand Test', role: 'candidate' };
  const res = await service.getProfile('cand_123', userContext);

  assert.ok(createdData);
  assert.strictEqual(createdData.userId, 'cand_123');
  assert.strictEqual(createdData.basics.email, 'cand@test.com');
  assert.strictEqual(createdData.basics.name, 'Cand Test');
  assert.strictEqual(res.userId, 'cand_123');
});

test('CandidateService: checkAccess rejects strangers and permits authorized roles', (t) => {
  const service = new CandidateService();

  const ownContext = { userId: 'cand_1', role: 'candidate' };
  const strangerContext = { userId: 'cand_2', role: 'candidate' };
  const recruiterContext = { userId: 'rec_1', role: 'recruiter' };
  const adminContext = { userId: 'admin_1', role: 'admin' };

  // Read checks
  assert.doesNotThrow(() => service.checkAccess('cand_1', ownContext, 'read'));
  assert.doesNotThrow(() => service.checkAccess('cand_1', recruiterContext, 'read'));
  assert.doesNotThrow(() => service.checkAccess('cand_1', adminContext, 'read'));
  assert.throws(() => service.checkAccess('cand_1', strangerContext, 'read'), /You do not have permission/);

  // Write checks
  assert.doesNotThrow(() => service.checkAccess('cand_1', ownContext, 'write'));
  assert.doesNotThrow(() => service.checkAccess('cand_1', adminContext, 'write'));
  assert.throws(() => service.checkAccess('cand_1', strangerContext, 'write'), /You do not have permission/);
  assert.throws(() => service.checkAccess('cand_1', recruiterContext, 'write'), /You do not have permission/);
});

test('CandidateService: addBookmark requires job existence and ownership', async (t) => {
  const service = new CandidateService();
  let bookmarkAdded = null;

  t.mock.method(jobClient, 'getJob', async (jobId) => {
    if (jobId === 'job_valid') {
      return { id: 'job_valid', title: 'Valid Job' };
    }
    return null;
  });

  t.mock.method(candidateRepository, 'addBookmark', async (userId, jobId) => {
    bookmarkAdded = { userId, jobId };
    return { userId, bookmarkedJobs: [jobId] };
  });

  const userCtx = { userId: 'cand_1', role: 'candidate' };

  // Valid bookmark
  const res = await service.addBookmark('cand_1', 'job_valid', userCtx);
  assert.strictEqual(bookmarkAdded.jobId, 'job_valid');

  // Invalid job ID throws
  await assert.rejects(
    service.addBookmark('cand_1', 'job_invalid', userCtx),
    /Job with ID job_invalid not found/
  );

  // Adding bookmark for another user throws
  await assert.rejects(
    service.addBookmark('cand_other', 'job_valid', userCtx),
    /You do not have permission/
  );
});
