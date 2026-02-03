const crypto = require('crypto');

const generateHash = (text) => {
    const normalized = text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
};

module.exports = { generateHash };
