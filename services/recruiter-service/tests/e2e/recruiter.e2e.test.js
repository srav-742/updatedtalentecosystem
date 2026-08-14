import './setupEnv.js';
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../../../../api-gateway/src/app.js';
import recruiterApp from '../../src/app.js';
import RecruiterProfile from '../../src/models/recruiterProfile.model.js';
import Organization from '../../src/models/organization.model.js';
import Subscription from '../../src/models/subscription.model.js';
import CompanyBranding from '../../src/models/companyBranding.model.js';

const GATEWAY_PORT = 7600;
const AUTH_PORT = 7601;
const RECRUITER_PORT = 7604;

test('E2E Gateway: verify full flow from Gateway to Recruiter Service and MongoDB', async (t) => {
  // 1. Start mock Auth Service on port 7601
  const mockAuthServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        user: {
          id: 'recruiter_e2e_99',
          email: 'recruiter@hire1percent.com',
          role: 'recruiter',
          permissions: ['recruiters:profile', 'recruiters:read'],
        },
        session: {
          sessionId: 'session_e2e_rec',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      })
    );
  });
  await new Promise((resolve) => mockAuthServer.listen(AUTH_PORT, resolve));

  // Connect Mongoose to MongoDB test DB
  await mongoose.connect(process.env.MONGO_URI);
  await RecruiterProfile.deleteMany({});
  await Organization.deleteMany({});
  await Subscription.deleteMany({});
  await CompanyBranding.deleteMany({});

  // 2. Start Recruiter Service on port 7604
  const recruiterServer = http.createServer(recruiterApp);
  await new Promise((resolve) => recruiterServer.listen(RECRUITER_PORT, resolve));

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
      'Authorization': 'Bearer e1e2049e-71b3-4f91-88f5-9304724037ac', // Mock Bearer
      'Content-Type': 'application/json',
      'X-Correlation-ID': 'e2e-rec-correlation-123',
    };

    // ─── Test 1: Self-healing creation of profile on GET ───
    const getRes = await request('GET', '/api/v1/recruiters/profile', headers);
    
    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.strictEqual(getRes.body.data.id, 'recruiter_e2e_99');
    assert.strictEqual(getRes.body.data.basics.name, 'New Recruiter');
    assert.strictEqual(getRes.body.data.basics.email, 'recruiter_e2e_99@hire1percent.local');
    assert.strictEqual(getRes.body.data.profileCompletion, 20);

    // ─── Test 2: Update Profile ───
    const updateBody = {
      basics: {
        name: 'Jane Doe',
        phone: '987654321',
        designation: 'VP of Recruiting',
        profilePic: 'pic_url',
      },
      company: {
        name: 'Global Tech Inc',
        website: 'globaltech.example.com',
        logo: 'logo_url',
        description: 'Tech hiring company',
      },
    };

    const updateRes = await request('PUT', '/api/v1/recruiters/profile', headers, updateBody);

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.success, true);
    assert.strictEqual(updateRes.body.data.basics.name, 'Jane Doe');
    assert.strictEqual(updateRes.body.data.basics.phone, '987654321');
    assert.strictEqual(updateRes.body.data.company.name, 'Global Tech Inc');
    // Completion: 5 basics (50) + 4 company (40) = 90%
    assert.strictEqual(updateRes.body.data.profileCompletion, 90);

    // ─── Test 3: Create Organization ───
    const createOrgBody = {
      name: 'Global Tech Organization',
      code: 'global-tech',
      description: 'Main business division of Global Tech',
      billingEmail: 'billing@globaltech.example.com',
    };

    const orgRes = await request('POST', '/api/v1/organizations', headers, createOrgBody);

    assert.strictEqual(orgRes.statusCode, 200);
    assert.strictEqual(orgRes.body.success, true);
    assert.strictEqual(orgRes.body.data.name, 'Global Tech Organization');
    assert.strictEqual(orgRes.body.data.code, 'global-tech');
    assert.strictEqual(orgRes.body.data.ownerId, 'recruiter_e2e_99');
    assert.ok(orgRes.body.data.id);

    const organizationId = orgRes.body.data.id;

    // Verify Organization was created in DB
    const dbOrg = await Organization.findById(organizationId);
    assert.ok(dbOrg);
    assert.strictEqual(dbOrg.name, 'Global Tech Organization');

    // Verify Recruiter was linked to Organization and role set to owner
    const dbProfile = await RecruiterProfile.findOne({ userId: 'recruiter_e2e_99' });
    assert.strictEqual(dbProfile.organizationId, organizationId);
    assert.strictEqual(dbProfile.role, 'owner');
    // Completion recalculates to 100% since organization is now linked (90 + 10)
    assert.strictEqual(dbProfile.profileCompletion, 100);

    // ─── Test 4: Retrieve Team Members ───
    const teamRes = await request('GET', '/api/v1/organizations/team', headers);
    assert.strictEqual(teamRes.statusCode, 200);
    assert.strictEqual(teamRes.body.success, true);
    assert.strictEqual(teamRes.body.data.length, 1);
    assert.strictEqual(teamRes.body.data[0].id, 'recruiter_e2e_99');

    // ─── Test 5: Retrieve Subscription ───
    const subRes = await request('GET', '/api/v1/subscription', headers);
    assert.strictEqual(subRes.statusCode, 200);
    assert.strictEqual(subRes.body.success, true);
    assert.strictEqual(subRes.body.data.plan, 'free');
    assert.strictEqual(subRes.body.data.status, 'active');

    // Verify database directly
    const dbSub = await Subscription.findOne({ organizationId });
    assert.ok(dbSub);
    assert.strictEqual(dbSub.plan, 'free');

  } finally {
    // Cleanup
    gatewayServer.close();
    recruiterServer.close();
    mockAuthServer.close();
    await mongoose.connection.close();
  }
});
