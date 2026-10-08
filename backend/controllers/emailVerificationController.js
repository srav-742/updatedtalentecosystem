const crypto = require('crypto');
const User = require('../models/User');
const { withRetry } = require('../utils/retry');

/**
 * Email Verification Controller
 * 
 * Handles 3 endpoints:
 * - POST /api/auth/send-verification — generates token + sends branded email
 * - GET  /api/auth/verify-email      — validates token from email link
 * - POST /api/auth/resend-verification — regenerates token + resends email (rate-limited)
 */

// ─── Branded HTML Email Template ─────────────────────────────────────────────
const buildVerificationEmailHtml = (name, verifyUrl) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email — Hire1Percent</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f0ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f0ff; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid rgba(99, 102, 241, 0.12); border-radius: 28px; overflow: hidden; box-shadow: 0 20px 50px rgba(99, 102, 241, 0.08);">
                    
                    <!-- Header with Envelope & @ Badge Icon -->
                    <tr>
                        <td align="center" style="padding: 44px 32px 16px 32px;">
                            <div style="width: 88px; height: 88px; margin: 0 auto; background-color: #f5f3ff; border-radius: 50%; text-align: center; vertical-align: middle; line-height: 88px;">
                                <span style="display: inline-block; font-size: 38px; line-height: 88px;">✉️</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Brand Name -->
                    <tr>
                        <td style="padding: 0 32px 8px 32px; text-align: center;">
                            <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
                                <span style="color: #2563eb;">Hire</span><span style="color: #1e1b4b;">1</span><span style="color: #0d9488;">Percent</span>
                            </div>
                        </td>
                    </tr>

                    <!-- Headline & Greeting -->
                    <tr>
                    <!-- Headline & Greeting -->
                    <tr>
                        <td style="padding: 12px 32px 24px 32px; text-align: center;">
                            <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #1e1b4b; line-height: 1.3; letter-spacing: -0.3px;">
                                Verify your email
                            </h1>
                            <p style="margin: 0 0 12px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                                Hello <strong style="color: #1e1b4b;">${name || 'there'}</strong>,
                            </p>
                            <p style="margin: 0 0 8px 0; font-size: 15px; color: #64748b; line-height: 1.6;">
                                Thank you for creating your Hire1Percent account.
                            </p>
                            <p style="margin: 0; font-size: 15px; color: #64748b; line-height: 1.6;">
                                Please verify your email address to activate your account.
                            </p>
                        </td>
                    </tr>

                    <!-- Bulletproof CTA Button -->
                    <tr>
                        <td style="padding: 8px 32px 28px 32px; text-align: center;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" bgcolor="#2563eb" style="border-radius: 12px; background-color: #2563eb; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.25);">
                                        <a href="${verifyUrl}" 
                                           target="_blank"
                                           style="display: inline-block; padding: 16px 48px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: #2563eb; letter-spacing: 0.5px; border: 1px solid #2563eb;">
                                            VERIFY MY EMAIL
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Expiry Notice Card -->
                    <tr>
                        <td style="padding: 0 36px 24px 36px; text-align: center;">
                            <div style="padding: 12px 20px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;">
                                <p style="margin: 0; font-size: 13px; color: #1e40af; font-weight: 500;">
                                    ⏰ This verification link expires in <strong>60 minutes</strong>.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding: 0 36px;">
                            <div style="height: 1px; background-color: #f1f5f9;"></div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 36px 36px 36px; text-align: center;">
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                                If you did not create this account, you can safely ignore this email.
                            </p>
                            <p style="margin: 0 0 4px 0; font-size: 13px; color: #475569; font-weight: 600;">
                                Thanks,<br/>Hire1Percent Team
                            </p>
                            <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
                                © ${new Date().getFullYear()} Hire1Percent — AI-Powered Talent Ecosystem
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};


// ─── Helper: Generate Token & Save to User ──────────────────────────────────
const generateAndSaveToken = async (user) => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
    await withRetry(
        () => user.save(),
        { label: `emailVerification:saveToken(${user.email})` }
    );
    
    return rawToken; // Return unhashed token for the email link
};


