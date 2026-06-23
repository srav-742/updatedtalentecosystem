/**
 * Seed Script for Authorization System
 * 
 * Run with: node scratch/seedAuth.js
 * 
 * This script initializes the database with:
 * 1. Default Roles (admin, chairman, chairperson, recruiter, seeker, user)
 * 2. A default Client (hire1percent_web) with Client ID and Client Secret
 * 3. Client-Role mappings
 * 4. Resource access rules
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const Client = require('../models/Client');
const Role = require('../models/Role');
const ClientRole = require('../models/ClientRole');
const Resource = require('../models/Resource');

const seed = async () => {
    try {
        await connectDB();
        console.log('\n🌱 Starting Authorization System Seed...\n');

        // ─── Step 1: Create Roles ────────────────────────────────────────
        const roleDefinitions = [
            { name: 'admin', description: 'Full system access — manages users, roles, and all resources' },
            { name: 'chairman', description: 'Executive-level access to organization-wide data' },
            { name: 'chairperson', description: 'Organizational management access' },
            { name: 'recruiter', description: 'Access to job postings, applicants, and hiring tools' },
            { name: 'seeker', description: 'Access to job search, applications, and profile management' },
            { name: 'user', description: 'Default role assigned to every registered user' }
        ];

        const roles = {};
        for (const roleDef of roleDefinitions) {
            const existing = await Role.findOne({ name: roleDef.name });
            if (existing) {
                roles[roleDef.name] = existing;
                console.log(`  ✅ Role "${roleDef.name}" already exists`);
            } else {
                roles[roleDef.name] = await Role.create(roleDef);
                console.log(`  ✨ Created role: "${roleDef.name}"`);
            }
        }

        // ─── Step 2: Create Default Client ───────────────────────────────
        const CLIENT_ID = 'hire1percent_web_client';
        const CLIENT_SECRET_RAW = 'h1p_secret_2026_gateway_key';  // This is the raw secret

        let client = await Client.findOne({ clientId: CLIENT_ID });
        if (!client) {
            const hashedSecret = await bcrypt.hash(CLIENT_SECRET_RAW, 12);
            client = await Client.create({
                clientId: CLIENT_ID,
                clientSecret: hashedSecret,
                name: 'Hire1Percent Web Application',
                description: 'Primary web client for the Hire1Percent platform',
                status: 'active'
            });
            console.log(`\n  ✨ Created client: "${CLIENT_ID}"`);
            console.log(`  🔑 Client ID:     ${CLIENT_ID}`);
            console.log(`  🔐 Client Secret:  ${CLIENT_SECRET_RAW}`);
            console.log(`  ⚠️  Save these credentials! The secret is hashed in the database.\n`);
        } else {
            console.log(`\n  ✅ Client "${CLIENT_ID}" already exists\n`);
        }

        // ─── Step 3: Assign All Roles to the Default Client ──────────────
        for (const [roleName, roleDoc] of Object.entries(roles)) {
            const existing = await ClientRole.findOne({ client: client._id, role: roleDoc._id });
            if (!existing) {
                await ClientRole.create({ client: client._id, role: roleDoc._id });
                console.log(`  🔗 Linked client "${CLIENT_ID}" → role "${roleName}"`);
            } else {
                console.log(`  ✅ Client-role link already exists: "${CLIENT_ID}" → "${roleName}"`);
            }
        }

        // ─── Step 4: Create Resource Access Rules ────────────────────────
        const resourceDefinitions = [
            // Admin-only routes
            {
                pathPattern: '/api/admin/**',
                method: 'ALL',
                description: 'Admin panel routes',
                allowedRoles: [roles['admin']._id]
            },
            // Recruiter routes — accessible by recruiter and admin
            {
                pathPattern: '/api/jobs/**',
                method: 'POST',
                description: 'Job posting — recruiter and admin only',
                allowedRoles: [roles['recruiter']._id, roles['admin']._id]
            },
            {
                pathPattern: '/api/jobs/**',
                method: 'DELETE',
                description: 'Job deletion — recruiter and admin only',
                allowedRoles: [roles['recruiter']._id, roles['admin']._id]
            },
            // Seeker routes — accessible by seeker, admin
            {
                pathPattern: '/api/applications/**',
                method: 'POST',
                description: 'Job application — seeker and admin',
                allowedRoles: [roles['seeker']._id, roles['admin']._id]
            },
            // Chairman routes
            {
                pathPattern: '/api/insights/**',
                method: 'ALL',
                description: 'Organization insights — chairman, chairperson, admin',
                allowedRoles: [roles['chairman']._id, roles['chairperson']._id, roles['admin']._id]
            }
        ];

        console.log('');
        for (const resDef of resourceDefinitions) {
            const existing = await Resource.findOne({
                pathPattern: resDef.pathPattern,
                method: resDef.method
            });
            if (!existing) {
                await Resource.create(resDef);
                console.log(`  📋 Created resource rule: ${resDef.method} ${resDef.pathPattern}`);
            } else {
                console.log(`  ✅ Resource rule exists: ${resDef.method} ${resDef.pathPattern}`);
            }
        }

        console.log('\n✅ Authorization system seed completed successfully!\n');
        console.log('─────────────────────────────────────────────────');
        console.log('  Client ID:     hire1percent_web_client');
        console.log('  Client Secret: h1p_secret_2026_gateway_key');
        console.log('─────────────────────────────────────────────────');
        console.log('\nAdd these to your frontend .env file:');
        console.log('  VITE_CLIENT_ID=hire1percent_web_client');
        console.log('  VITE_CLIENT_SECRET=h1p_secret_2026_gateway_key');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seed Error:', error);
        process.exit(1);
    }
};

seed();
