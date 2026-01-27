const fs = require('fs');
const path = './server.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');
for (let i = 809; i < 870; i++) {
    console.log(`${i}: ${JSON.stringify(lines[i])}`);
}
