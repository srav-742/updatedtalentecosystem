const assert = require('assert');
const axios = require('axios');

async function testParseEndpoint() {
    console.log('Testing POST http://localhost:5000/api/jobs/parse-questions with JSON rawText...');
    const payload = {
        rawText: `1. Explain goroutine scheduling in Go.
2. What are buffered channels?
3. How do you prevent deadlocks in Go?`
    };

    try {
        const res = await axios.post('http://localhost:5000/api/jobs/parse-questions', payload);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.count, 3);
        assert.strictEqual(res.data.questions.length, 3);
        assert.strictEqual(res.data.questions[0].text, 'Explain goroutine scheduling in Go.');
        console.log('✅ Endpoint returned 200 OK and parsed 3 questions successfully!');
    } catch (err) {
        console.error('❌ Endpoint test failed:', err.response?.data || err.message);
        process.exit(1);
    }
}

testParseEndpoint();
