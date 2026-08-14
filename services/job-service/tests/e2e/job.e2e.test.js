import './setupEnv.js';
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../../../api-gateway/src/app.js';
import jobApp from '../../src/app.js';
import Job from '../../src/models/job.model.js';

const GATEWAY_PORT = 7500;
const AUTH_PORT = 7501;
const JOB_PORT = 7502;

test('E2E Gateway: verify full flow from Gateway to Job Service and MongoDB', async (t) => {
  // 1. Start mock Auth Service on port 7501
  const mockAuthServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      user: {
        id: 'recruiter_e2e_99',
        email: 'recruiter@hire1percent.com',
        role: 'recruiter',
        permissions: ['jobs:create', 'jobs:read']
      },
      session: {
        sessionId: 'session_e2e',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      }
    }));
  });
  await new Promise((resolve) => mockAuthServer.listen(AUTH_PORT, resolve));

  // Connect Job Service mongoose to MongoDB (E2E Test database)
  await mongoose.connect(process.env.MONGO_URI);
  await Job.deleteMany({}); // clean database

  // 2. Start actual Job Service on port 5002
  const jobServer = http.createServer(jobApp);
  await new Promise((resolve) => jobServer.listen(JOB_PORT, resolve));

  // 3. Start API Gateway on port 7500
  const gatewayServer = http.createServer(app);
  await new Promise((resolve) => gatewayServer.listen(GATEWAY_PORT, resolve));

  // Helper to send HTTP requests to Gateway
  const request = (method, path, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `http://localhost:${GATEWAY_PORT}${path}`,
        { method, headers },
        (res) => {
          let responseBody = '';
          res.on('data', chunk => { responseBody += chunk; });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              body: responseBody ? JSON.parse(responseBody) : null
            });
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  try {
    // 4. Send request to create job through Gateway
    const createHeaders = {
      'Authorization': 'Bearer d3b07384-d113-4956-a5db-2e01625f9037', // valid UUID
      'Content-Type': 'application/json',
      'X-Correlation-ID': 'e2e-correlation-123'
    };
    const createBody = {
      title: 'Senior Node Developer',
      description: 'Build microservices with Antigravity',
      location: 'Remote',
      salary: '$150k - $180k',
      skills: ['Node.js', 'Express', 'ESM']
    };

    const res = await request('POST', '/api/v1/jobs/create', createHeaders, createBody);
    
    if (res.statusCode !== 201) {
      console.log('E2E Fail Body:', JSON.stringify(res.body, null, 2));
    }
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.title, 'Senior Node Developer');
    assert.strictEqual(res.body.data.recruiterId, 'recruiter_e2e_99');

    // 5. Verify the job is stored in MongoDB
    const jobInDb = await Job.findById(res.body.data.id);
    assert.ok(jobInDb);
    assert.strictEqual(jobInDb.title, 'Senior Node Developer');
    assert.strictEqual(jobInDb.status, 'draft');

  } finally {
    // Cleanup
    gatewayServer.close();
    jobServer.close();
    mockAuthServer.close();
    await mongoose.connection.close();
  }
});
