const fs = require('fs');
const code = fs.readFileSync('server.js', 'utf8');
try {
    new Function(code);
    console.log("Syntax OK (wrapped)");
} catch (e) {
    console.log("Error:", e.message);
    // Stack trace might have line number
    const stack = e.stack.split('\n');
    console.log(stack[0]);
    console.log(stack[1]);
}
