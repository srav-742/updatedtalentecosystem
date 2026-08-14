import '../setup.js';
import test from 'node:test';
import assert from 'node:assert';
import { ResumeController } from '../../src/controllers/resume.controller.js';
import resumeService from '../../src/services/resume.service.js';

test('ResumeController: getById retrieves resume container and formats DTO', async (t) => {
  t.mock.method(resumeService, 'getResume', async (resumeId, userContext) => {
    return {
      resume: {
        _id: resumeId,
        candidateId: 'cand_123',
        status: 'active',
        currentVersionId: 'ver_111',
      },
      version: {
        _id: 'ver_111',
        resumeId,
        versionNumber: 1,
        skills: ['NodeJS'],
        education: [],
        experience: [],
        uploadedBy: 'cand_123',
      },
      file: {
        _id: 'file_111',
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1500,
      },
    };
  });

  const req = {
    params: { id: 'res_111' },
    user: { userId: 'cand_123', role: 'candidate' },
  };

  const mockRes = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  const controller = new ResumeController();
  await controller.getById(req, mockRes, (err) => {
    assert.fail('Next called: ' + err.message);
  });

  assert.strictEqual(mockRes.statusCode, 200);
  assert.strictEqual(mockRes.body.success, true);
  assert.strictEqual(mockRes.body.data.id, 'res_111');
  assert.strictEqual(mockRes.body.data.candidateId, 'cand_123');
  assert.strictEqual(mockRes.body.data.currentVersion.versionNumber, 1);
  assert.strictEqual(mockRes.body.data.currentVersion.file.fileName, 'resume.pdf');
});
