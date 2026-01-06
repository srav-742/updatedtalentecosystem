const axios = require('axios');

async function verify() {
    try {
        try {
            console.log('Testing Signup...');
            const signupRes = await axios.post('http://localhost:5000/api/signup', {
                name: 'Test Seeker',
                email: 'test' + Math.random() + '@gmail.com',
                password: 'password123',
                role: 'seeker'
            });
            console.log('Signup Response:', signupRes.data);
        } catch (err) {
            console.log('Signup failed (likely user exists):', err.response ? err.response.data.message : err.message);
        }

        try {
            console.log('\nTesting Login for testseeker@gmail.com...');
            const loginRes = await axios.post('http://localhost:5000/api/login', {
                email: 'testseeker@gmail.com',
                password: 'password123',
                role: 'seeker'
            });
            console.log('Login Response:', loginRes.data);
        } catch (err) {
            console.error('Login Error:', err.response ? err.response.data : err.message);
        }

        try {
            console.log('\nTesting Login for anjali@gamail.com...');
            const loginRes = await axios.post('http://localhost:5000/api/login', {
                email: 'anjali@gamail.com',
                password: 'password123', // I don't know the password yet
                role: 'seeker'
            });
            console.log('Anjali Login Response:', loginRes.data);
        } catch (err) {
            console.error('Anjali Login Error:', err.response ? err.response.data : err.message);
        }
    } catch (err) {
        console.error('Global Error:', err);
    }
}

verify();
