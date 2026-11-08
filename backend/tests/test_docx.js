const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { parseFileToText, parseRawQuestionText } = require('../services/questionParserService');

async function testDocx() {
    const docxPath = 'c:/Users/sravy/OneDrive/Desktop/Talent Ecosystem/test_interview_questions.docx';
    const buffer = fs.readFileSync(docxPath);

    console.log('1. Testing parseFileToText with .docx buffer...');
    const extractedText = await parseFileToText(buffer, 'test_interview_questions.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    console.log('Extracted Text:\n---');
    console.log(extractedText);
    console.log('---\n');

    const parsedResult = parseRawQuestionText(extractedText);
    console.log('Parsed Questions Count:', parsedResult.count);
    parsedResult.questions.forEach((q, i) => {
        console.log(`[${i + 1}] (${q.category} / ${q.difficulty}): ${q.text}`);
    });

    console.log('\n2. Testing HTTP POST to http://localhost:5000/api/jobs/parse-questions...');
    const form = new FormData();
    form.append('file', buffer, {
        filename: 'test_interview_questions.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    const res = await axios.post('http://localhost:5000/api/jobs/parse-questions', form, {
        headers: {
            ...form.getHeaders(),
            'X-Client-ID': 'hire1percent_web_client',
            'X-Client-Secret': 'h1p_secret_2026_gateway_key'
        }
    });

    console.log('Endpoint Response Success:', res.data.success);
    console.log('Endpoint Question Count:', res.data.count);
    console.log('Endpoint Questions:', res.data.questions.map(q => q.text));
}

testDocx().catch(err => {
    console.error('Test failed:', err.response?.data || err.message);
    process.exit(1);
});
