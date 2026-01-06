const axios = require('axios');

async function testRoutes() {
    const recruiterId = '69537dcc524820fec83aa98d';
    const endpoints = [
        `http://localhost:5000/api/dashboard/${recruiterId}`,
        `http://localhost:5000/api/profile/${recruiterId}`,
        `http://localhost:5000/api/jobs/recruiter/${recruiterId}`,
        'http://localhost:5000/api/jobs'
    ];

    for (const url of endpoints) {
        try {
            const res = await axios.get(url);
            console.log(`PASS: ${url} (Status: ${res.status}, Items: ${Array.isArray(res.data) ? res.data.length : 'Object'})`);
        } catch (err) {
            console.log(`FAIL: ${url} (Status: ${err.response?.status || 'No Response'})`);
        }
    }
}

testRoutes();
