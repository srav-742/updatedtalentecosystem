const mongoose = require('mongoose');
const PlaintextClientCredential = require('../models/PlaintextClientCredential');

const seedPlaintextCredentials = async () => {
    try {
        const defaultClient = {
            clientId: 'hire1percent_web_client',
            clientSecretRaw: 'h1p_secret_2026_gateway_key',
            name: 'Hire1Percent Web Client',
            description: 'Default web client for the Hire1Percent platform'
        };

        await PlaintextClientCredential.findOneAndUpdate(
            { clientId: defaultClient.clientId },
            defaultClient,
            { upsert: true, new: true }
        );
        console.log(`[SEED] Successfully stored plaintext client credentials in MongoDB: ${defaultClient.clientId}`);
    } catch (error) {
        console.error('[SEED] Failed to seed plaintext credentials:', error.message);
    }
};

module.exports = seedPlaintextCredentials;
