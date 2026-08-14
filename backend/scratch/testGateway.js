const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const CLIENT_ID = 'hire1percent_web_client';
const CLIENT_SECRET = 'h1p_secret_2026_gateway_key';

const runTests = async () => {
    console.log('=== RUNNING GATEWAY API TESTS ===');

    // Test 1: Try without client credentials
    try {
        console.log('\n[Test 1] Requesting token without Client ID/Secret...');
        await axios.post(`${API_URL}/gateway/token`, {
            email: 'sravyaadmin@gmail.com'
        });
        console.error('❌ Test 1 Failed: Request succeeded when it should have failed.');
    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('✅ Test 1 Passed: Rejected with 401 as expected. Message:', err.response.data.message);
        } else {
            console.error('❌ Test 1 Failed with unexpected error:', err.message);
        }
    }

    // Test 2: Try with invalid client credentials
    try {
        console.log('\n[Test 2] Requesting token with invalid Client Secret...');
        await axios.post(`${API_URL}/gateway/token`, {
            email: 'sravyaadmin@gmail.com'
        }, {
            headers: {
                'X-Client-ID': CLIENT_ID,
                'X-Client-Secret': 'wrong_secret'
            }
        });
        console.error('❌ Test 2 Failed: Request succeeded when it should have failed.');
    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('✅ Test 2 Passed: Rejected with 401 as expected. Message:', err.response.data.message);
        } else {
            console.error('❌ Test 2 Failed with unexpected error:', err.message);
        }
    }

    // Test 3: Request token with valid client credentials and admin email
    let tokens = null;
    try {
        console.log('\n[Test 3] Requesting token with valid Client credentials and email...');
        const response = await axios.post(`${API_URL}/gateway/token`, {
            email: 'sravyaadmin@gmail.com'
        }, {
            headers: {
                'X-Client-ID': CLIENT_ID,
                'X-Client-Secret': CLIENT_SECRET
            }
        });
        if (response.status === 200 && response.data.accessToken) {
            tokens = response.data;
            console.log('✅ Test 3 Passed: Tokens issued successfully!');
            console.log('Access Token (truncated):', tokens.accessToken.substring(0, 30) + '...');
            console.log('Refresh Token (truncated):', tokens.refreshToken.substring(0, 30) + '...');
        } else {
            console.error('❌ Test 3 Failed: Response was status', response.status, response.data);
        }
    } catch (err) {
        console.error('❌ Test 3 Failed with error:', err.response ? err.response.data : err.message);
    }

    // Test 4: Validate token
    if (tokens) {
        try {
            console.log('\n[Test 4] Validating the issued Access Token...');
            const response = await axios.get(`${API_URL}/gateway/validate`, {
                headers: {
                    'Authorization': `Bearer ${tokens.accessToken}`
                }
            });
            if (response.status === 200 && response.data.valid) {
                console.log('✅ Test 4 Passed: Token is valid! User:', response.data.user.email, 'Role:', response.data.user.role);
            } else {
                console.error('❌ Test 4 Failed: Token validation failed.', response.data);
            }
        } catch (err) {
            console.error('❌ Test 4 Failed with error:', err.response ? err.response.data : err.message);
        }
    }

    // Test 5: Refresh token
    if (tokens) {
        try {
            console.log('\n[Test 5] Refreshing the expired/valid token using Refresh Token...');
            const response = await axios.post(`${API_URL}/gateway/refresh`, {
                refreshToken: tokens.refreshToken
            }, {
                headers: {
                    'X-Client-ID': CLIENT_ID,
                    'X-Client-Secret': CLIENT_SECRET
                }
            });
            if (response.status === 200 && response.data.accessToken) {
                console.log('✅ Test 5 Passed: Access Token refreshed successfully!');
                console.log('New Access Token (truncated):', response.data.accessToken.substring(0, 30) + '...');
            } else {
                console.error('❌ Test 5 Failed:', response.data);
            }
        } catch (err) {
            console.error('❌ Test 5 Failed with error:', err.response ? err.response.data : err.message);
        }
    }

    console.log('\n=== GATEWAY API TESTS COMPLETE ===');
};

runTests();