// ─── Helper: Send Email via SMTP or Ethereal Mailer ──────────────────────────
const sendVerificationEmailSMTP = async (toEmail, name, verifyUrl) => {
    const nodemailer = require('nodemailer');

    let transporter;
    let fromAddress;
    let isTestAccount = false;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const isGmail = process.env.SMTP_SERVICE === 'gmail' || 
                        (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail')) ||
                        (process.env.SMTP_USER && process.env.SMTP_USER.toLowerCase().endsWith('@gmail.com'));

        const transportConfig = isGmail
            ? {
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            }
            : {
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_PORT === '465' || process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            };

        transporter = nodemailer.createTransport(transportConfig);
        fromAddress = process.env.SMTP_FROM || `"Hire1Percent" <${process.env.SMTP_USER}>`;
    } else {
        // Fallback: create an Ethereal test account so emails with the button are always generated!
        try {
            console.log('[EMAIL-VERIFY] SMTP credentials not in .env — creating Ethereal test mailer for button preview...');
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            fromAddress = '"Hire1Percent Support" <verify@hire1percent.com>';
            isTestAccount = true;
        } catch (testErr) {
            console.warn('[EMAIL-VERIFY] Ethereal mailer fallback failed:', testErr.message);
            return { sent: false };
        }
    }

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject: 'Verify your email — Hire1Percent',
            text: `Hi ${name || 'there'},\n\nPlease verify your email address to activate your account.\n\n— Hire1Percent Team`,
            html: buildVerificationEmailHtml(name, verifyUrl)
        });

        let previewUrl = null;
        if (isTestAccount) {
            previewUrl = nodemailer.getTestMessageUrl(info);
            console.log(`[EMAIL-VERIFY] ✅ Test verification email dispatched.`);
        } else {
            console.log(`[EMAIL-VERIFY] ✅ Verification email dispatched.`);
        }

        return { sent: true, previewUrl };
    } catch (sendErr) {
        console.warn('[EMAIL-VERIFY] sendMail failed:', sendErr.message);
        return { sent: false, verifyUrl };
    }
};


// ─── Helper: Build verify URL ────────────────────────────────────────────────
const buildVerifyUrl = (rawToken) => {
    const frontendUrl = process.env.FRONTEND_URL || 
        (process.env.NODE_ENV === 'production' 
            ? 'https://www.hire1percent.com' 
            : 'http://localhost:5173');
    return `${frontendUrl}/verify-email?token=${rawToken}`;
};


// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/send-verification
// ═══════════════════════════════════════════════════════════════════════════════
const sendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await withRetry(
            () => User.findOne({ email: normalizedEmail }),
            { label: `sendVerification:findUser(${normalizedEmail})` }
        );

        if (!user) {
            // Don't reveal whether user exists — return generic success
            return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
        }

        if (user.emailVerified) {
            return res.json({ message: 'Email is already verified.', alreadyVerified: true });
        }

        // Rate limit: check if a token was generated recently (within 60s)
        if (user.emailVerificationExpires && user.emailVerificationExpires > new Date(Date.now() + 59 * 60 * 1000)) {
            // Token was generated less than 60 seconds ago (expires > now + 59min means < 1min old)
            return res.status(429).json({ message: 'Verification email was sent recently. Please wait before requesting another.' });
        }

        const rawToken = await generateAndSaveToken(user);
        const verifyUrl = buildVerifyUrl(rawToken);

        let emailResult = { sent: false };
        try {
            emailResult = await sendVerificationEmailSMTP(normalizedEmail, user.name, verifyUrl);
        } catch (smtpErr) {
            console.warn('[EMAIL-VERIFY] SMTP send failed:', smtpErr.message);
        }

        console.log(`[EMAIL-VERIFY] Verification token generated for ${normalizedEmail} (email sent: ${emailResult.sent})`);

        const responseData = {
            message: emailResult.sent
                ? 'Verification email with button sent! Please check your inbox.'
                : 'Verification token generated. Check your inbox or use Firebase verification.',
            emailSent: !!emailResult.sent
        };

        if (emailResult.previewUrl) {
            responseData.previewEmailUrl = emailResult.previewUrl;
        }

        res.json(responseData);
    } catch (error) {
        console.error('[EMAIL-VERIFY] sendVerification error:', error);
        res.status(500).json({ message: error.message });
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/verify-email?token=<token>
// ═══════════════════════════════════════════════════════════════════════════════
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ 
                message: 'Verification token is missing.',
                status: 'error'
            });
        }

        // Hash the incoming token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Look for user matching this token (handles both first-time and repeated clicks)
        const user = await withRetry(
            () => User.findOne({
                emailVerificationToken: hashedToken
            }),
            { label: `verifyEmail:findByToken` }
        );

        if (!user) {
            return res.status(404).json({
                message: 'This verification link is invalid. It may have already been used.',
                status: 'invalid'
            });
        }

        // Check if token expired and user was not already verified
        if (!user.emailVerified && user.emailVerificationExpires && user.emailVerificationExpires < Date.now()) {
            return res.status(410).json({
                message: 'This verification link has expired. Please request a new one.',
                status: 'expired',
                email: user.email
            });
        }

        // Mark as verified
        user.emailVerified = true;
        await withRetry(
            () => user.save(),
            { label: `verifyEmail:markVerified(${user.email})` }
        );

        console.log(`[EMAIL-VERIFY] ✅ Email successfully verified for ${user.email}`);

        res.json({
            message: 'Your email was verified successfully!',
            status: 'success',
            user: {
                email: user.email,
                name: user.name,
                role: user.role,
                uid: user.uid
            }
        });
    } catch (error) {
        console.error('[EMAIL-VERIFY] verifyEmail error:', error);
        res.status(500).json({ message: error.message, status: 'error' });
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/resend-verification
// ═══════════════════════════════════════════════════════════════════════════════
const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await withRetry(
            () => User.findOne({ email: normalizedEmail }),
            { label: `resendVerification:findUser(${normalizedEmail})` }
        );

        if (!user) {
            return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
        }

        if (user.emailVerified) {
            return res.json({ message: 'Email is already verified.', alreadyVerified: true });
        }

        // Rate limit: reject if last email was less than 60 seconds ago
        if (user.emailVerificationExpires) {
            const tokenAge = (user.emailVerificationExpires.getTime() - Date.now()) / 1000; // seconds until expiry
            const secondsSinceSent = 3600 - tokenAge; // 3600 = 60 min in seconds
            if (secondsSinceSent < 60) {
                const waitTime = Math.ceil(60 - secondsSinceSent);
                return res.status(429).json({ 
                    message: `Please wait ${waitTime} seconds before requesting another verification email.`,
                    retryAfter: waitTime
                });
            }
        }

        const rawToken = await generateAndSaveToken(user);
        const verifyUrl = buildVerifyUrl(rawToken);

        let emailResult = { sent: false };
        try {
            emailResult = await sendVerificationEmailSMTP(normalizedEmail, user.name, verifyUrl);
        } catch (smtpErr) {
            console.warn('[EMAIL-VERIFY] Resend SMTP failed:', smtpErr.message);
        }

        console.log(`[EMAIL-VERIFY] Resent verification for ${normalizedEmail} (email sent: ${emailResult.sent})`);

        const responseData = {
            message: emailResult.sent
                ? 'Verification email with button resent! Please check your inbox and spam folder.'
                : 'Verification token regenerated.',
            emailSent: !!emailResult.sent
        };

        if (emailResult.previewUrl) {
            responseData.previewEmailUrl = emailResult.previewUrl;
        }

        res.json(responseData);
    } catch (error) {
        console.error('[EMAIL-VERIFY] resendVerification error:', error);
        res.status(500).json({ message: error.message });
    }
};


// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/sync-verification
// ═══════════════════════════════════════════════════════════════════════════════
const syncVerificationStatus = async (req, res) => {
    try {
        const { email, uid } = req.body;
        if (!email && !uid) {
            return res.status(400).json({ message: 'Email or UID is required.' });
        }

        const query = email ? { email: email.toLowerCase().trim() } : { uid };
        const user = await withRetry(
            () => User.findOne(query),
            { label: 'syncVerificationStatus:findUser' }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found in database.' });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await withRetry(
            () => user.save(),
            { label: `syncVerificationStatus:saveUser(${user.email})` }
        );

        console.log(`[EMAIL-VERIFY] ✅ Verification status synced to MongoDB for ${user.email}`);

        res.json({
            message: 'Email marked as verified in database.',
            status: 'success',
            user: {
                email: user.email,
                name: user.name,
                role: user.role,
                uid: user.uid,
                emailVerified: true
            }
        });
    } catch (error) {
        console.error('[EMAIL-VERIFY] syncVerificationStatus error:', error);
        res.status(500).json({ message: error.message });
    }
};


module.exports = { sendVerification, verifyEmail, resendVerification, syncVerificationStatus };
