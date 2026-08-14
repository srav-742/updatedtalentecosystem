import '../setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { ResumeService } from '../../src/services/resume.service.js';
import resumeRepository from '../../src/repositories/ResumeRepository.js';
import resumeVersionRepository from '../../src/repositories/ResumeVersionRepository.js';
import resumeFileRepository from '../../src/repositories/ResumeFileRepository.js';
import storage from '../../src/storage/storageFactory.js';

test('ResumeService: checkAccess verifies roles and actions correctly', (t) => {
  const service = new ResumeService();
  
  const candidateCtx = { userId: 'cand_123', role: 'candidate' };
  const adminCtx = { userId: 'admin_abc', role: 'admin' };
  const recruiterCtx = { userId: 'rec_xyz', role: 'recruiter' };
  const strangerCtx = { userId: 'cand_456', role: 'candidate' };

  // Read Action checks
  assert.doesNotThrow(() => service.checkAccess('cand_123', candidateCtx, 'read'));
  assert.doesNotThrow(() => service.checkAccess('cand_123', adminCtx, 'read'));
  assert.doesNotThrow(() => service.checkAccess('cand_123', recruiterCtx, 'read'));
  assert.throws(() => service.checkAccess('cand_123', strangerCtx, 'read'), /Access denied/);

  // Write Action checks
  assert.doesNotThrow(() => service.checkAccess('cand_123', candidateCtx, 'write'));
  assert.doesNotThrow(() => service.checkAccess('cand_123', adminCtx, 'write'));
  assert.throws(() => service.checkAccess('cand_123', recruiterCtx, 'write'), /Access denied/);
  assert.throws(() => service.checkAccess('cand_123', strangerCtx, 'write'), /Access denied/);
});

test('ResumeService: upload rejects unsupported mimetypes', async (t) => {
  const service = new ResumeService();
  const file = {
    buffer: Buffer.from('dummy data'),
    originalname: 'resume.txt',
    mimetype: 'text/plain',
    size: 10,
  };

  const userContext = { userId: 'cand_123', role: 'candidate' };
  
  await assert.rejects(
    service.uploadResume('cand_123', file, userContext),
    /Invalid file type/
  );
});

test('ResumeService: upload rejects files exceeding 20MB', async (t) => {
  const service = new ResumeService();
  const file = {
    buffer: Buffer.alloc(21 * 1024 * 1024), // 21MB
    originalname: 'resume.pdf',
    mimetype: 'application/pdf',
    size: 21 * 1024 * 1024,
  };

  const userContext = { userId: 'cand_123', role: 'candidate' };
  
  await assert.rejects(
    service.uploadResume('cand_123', file, userContext),
    /exceeds maximum upload size/
  );
});

test('ResumeService: upload triggers error on virus detected (EICAR string)', async (t) => {
  const service = new ResumeService();
  const file = {
    buffer: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
    originalname: 'eicar.pdf',
    mimetype: 'application/pdf',
    size: 68,
  };

  const userContext = { userId: 'cand_123', role: 'candidate' };

  await assert.rejects(
    service.uploadResume('cand_123', file, userContext),
    /File security scan failed: Virus detected/
  );
});

test('ResumeService: upload creates container and version on successful validation', async (t) => {
  const service = new ResumeService();
  const file = {
    buffer: Buffer.from('%PDF-1.4 mock pdf data'),
    originalname: 'my_resume.pdf',
    mimetype: 'application/pdf',
    size: 100,
  };

  const userContext = { userId: 'cand_123', role: 'candidate' };

  t.mock.method(resumeRepository, 'findByCandidateId', async (id) => null);
  t.mock.method(resumeRepository, 'create', async (data) => ({ id: 'res_111', ...data }));
  t.mock.method(resumeRepository, 'updateCurrentVersion', async (id, verId) => ({ id, currentVersionId: verId }));
  t.mock.method(resumeVersionRepository, 'findLatestByResumeId', async () => null);
  t.mock.method(resumeVersionRepository, 'create', async (data) => ({ id: data._id || 'ver_111', ...data }));
  t.mock.method(resumeFileRepository, 'create', async (data) => ({ id: data._id || 'file_111', ...data }));
  t.mock.method(storage, 'saveFile', async (buf, key, mime) => ({ key, provider: 'local' }));

  const result = await service.uploadResume('cand_123', file, userContext);

  assert.strictEqual(result.resume.id, 'res_111');
  assert.strictEqual(result.version.versionNumber, 1);
  assert.strictEqual(result.file.fileName, 'my_resume.pdf');
  assert.strictEqual(result.file.storageProvider, 'local');
  assert.ok(result.version.skills.includes('JavaScript'));
});
