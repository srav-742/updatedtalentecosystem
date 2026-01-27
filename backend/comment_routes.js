const fs = require('fs');
const path = './server.js';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const startMarker = "app.post('/api/generate-interview-questions'";
const endMarker = "// --- RESUME INTELLIGENCE LAYER ---";

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(startMarker)) {
        startIdx = i;
    }
    if (lines[i].includes(endMarker)) {
        endIdx = i;
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    console.log(`Found range: ${startIdx} to ${endIdx}`);
    // Start commenting from startIdx
    // End commenting at endIdx - 1 (or the empty lines before it)

    lines[startIdx] = "/* " + lines[startIdx];
    lines[endIdx - 1] = lines[endIdx - 1] + " */";

    // Better: Wrap the whole thing?
    // "/*" at line startIdx
    // "*/" at line endIdx (insert a line)

    // Let's modify lines array
    // We insert "/*" before startIdx
    lines.splice(startIdx, 0, "/* DISABLED ROUTES (Legacy AI)");
    // We insert "*/" before endIdx (which is now +1 shifted)
    lines.splice(endIdx + 1, 0, "*/");

    fs.writeFileSync(path, lines.join('\n'));
    console.log("Commented out routes.");
} else {
    console.log("Markers not found.", startIdx, endIdx);
}
