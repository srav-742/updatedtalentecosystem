const axios = require('axios');

async function testApi() {
    try {
        const res = await axios.get('http://localhost:5000/api/jobs');
        console.log('Jobs returned by API:', res.data.length);
        console.log('First job snippet:', JSON.stringify(res.data[0], null, 2));
    } catch (err) {
        console.error('API Error:', err.message);
    }
}

testApi();
