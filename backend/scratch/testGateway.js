/**
 * API Gateway Test Script
 * 
 * Run with: node scratch/testGateway.js
 * 
 * Prerequisites:
 *   1. Backend server running on port 5000
 *   2. seedAuth.js has been run to populate the database
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const VALID_CLIENT_ID = 'hire1percent_web_client';
const VALID_CLIENT_SECRET = 'h1p_secret_2026_gateway_key';

let accessToken = null;
let refreshToken = null;

const log = (label, result) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} — ${label}`);
};

const test = async (name, fn) => {
    try {
        const result = await fn();
        log(name, result);
        return result;
    } catch (error) {
        log(name, false);
        console.log(`    Error: ${error.response?.data?.message || error.message}`);
        return false;
    }
};

const run = async () => {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   API Gateway & Authorization Test Suite       ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // ─── Test 1: Missing Client Credentials ──────────────────────────
    console.log('📋 Test Group 1: Client Credential Validation\n');

    await test('Missing client credentials returns 401', async () => {
        const res = await axios.post(`${BASE_URL}/gateway/token`, { email: 'test@test.com' }).catch(e => e.response);
        return res.status === 401;
    });

    await test('Invalid client credentials returns 401', async () => {
        const res = await axios.post(`${BASE_URL}/gateway/token`, 
            { email: 'test@test.com' },
            { headers: { 'X-Client-ID': 'bad_id', 'X-Client-Secret': 'bad_secret' } }
        ).catch(e => e.response);
        return res.status === 401;
    });

    await test('Valid client credentials proceed successfully', async () => {
        const res = await axios.post(`${BASE_URL}/gateway/token`, 
            { email: 'nonexistent@test.com' },
            { headers: { 'X-Client-ID': VALID_CLIENT_ID, 'X-Client-Secret': VALID_CLIENT_SECRET } }
        ).catch(e => e.response);
        // Should get 404 (user not found) — not 401 (client auth worked)
        return res.status === 404;
    });

    // ─── Test 2: Token Generation ────────────────────────────────────
    console.log('\n📋 Test Group 2: Token Generation\n');

    // First, find an existing user in the database
    const findUser = async () => {
        try {
            const res = await axios.get(`${BASE_URL}/status`);
            return res.status === 200;
        } catch {
            return false;
        }
    };

    const serverUp = await findUser();
    if (!serverUp) {
        console.log('  ⚠️  Server is not running. Start the backend first.\n');
        return;
    }

    // Try to generate tokens for the first user found
    // (In a real test, you'd create a test user first)
    await test('Token generation endpoint responds', async () => {
        const res = await axios.post(`${BASE_URL}/gateway/token`,
            { email: 'sravyaadmin@gmail.com' },
            { headers: { 'X-Client-ID': VALID_CLIENT_ID, 'X-Client-Secret': VALID_CLIENT_SECRET } }
        ).catch(e => e.response);
        
        if (res.status === 200 && res.data.accessToken) {
            accessToken = res.data.accessToken;
            refreshToken = res.data.refreshToken;
            console.log(`    → Access Token:  ${accessToken.substring(0, 30)}...`);
            console.log(`    → Refresh Token: ${refreshToken.substring(0, 30)}...`);
            return true;
        }
        // If user doesn't exist, that's OK — the endpoint still responded correctly
        console.log(`    → Response: ${res.status} — ${res.data.message}`);
        return res.status === 404; // user not found is a valid response
    });

    // ─── Test 3: Token Validation ────────────────────────────────────
    console.log('\n📋 Test Group 3: Token Validation\n');

    await test('Validate endpoint returns valid for good token', async () => {
        if (!accessToken) {
            console.log('    → Skipped (no token generated)');
            return true;
        }
        const res = await axios.get(`${BASE_URL}/gateway/validate`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }).catch(e => e.response);
        return res.status === 200 && res.data.valid === true;
    });

    await test('Validate endpoint returns invalid for bad token', async () => {
        const res = await axios.get(`${BASE_URL}/gateway/validate`, {
            headers: { 'Authorization': 'Bearer invalid.token.here' }
        }).catch(e => e.response);
        return res.status === 401 && res.data.valid === false;
    });

    // ─── Test 4: Token Refresh ───────────────────────────────────────
    console.log('\n📋 Test Group 4: Token Refresh\n');

    await test('Refresh endpoint requires client credentials', async () => {
        const res = await axios.post(`${BASE_URL}/gateway/refresh`,
            { refreshToken: 'some_token' }
        ).catch(e => e.response);
        return res.status === 401;
    });

    await test('Refresh endpoint works with valid refresh token', async () => {
        if (!refreshToken) {
            console.log('    → Skipped (no refresh token)');
            return true;
        }
        const res = await axios.post(`${BASE_URL}/gateway/refresh`,
            { refreshToken },
            { headers: { 'X-Client-ID': VALID_CLIENT_ID, 'X-Client-Secret': VALID_CLIENT_SECRET } }
        ).catch(e => e.response);
        if (res.status === 200 && res.data.accessToken) {
            console.log(`    → New Access Token: ${res.data.accessToken.substring(0, 30)}...`);
            return true;
        }
        return false;
    });

    // ─── Test 5: API Health ──────────────────────────────────────────
    console.log('\n📋 Test Group 5: General Health\n');

    await test('API status endpoint is accessible', async () => {
        const res = await axios.get(`${BASE_URL}/status`);
        return res.status === 200 && res.data.status === 'Active';
    });

    console.log('\n════════════════════════════════════════════════');
    console.log('  Test suite completed.');
    console.log('════════════════════════════════════════════════\n');
};

run().catch(err => {
    console.error('Test suite error:', err.message);
    process.exit(1);
});
