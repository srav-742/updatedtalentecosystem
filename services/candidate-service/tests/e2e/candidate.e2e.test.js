import './setupEnv.js';
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../../../api-gateway/src/app.js';
import candidateApp from '../../src/app.js';
import CandidateProfile from '../../src/models/candidateProfile.model.js';

const GATEWAY_PORT = 7600;
const AUTH_PORT = 7601;
const CANDIDATE_PORT = 7603;

test('E2E Gateway: verify full flow from Gateway to Candidate Service and MongoDB', async (t) => {
  // 1. Start mock Auth Service on port 7601
  const mockAuthServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        user: {
          id: 'candidate_e2e_88',
          email: 'alice@hire1percent.com',
          role: 'candidate',
          permissions: ['candidates:profile', 'candidates:read'],
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
  await CandidateProfile.deleteMany({}); // Clear collection

  // 2. Start Candidate Service on port 7603
  const candidateServer = http.createServer(candidateApp);
  await new Promise((resolve) => candidateServer.listen(CANDIDATE_PORT, resolve));

  // 3. Start API Gateway on port 7600
  const gatewayServer = http.createServer(app);
  await new Promise((resolve) => gatewayServer.listen(GATEWAY_PORT, resolve));

  // Helper to send HTTP requests to Gateway
  const request = (method, path, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
      const requestBody = body ? JSON.stringify(body) : null;
      const finalHeaders = { ...headers };
      if (requestBody) {
        finalHeaders['Content-Length'] = Buffer.byteLength(requestBody);
      }

      const req = http.request(
        `http://localhost:${GATEWAY_PORT}${path}`,
        { method, headers: finalHeaders },
        (res) => {
          let responseBody = '';
          res.on('data', (chunk) => {
            responseBody += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              body: responseBody ? JSON.parse(responseBody) : null,
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
    const headers = {
      'Authorization': 'Bearer e1e2049e-71b3-4f91-88f5-9304724037ac', // Mock UUID
      'Content-Type': 'application/json',
      'X-Correlation-ID': 'e2e-cand-correlation-123',
    };

    // ─── Test 1: Self-healing creation of profile on GET ───
    const getRes = await request('GET', '/api/v1/candidates/profile', headers);
    
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.strictEqual(getRes.body.data.id, 'candidate_e2e_88');
    assert.strictEqual(getRes.body.data.basics.name, 'New Candidate');
    assert.strictEqual(getRes.body.data.basics.email, 'candidate_e2e_88@hire1percent.local');
    assert.strictEqual(getRes.body.data.profileCompletion, 10);

    // ─── Test 2: Update Profile ───
    const updateBody = {
      basics: {
        name: 'Alice Cooper',
        phone: '123456789',
        location: 'New York',
        bio: 'Node.js Developer Extraordinaire',
      },
      skills: ['Node.js', 'Express', 'Mongoose'],
      socialLinks: {
        linkedin: 'https://linkedin.com/in/alice',
        github: 'https://github.com/alice',
      },
    };

    const updateRes = await request('PUT', '/api/v1/candidates/profile', headers, updateBody);

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.success, true);
    assert.strictEqual(updateRes.body.data.basics.name, 'Alice Cooper');
    assert.strictEqual(updateRes.body.data.basics.phone, '123456789');
    assert.deepStrictEqual(updateRes.body.data.skills, ['Node.js', 'Express', 'Mongoose']);
    // Completion calculation: basics (all 5 filled = 25) + skills (15) + 2 socials (5) = 45%
    assert.strictEqual(updateRes.body.data.profileCompletion, 45);

    // ─── Test 3: Retrieve Dashboard ───
    const dashRes = await request('GET', '/api/v1/candidates/dashboard', headers);
    assert.strictEqual(dashRes.statusCode, 200);
    assert.strictEqual(dashRes.body.data.profileCompletion, 45);
    assert.strictEqual(dashRes.body.data.bookmarksCount, 0);

    // Verify record in Database directly
    const dbProfile = await CandidateProfile.findOne({ userId: 'candidate_e2e_88' });
    assert.ok(dbProfile);
    assert.strictEqual(dbProfile.basics.name, 'Alice Cooper');
    assert.strictEqual(dbProfile.profileCompletion, 45);

  } finally {
    // Cleanup
    gatewayServer.close();
    candidateServer.close();
    mockAuthServer.close();
    await mongoose.connection.close();
  }
});
