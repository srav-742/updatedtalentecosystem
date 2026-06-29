import './setupEnv.js';
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../../../api-gateway/src/app.js';
import resumeApp from '../../src/app.js';
import Resume from '../../src/models/resume.model.js';
import ResumeVersion from '../../src/models/resumeVersion.model.js';
import ResumeFile from '../../src/models/resumeFile.model.js';

const GATEWAY_PORT = 7600;
const AUTH_PORT = 7601;
const RESUME_PORT = 7608;

test('E2E Gateway: verify full flow from Gateway to Resume Service and MongoDB', async (t) => {
  // 1. Start mock Auth Service on port 7601
  const mockAuthServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        user: {
          id: 'cand_e2e_99',
          email: 'cand@hire1percent.com',
          role: 'candidate',
          permissions: ['resumes:write', 'resumes:read'],
        },
        session: {
          sessionId: 'session_e2e_cand',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      })
    );
  });
  await new Promise((resolve) => mockAuthServer.listen(AUTH_PORT, resolve));

  // Connect Mongoose to MongoDB test DB
  await mongoose.connect(process.env.MONGO_URI);
  await Resume.deleteMany({});
  await ResumeVersion.deleteMany({});
  await ResumeFile.deleteMany({});

  // 2. Start Resume Service on port 7608
  const resumeServer = http.createServer(resumeApp);
  await new Promise((resolve) => resumeServer.listen(RESUME_PORT, resolve));

  // 3. Start API Gateway on port 7600
  const gatewayServer = http.createServer(app);
  await new Promise((resolve) => gatewayServer.listen(GATEWAY_PORT, resolve));

  // Helper to send HTTP requests to Gateway
  const request = (method, path, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
      const finalHeaders = { ...headers };
      let requestBody = body;

      const req = http.request(
        `http://localhost:${GATEWAY_PORT}${path}`,
        { method, headers: finalHeaders },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => {
            responseBody += chunk;
          });
          res.on('end', () => {
            const isJson = res.headers['content-type']?.includes('application/json');
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: responseBody && isJson ? JSON.parse(responseBody) : responseBody,
            });
          });
        }
      );
      req.on('error', reject);
      if (requestBody) req.write(requestBody);
      req.end();
    });
  };

  try {
    const authHeaders = {
      'Authorization': 'Bearer e1e2049e-71b3-4f91-88f5-9304724037ac', // Mock Bearer
      'X-Correlation-ID': 'e2e-resume-correlation-123',
    };

    // ─── Test 1: Upload Resume ───
    const boundary = '----WebKitFormBoundaryE2ETest';
    const fileContent = '%PDF-1.4 mock pdf data';
    const multipartBody = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="resume.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="candidateId"\r\n\r\n` +
      `cand_e2e_99\r\n` +
      `--${boundary}--\r\n`;

    const uploadHeaders = {
      ...authHeaders,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(multipartBody),
    };

    const uploadRes = await request('POST', '/api/v1/resumes/upload', uploadHeaders, multipartBody);
    
    assert.strictEqual(uploadRes.statusCode, 200);
    assert.strictEqual(uploadRes.body.success, true);
    assert.strictEqual(uploadRes.body.data.candidateId, 'cand_e2e_99');
    assert.strictEqual(uploadRes.body.data.currentVersion.versionNumber, 1);
    assert.strictEqual(uploadRes.body.data.currentVersion.file.fileName, 'resume.pdf');
    assert.ok(uploadRes.body.data.currentVersion.skills.includes('JavaScript'));

    const resumeId = uploadRes.body.data.id;

    // Verify DB directly
    const dbResume = await Resume.findById(resumeId);
    assert.ok(dbResume);
    assert.strictEqual(dbResume.candidateId, 'cand_e2e_99');

    // ─── Test 2: Get Own Resume ───
    const getRes = await request('GET', '/api/v1/resumes', authHeaders);
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.strictEqual(getRes.body.data.id, resumeId);
    assert.strictEqual(getRes.body.data.currentVersion.file.fileName, 'resume.pdf');

    // ─── Test 3: Download Resume ───
    const downloadRes = await request('GET', `/api/v1/resumes/${resumeId}/download`, authHeaders);
    assert.strictEqual(downloadRes.statusCode, 200);
    assert.strictEqual(downloadRes.headers['content-type'], 'application/pdf');
    assert.strictEqual(downloadRes.body, fileContent);

    // ─── Test 4: Delete Resume ───
    const deleteRes = await request('DELETE', `/api/v1/resumes/${resumeId}`, authHeaders);
    assert.strictEqual(deleteRes.statusCode, 200);
    assert.strictEqual(deleteRes.body.success, true);

    // Verify DB clean up
    const dbResumeAfter = await Resume.findById(resumeId);
    assert.strictEqual(dbResumeAfter, null);
    const dbVersions = await ResumeVersion.find({ resumeId });
    assert.strictEqual(dbVersions.length, 0);

  } finally {
    // Cleanup
    gatewayServer.close();
    resumeServer.close();
    mockAuthServer.close();
    await mongoose.connection.close();
  }
});
