const User = require('../models/User');
const bcrypt = require('bcryptjs');
const admin = require('../config/firebase');

const seedAdmin = async () => {
    const adminAccounts = [
        { email: 'sravyaadmin@gmail.com', name: 'Sravya', password: 'Sravya@123', fallbackUid: 'admin-sravya' },
        { email: 'hemangi@web3today.io', name: 'Hemangi', password: 'hemangi@123', fallbackUid: 'admin-hemangi' }
    ];

    for (const account of adminAccounts) {
        try {
            const { email: adminEmail, password: adminPassword, name: adminName, fallbackUid: adminFallbackUid } = account;

            let firebaseUid = null;
            if (admin.apps.length > 0) {
                try {
                    const userRecord = await admin.auth().getUserByEmail(adminEmail);
                    firebaseUid = userRecord.uid;
                    console.log(`[SEED] Found existing Firebase User for ${adminEmail} (UID: ${firebaseUid})`);
                } catch (fbError) {
                    if (fbError.code === 'auth/user-not-found') {
                        try {
                            const newUser = await admin.auth().createUser({
                                email: adminEmail,
                                password: adminPassword,
                                displayName: adminName,
                                emailVerified: true
                            });
                            firebaseUid = newUser.uid;
                            console.log(`[SEED] Created Firebase User for ${adminEmail} (UID: ${firebaseUid})`);
                        } catch (createErr) {
                            console.warn(`[SEED] Failed to create Firebase user for ${adminEmail}:`, createErr.message);
                        }
                    } else {
                        console.warn(`[SEED] Firebase lookup error for ${adminEmail}:`, fbError.message);
                    }
                }
            }

            // Sync with MongoDB User
            const finalUid = firebaseUid || adminFallbackUid;
            let mongoUser = await User.findOne({ email: adminEmail });

            if (!mongoUser) {
                // If not found by email, check if fallbackUid exists
                mongoUser = await User.findOne({ uid: finalUid });
            }

            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            if (!mongoUser) {
                mongoUser = new User({
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    uid: finalUid,
                    emailVerified: true
                });
                await mongoUser.save();
                console.log(`[SEED] Created Admin MongoDB User for ${adminEmail}`);
            } else {
                mongoUser.role = 'admin';
                if (!mongoUser.uid || (firebaseUid && mongoUser.uid !== firebaseUid)) {
                    mongoUser.uid = finalUid;
                }
                if (!mongoUser.password) {
                    mongoUser.password = hashedPassword;
                }
                mongoUser.emailVerified = true;
                await mongoUser.save();
                console.log(`[SEED] Updated Admin MongoDB User for ${adminEmail}`);
            }
        } catch (error) {
            console.error(`[SEED] Failed to seed admin account ${account.email}:`, error.message);
        }
    }

    // 2. Seed Default Client Credentials for Frontend
    try {
        const Client = require('../models/Client');
        const defaultClient = await Client.findOne({ clientId: 'hire1percent_web_client' });
        if (!defaultClient) {
            const client = new Client({
                clientId: 'hire1percent_web_client',
                clientSecret: 'hire1percent_web_secret_2026',
                name: 'Hire1Percent Web Client',
                status: 'active'
            });
            await client.save();
            console.log('[SEED] Created default web client (hire1percent_web_client)');
        }
    } catch (error) {
        console.error('[SEED] Failed to seed default client:', error.message);
    }

    // 3. Seed roles + comprehensive RBAC resource rules
    try {
        const Role = require('../models/Role');
        const Resource = require('../models/Resource');
        const { clearResourceCache } = require('../services/authService');

        // ─── Ensure all required roles exist ──────────────────────────────────
        const ensureRole = async (name, description) => {
            let role = await Role.findOne({ name });
            if (!role) {
                role = new Role({ name, description });
                await role.save();
                console.log(`[SEED] Created role: ${name}`);
            }
            return role;
        };

        const adminRole          = await ensureRole('admin',            'Platform administrator');
        const recruiterRole      = await ensureRole('recruiter',        'Standard recruiter');
        const premiumRole        = await ensureRole('premium_recruiter','Pro recruiter with applicant access');
        const userRole           = await ensureRole('user',             'Job seeker / candidate');
        const seekerRole         = await ensureRole('seeker',           'Job seeker (alias)');
        const candidateRole      = await ensureRole('candidate',        'Candidate');

        // ─── Role group shortcuts ──────────────────────────────────────────────
        const ADMIN_ONLY          = [adminRole._id];
        const RECRUITER_AND_ABOVE = [adminRole._id, recruiterRole._id, premiumRole._id];
        const ALL_AUTHENTICATED   = [adminRole._id, recruiterRole._id, premiumRole._id, userRole._id, seekerRole._id, candidateRole._id];

        // ─── Rule definitions ─────────────────────────────────────────────────
        const rules = [
            // ── Admin-only management ──────────────────────────────────────────
            { p: '/api/admin/**',                 m: 'ALL',    d: 'Admin management routes',                    r: ADMIN_ONLY },

            // ── Jobs ──────────────────────────────────────────────────────────
            { p: '/api/jobs/**',                  m: 'ALL',    d: 'Job CRUD for recruiters + admin',            r: RECRUITER_AND_ABOVE },

            // ── Recruiter dashboard ───────────────────────────────────────────
            { p: '/api/recruiter/**',             m: 'ALL',    d: 'Recruiter-specific routes',                  r: RECRUITER_AND_ABOVE },
            { p: '/api/recruiter-upload/**',      m: 'ALL',    d: 'Recruiter bulk-upload routes',               r: RECRUITER_AND_ABOVE },
            { p: '/api/recruiter-knowledge/**',   m: 'ALL',    d: 'Knowledge hub routes',                       r: RECRUITER_AND_ABOVE },
            { p: '/api/question-bank/**',         m: 'ALL',    d: 'Question bank routes',                       r: RECRUITER_AND_ABOVE },
            { p: '/api/calibration/**',           m: 'ALL',    d: 'Calibration & scoring (recruiter)',          r: RECRUITER_AND_ABOVE },
            { p: '/api/team-fit/**',              m: 'ALL',    d: 'Team-fit analysis (recruiter)',              r: RECRUITER_AND_ABOVE },

            // ── Applications ─────────────────────────────────────────────────
            { p: '/api/applications/recruiter/**',m: 'GET',    d: 'Recruiter applicant list',                   r: RECRUITER_AND_ABOVE },
            { p: '/api/applications/**',          m: 'ALL',    d: 'Application routes for all authenticated',   r: ALL_AUTHENTICATED },

            // ── Assessments & Coding ──────────────────────────────────────────
            { p: '/api/assessments/**',           m: 'ALL',    d: 'Assessment routes',                          r: ALL_AUTHENTICATED },
            { p: '/api/coding-assessments/**',    m: 'ALL',    d: 'Coding assessment routes',                   r: ALL_AUTHENTICATED },
            { p: '/api/custom-coding-assessments/**', m: 'ALL', d: 'Custom coding assessment routes',           r: ALL_AUTHENTICATED },
            { p: '/api/candidate/job-readiness/**', m: 'ALL',  d: 'Candidate job readiness routes',             r: ALL_AUTHENTICATED },
            { p: '/api/candidate-career/**',      m: 'ALL',    d: 'Candidate career routes',                    r: ALL_AUTHENTICATED },

            // ── Interviews ────────────────────────────────────────────────────
            { p: '/api/interview/**',             m: 'ALL',    d: 'Interview routes',                           r: ALL_AUTHENTICATED },
            { p: '/api/v2/voice/**',              m: 'ALL',    d: 'Voice interview v2',                         r: ALL_AUTHENTICATED },

            // ── Proctoring ────────────────────────────────────────────────────
            { p: '/api/proctoring/**',            m: 'ALL',    d: 'Proctoring routes',                          r: ALL_AUTHENTICATED },
            { p: '/api/proctoring-enhanced/**',   m: 'ALL',    d: 'Enhanced proctoring routes',                 r: ALL_AUTHENTICATED },
            { p: '/api/proctoring-pipeline/**',   m: 'ALL',    d: 'Proctoring pipeline events',                 r: ALL_AUTHENTICATED },

            // ── Users / Resumes ───────────────────────────────────────────────
            { p: '/api/users/**',                 m: 'ALL',    d: 'User management routes',                     r: ALL_AUTHENTICATED },
            { p: '/api/resume/**',                m: 'ALL',    d: 'Resume routes',                              r: ALL_AUTHENTICATED },
            { p: '/api/user-resumes/**',          m: 'ALL',    d: 'User resume documents',                      r: ALL_AUTHENTICATED },

            // ── Content & Community ───────────────────────────────────────────
            { p: '/api/content/**',               m: 'ALL',    d: 'Blog / content routes',                      r: ALL_AUTHENTICATED },
            { p: '/api/community/**',             m: 'ALL',    d: 'Community routes',                           r: ALL_AUTHENTICATED },
            { p: '/api/insights/**',              m: 'ALL',    d: 'Insight / analytics routes',                 r: ALL_AUTHENTICATED },
            { p: '/api/v1/**',                    m: 'ALL',    d: 'v1 API (blog, etc.)',                        r: ALL_AUTHENTICATED },

            // ── Video / Media ─────────────────────────────────────────────────
            { p: '/api/video-intro/**',           m: 'ALL',    d: 'Video intro routes',                         r: ALL_AUTHENTICATED },
            { p: '/api/cloudinary-test/**',       m: 'ALL',    d: 'Cloudinary test routes',                     r: RECRUITER_AND_ABOVE },

            // ── Catch-all: handles any new authenticated route ────────────────
            { p: '/api/**',                       m: 'ALL',    d: 'Catch-all authenticated route',              r: ALL_AUTHENTICATED },
        ];

        // ─── Upsert each rule ─────────────────────────────────────────────────
        let created = 0, updated = 0;
        for (const rule of rules) {
            const existing = await Resource.findOne({ pathPattern: rule.p, method: rule.m });
            if (!existing) {
                await new Resource({
                    pathPattern:  rule.p,
                    method:       rule.m,
                    description:  rule.d,
                    allowedRoles: rule.r
                }).save();
                created++;
            } else {
                existing.allowedRoles = rule.r;
                existing.description  = rule.d;
                await existing.save();
                updated++;
            }
        }
        console.log(`[SEED] Resource rules: ${created} created, ${updated} updated (${rules.length} total)`);

        // Bust the in-memory cache so the running server picks up new rules immediately
        clearResourceCache();
        console.log('[SEED] Resource cache cleared — RBAC resource rules active');
    } catch (error) {
        console.error('[SEED] Failed to seed RBAC resource rules:', error.message);
    }
};

module.exports = seedAdmin;
