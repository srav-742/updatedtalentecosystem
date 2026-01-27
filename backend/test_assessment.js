const axios = require('axios');

async function test() {
    try {
        console.log("Testing assessment generation...");
        const res = await axios.post('http://localhost:5000/api/generate-full-assessment', {
            jobTitle: 'Frontend Developer',
            jobSkills: ['JavaScript', 'React'],
            candidateSkills: [],
            experienceLevel: 'Entry',
            assessmentType: 'mcq',
            totalQuestions: 2,
            userId: 'test-user'
        });
        console.log("Success!");
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Failed:", e.message);
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Data:", e.response.data);
        }
    }
}

test();
