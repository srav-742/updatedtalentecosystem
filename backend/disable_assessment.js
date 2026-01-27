const fs = require('fs');
const path = './server.js';
let content = fs.readFileSync(path, 'utf8');

const startMarker = "app.post('/api/generate-full-assessment', async (req, res) => {";
const endMarker = "/* DISABLED ROUTES (Legacy AI)";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    // Comment it out
    const block = content.substring(startIdx, endIdx);
    // Be careful with nesting comments. I'll just rename the app.post to avoid execution?
    // No, syntax error is parse time.

    // I'll wrap it in a block comment, but I must escape existing comments?
    // The code has no block comments /* */ inside it?
    // It has `/* write here */` in the prompt string! 
    // Line 978: "starterCode": "function example() { /* write here */ }"

    // So I cannot wrap it in /* */.

    // I will replace it with a dummy function.
    const validDummy = `app.post('/api/generate-full-assessment', async (req, res) => { res.send('Dummy'); });\n\n`;

    // Reconstruct
    const newContent = content.substring(0, startIdx) + validDummy + content.substring(endIdx);
    fs.writeFileSync(path, newContent);
    console.log("Replaced with dummy function.");
} else {
    console.log("Markers not found.");
}
