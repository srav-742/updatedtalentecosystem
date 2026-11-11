#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const PlaintextClientCredential = require('../models/PlaintextClientCredential');
const Client = require('../models/Client');
const User = require('../models/User');
const RecruiterTicketWallet = require('../models/RecruiterTicketWallet');

async function main() {
    const filterArg = process.argv[2] ? process.argv[2].trim().toLowerCase() : '';

    console.log('\n========================================================================================');
    console.log('              HIRE1PERCENT — ADMIN CLIENT CREDENTIALS REGISTRY                         ');
    console.log('========================================================================================\n');

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ MONGO_URI is not defined in environment.');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    } catch (connErr) {
        console.error('❌ Failed to connect to MongoDB Atlas:', connErr.message);
        process.exit(1);
    }

    try {
        const [plaintexts, clients, users, wallets] = await Promise.all([
            PlaintextClientCredential.find().sort({ createdAt: -1 }).lean(),
            Client.find().lean(),
            User.find().lean(),
            RecruiterTicketWallet.find().lean()
        ]);

        const clientMap = new Map();
        clients.forEach(c => clientMap.set(c.clientId, c));

        const userMap = new Map();
        users.forEach(u => {
            if (u.uid) userMap.set(u.uid, u);
            if (u._id) userMap.set(u._id.toString(), u);
            if (u.email) userMap.set(u.email.toLowerCase(), u);
        });

        const walletMap = new Map();
        wallets.forEach(w => walletMap.set(w.recruiterId, w));

        // Aggregate list
        let records = plaintexts.map(p => {
            const rawId = p.clientId.replace(/^client_/, '');
            const matchedUser = userMap.get(rawId) || userMap.get(p.clientId);
            const matchedClient = clientMap.get(p.clientId);
            const matchedWallet = walletMap.get(rawId) || walletMap.get(matchedUser?.uid) || walletMap.get(matchedUser?._id?.toString());

            const clientName = p.name || matchedClient?.name || matchedUser?.name || 'Recruiter Client';
            const email = matchedUser?.email || 'N/A';
            const tickets = matchedWallet ? `${matchedWallet.availableTickets} left / ${matchedWallet.totalPurchased} total` : '0 tickets';
            const jobsCount = matchedWallet?.jobs?.length || 0;

            return {
                clientName,
                email,
                clientId: p.clientId,
                clientSecret: p.clientSecretRaw || 'N/A',
                status: p.status || matchedClient?.status || 'active',
                tickets,
                jobsCount,
                createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US') : 'N/A'
            };
        });

        if (filterArg) {
            records = records.filter(r => 
                r.clientName.toLowerCase().includes(filterArg) ||
                r.email.toLowerCase().includes(filterArg) ||
                r.clientId.toLowerCase().includes(filterArg)
            );
            console.log(`🔍 Filter applied: "${filterArg}" (Matching ${records.length} clients)\n`);
        } else {
            console.log(`📋 Total Registered API Clients: ${records.length}\n`);
        }

        if (records.length === 0) {
            console.log('No matching clients found.\n');
            await mongoose.disconnect();
            process.exit(0);
        }

        // Display formatted table
        const pad = (str, len) => {
            const s = String(str || '');
            return s.length >= len ? s.slice(0, len - 1) + '…' : s + ' '.repeat(len - s.length);
        };

        const W_NAME = 28;
        const W_EMAIL = 28;
        const W_ID = 34;
        const W_SECRET = 28;
        const W_STATUS = 10;
        const W_TICKETS = 18;

        const separator = '─'.repeat(W_NAME + W_EMAIL + W_ID + W_SECRET + W_STATUS + W_TICKETS + 17);

        console.log(separator);
        console.log(
            `│ ${pad('CLIENT NAME', W_NAME)} │ ${pad('RECRUITER EMAIL', W_EMAIL)} │ ${pad('CLIENT ID', W_ID)} │ ${pad('CLIENT CREDENTIAL (SECRET)', W_SECRET)} │ ${pad('STATUS', W_STATUS)} │ ${pad('TICKETS', W_TICKETS)} │`
        );
        console.log(separator);

        records.forEach(r => {
            console.log(
                `│ ${pad(r.clientName, W_NAME)} │ ${pad(r.email, W_EMAIL)} │ ${pad(r.clientId, W_ID)} │ ${pad(r.clientSecret, W_SECRET)} │ ${pad(r.status, W_STATUS)} │ ${pad(r.tickets, W_TICKETS)} │`
            );
        });

        console.log(separator);
        console.log(`\n✅ Summary: ${records.length} client credential(s) listed successfully.\n`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error querying client credentials:', err.message);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    }
}

main();

