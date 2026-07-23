const User = require('../models/User');
const Client = require('../models/Client');
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

            // 1. Firebase Check & Create/Update (Primary Authority)
            let firebaseUid = null;
            if (admin.apps.length > 0) {
                try {
                    const fbUser = await admin.auth().getUserByEmail(adminEmail);
                    firebaseUid = fbUser.uid;
                    
                    // Force password update if needed to ensure login works
                    await admin.auth().updateUser(firebaseUid, {
                        password: adminPassword,
                        displayName: adminName
                    });
                    console.log(`[SEED] Updated Firebase credentials for: ${adminEmail}`);
                } catch (e) {
                    if (e.code === 'auth/user-not-found') {
                        const newUser = await admin.auth().createUser({
                            email: adminEmail,
                            password: adminPassword,
                            displayName: adminName
                        });
                        firebaseUid = newUser.uid;
                        console.log(`[SEED] Created new Firebase account for: ${adminEmail}`);
                    } else {
                        throw e;
                    }
                }
            }

            // 2. MongoDB Check & Sync
            const existingAdmin = await User.findOne({ email: adminEmail });
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            if (!existingAdmin) {
                const adminUser = new User({
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin',
                    uid: firebaseUid || adminFallbackUid
                });

                await adminUser.save();
                console.log(`[SEED] Created Admin record in MongoDB: ${adminEmail}`);
            } else {
                // Update existing record to match Firebase and Roles
                existingAdmin.role = 'admin';
                existingAdmin.password = hashedPassword;
                // Update UID: use Firebase UID if available, else use stable fallback (never set to pending-sync)
                if (firebaseUid) {
                    existingAdmin.uid = firebaseUid;
                } else if (!existingAdmin.uid || existingAdmin.uid === 'admin-pending-sync') {
                    existingAdmin.uid = adminFallbackUid;
                }
                await existingAdmin.save();
                console.log(`[SEED] Synced Admin record for: ${adminEmail}`);
            }
        } catch (error) {
            console.error(`[SEED] Critical failure for ${account.email}:`, error.message);
        }
    }

    // 3. Seed default Gateway Client
    try {
        const defaultClient = {
            clientId: 'hire1percent_web_client',
            clientSecretRaw: 'h1p_secret_2026_gateway_key',
            name: 'Hire1Percent Web Client',
            description: 'Default web client for the Hire1Percent platform',
            status: 'active'
        };

        const existingClient = await Client.findOne({ clientId: defaultClient.clientId });
        if (!existingClient) {
            const hashedSecret = await bcrypt.hash(defaultClient.clientSecretRaw, 10);
            const client = new Client({
                clientId: defaultClient.clientId,
                clientSecret: hashedSecret,
                name: defaultClient.name,
                description: defaultClient.description,
                status: defaultClient.status
            });
            await client.save();
            console.log(`[SEED] Created default Client record in MongoDB: ${defaultClient.clientId}`);
        } else {
            const hashedSecret = await bcrypt.hash(defaultClient.clientSecretRaw, 10);
            existingClient.clientSecret = hashedSecret;
            existingClient.name = defaultClient.name;
            existingClient.status = defaultClient.status;
            await existingClient.save();
            console.log(`[SEED] Synced/Updated default Client record in MongoDB: ${defaultClient.clientId}`);
        }
    } catch (error) {
        console.error('[SEED] Failed to seed default client:', error.message);
    }

    // 4. Seed roles + comprehensive RBAC resource rules (strict deny-by-default support)
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

        // ─── Role group shortcuts ──────────────────────────────────────────────
        const ADMIN_ONLY          = [adminRole._id];
        const RECRUITER_AND_ABOVE = [adminRole._id, recruiterRole._id, premiumRole._id];
        const ALL_AUTHENTICATED   = [adminRole._id, recruiterRole._id, premiumRole._id, userRole._id, seekerRole._id];

        // ─── Rule definitions ─────────────────────────────────────────────────
        // ORDER DOES NOT MATTER here — specificity scoring handles priority at
        // query time. Just make sure every route group is covered.
        const rules = [
            // ── Admin-only management (must be MORE specific than /api/**) ─────
            { p: '/api/admin/**',                 m: 'ALL',    d: 'Admin management routes',                    r: ADMIN_ONLY },

            // ── Jobs ──────────────────────────────────────────────────────────
            { p: '/api/jobs/**',                  m: 'ALL',    d: 'Job CRUD for recruiters + admin',            r: RECRUITER_AND_ABOVE },

            // ── Recruiter dashboard ───────────────────────────────────────────
            { p: '/api/recruiter/**',             m: 'ALL',    d: 'Recruiter-specific routes',                  r: RECRUITER_AND_ABOVE },
            { p: '/api/recruiter-upload/**',      m: 'ALL',    d: 'Recruiter bulk-upload routes',               r: RECRUITER_AND_ABOVE },
            { p: '/api/calibration/**',           m: 'ALL',    d: 'Calibration & scoring (recruiter)',          r: RECRUITER_AND_ABOVE },
            { p: '/api/team-fit/**',              m: 'ALL',    d: 'Team-fit analysis (recruiter)',              r: RECRUITER_AND_ABOVE },

            // ── Applications (recruiter sub-path already seeded, kept for specificity) ──
            { p: '/api/applications/recruiter/**',m: 'GET',    d: 'Recruiter applicant list',                   r: RECRUITER_AND_ABOVE },
            { p: '/api/applications/**',          m: 'ALL',    d: 'Application routes for all authenticated',   r: ALL_AUTHENTICATED },

            // ── Resume / Profile ──────────────────────────────────────────────
            { p: '/api/resume/**',                m: 'ALL',    d: 'Resume routes',                              r: ALL_AUTHENTICATED },
            { p: '/api/user-resumes/**',          m: 'ALL',    d: 'User resume upload routes',                  r: ALL_AUTHENTICATED },
            { p: '/api/profile/**',               m: 'ALL',    d: 'Profile routes',                             r: ALL_AUTHENTICATED },
            { p: '/api/users/**',                 m: 'ALL',    d: 'User data routes',                           r: ALL_AUTHENTICATED },

            // ── Interviews ────────────────────────────────────────────────────
            { p: '/api/interview/**',             m: 'ALL',    d: 'AI interview routes',                        r: ALL_AUTHENTICATED },
            { p: '/api/transcripts/**',           m: 'ALL',    d: 'Interview transcript routes',                r: ALL_AUTHENTICATED },

            // ── Assessments ───────────────────────────────────────────────────
            { p: '/api/assessment/**',            m: 'ALL',    d: 'Assessment routes',                          r: ALL_AUTHENTICATED },
            { p: '/api/proctoring/**',            m: 'ALL',    d: 'Proctoring routes',                          r: ALL_AUTHENTICATED },
            { p: '/api/proctoring-enhanced/**',   m: 'ALL',    d: 'Enhanced proctoring routes',                 r: ALL_AUTHENTICATED },

            // ── Voice / AI Agent ──────────────────────────────────────────────
            { p: '/api/voice/**',                 m: 'ALL',    d: 'Voice routes',                               r: ALL_AUTHENTICATED },
            { p: '/api/v2/voice/**',              m: 'ALL',    d: 'Voice v2 routes',                            r: ALL_AUTHENTICATED },
            { p: '/api/voice-agent/**',           m: 'ALL',    d: 'Voice agent routes',                         r: ALL_AUTHENTICATED },
            { p: '/api/agent/**',                 m: 'ALL',    d: 'AI agent routes',                            r: ALL_AUTHENTICATED },

            // ── Search ────────────────────────────────────────────────────────
            { p: '/api/search/**',                m: 'ALL',    d: 'Search routes',                              r: ALL_AUTHENTICATED },
            { p: '/api/ai-search/**',             m: 'ALL',    d: 'AI semantic search routes',                  r: ALL_AUTHENTICATED },

            // ── Payments ─────────────────────────────────────────────────────
            { p: '/api/payments/**',              m: 'ALL',    d: 'Payment routes',                             r: ALL_AUTHENTICATED },

            // ── Content / Community / Insights ────────────────────────────────
            { p: '/api/content/**',               m: 'ALL',    d: 'Blog / content routes',                      r: ALL_AUTHENTICATED },
            { p: '/api/community/**',             m: 'ALL',    d: 'Community routes',                           r: ALL_AUTHENTICATED },
            { p: '/api/insights/**',              m: 'ALL',    d: 'Insight / analytics routes',                 r: ALL_AUTHENTICATED },
            { p: '/api/v1/**',                    m: 'ALL',    d: 'v1 API (blog, etc.)',                        r: ALL_AUTHENTICATED },

            // ── Video / Media ─────────────────────────────────────────────────
            { p: '/api/video-intro/**',           m: 'ALL',    d: 'Video intro routes',                         r: ALL_AUTHENTICATED },
            { p: '/api/cloudinary-test/**',       m: 'ALL',    d: 'Cloudinary test routes',                     r: RECRUITER_AND_ABOVE },

            // ── Catch-all: least specific — handles any new route not listed above ──
            // More-specific rules above will always win over this fallback.
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
        console.log('[SEED] Resource cache cleared — strict deny-by-default is now active');

    } catch (error) {
        console.error('[SEED] Failed to seed RBAC resource rules:', error.message);
    }
};

module.exports = seedAdmin;

