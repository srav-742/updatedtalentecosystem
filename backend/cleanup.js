const fs = require('fs');
const path = './server.js';

try {
    let content = fs.readFileSync(path, 'utf8');

    // The previous route ends with });\r\n
    // The stray code seems to start with if (q) {

    const startMarker = "if (q) {";
    const endMarker = "app.post('/api/generate-interview-questions'";

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
        console.log(`Found markers. Start: ${startIndex}, End: ${endIndex}`);

        // Ensure startIndex is NOT inside the valid code
        // The valid code has indentation. This one doesn't?
        // Let's print context
        // console.log("Context:", content.substring(startIndex - 20, startIndex + 20));

        const before = content.substring(0, startIndex);
        const after = content.substring(endIndex);

        // Remove trailing newlines/garbage from 'before' to match });
        // Actually, be careful not to delete });

        // Let's delete from startIndex to endIndex

        fs.writeFileSync(path, before + "\n\n" + after);
        console.log("Stray code removed.");
    } else {
        console.log("Markers not found.");
        console.log("Start:", startIndex);
        console.log("End:", endIndex);
    }
} catch (e) {
    console.error(e);
}
