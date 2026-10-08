import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, 
    ArrowRight, 
    RefreshCw, 
    Loader2, 
    Mail, 
    ShieldCheck, 
    Sparkles,
    CheckCircle2,
    Globe
} from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL, CLIENT_ID, CLIENT_SECRET, auth, verifyEmailWithActionCode, reloadFirebaseUser, sendVerificationEmail } from '../firebase';

/**
 * EnvelopeWithBadge — Recreates the circular icon from the Hire1Percent design:
 * Soft periwinkle/lavender circle with an envelope (golden inner liner),
 * a centered colored badge with an icon (@, check, alert, loading), and floating particles.
 */
const EnvelopeWithBadge = ({ type = 'at', badgeColor = '#6366f1' }) => {
    return (
        <div className="relative w-28 h-28 mx-auto rounded-full bg-[#f3f0ff] flex items-center justify-center mb-6 shadow-inner">
            {/* 4 Floating dots/particles around the perimeter */}
            <motion.span 
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-2 left-3 w-2.5 h-2.5 rounded-full bg-[#6366f1]"
            />
            <motion.span 
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#818cf8]"
            />
            <motion.span 
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                className="absolute bottom-3 right-4 w-2 h-2 rounded-full bg-[#7c3aed]"
            />
            <motion.span 
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
                className="absolute bottom-5 left-3 w-1.5 h-1.5 rounded-full bg-[#a855f7]"
            />

            {/* Envelope Illustration matching golden amber style */}
            <div className="relative">
                <svg width="72" height="54" viewBox="0 0 72 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Golden envelope back */}
                    <rect x="4" y="12" width="64" height="38" rx="8" fill="#f59e0b" />
                    {/* Warm light yellow liner */}
                    <path d="M6 14 L36 34 L66 14" fill="#fef3c7" />
                    {/* Crisp white inner letter peek */}
                    <rect x="12" y="8" width="48" height="28" rx="4" fill="#ffffff" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="18" y1="15" x2="34" y2="15" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="18" y1="20" x2="46" y2="20" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Golden front flaps */}
                    <path d="M4 14 L36 34 L68 14 L68 44 A8 8 0 0 1 60 50 L12 50 A8 8 0 0 1 4 44 Z" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
                </svg>

                {/* Center Circular Badge */}
                <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white"
                    style={{ backgroundColor: badgeColor }}
                >
                    {type === 'at' && <span className="text-sm font-bold leading-none select-none">@</span>}
                    {type === 'check' && <Check className="w-5 h-5 stroke-[2.5]" />}
                    {type === 'alert' && <span className="text-base font-extrabold leading-none select-none">!</span>}
                    {type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                    {type === 'shield' && <ShieldCheck className="w-5 h-5 stroke-[2.5]" />}
                    {type === 'sparkles' && <Sparkles className="w-5 h-5 stroke-[2.5]" />}
                </div>
            </div>
        </div>
    );
};

/**
 * VerifyEmailPage — /verify-email
 * 
 * Hire1Percent Custom Firebase Action Handler:
 * - Direct email action handler for Firebase Authentication
 * - Validates mode === 'verifyEmail' and applies oobCode automatically via applyActionCode
 * - Eliminates all default Firebase-hosted intermediate screens
 * - States:
 *   STATE 1: VERIFYING ("Verifying your email...")
 *   STATE 2: SUCCESS ("Email Verified Successfully" -> [ CONTINUE TO HIRE1PERCENT ])
 *   STATE 3: INVALID/EXPIRED ("Verification Link Expired" -> [ SEND NEW VERIFICATION EMAIL ])
 *   STATE 4: ALREADY VERIFIED ("Email Already Verified" -> [ CONTINUE TO HIRE1PERCENT ])
 *   INITIAL: PENDING ("Authenticate Your Email Address" right after signup)
 */
const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL Query parameters from Firebase Custom Action URL or Backend
    const token = searchParams.get('token');
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');
    const continueUrl = searchParams.get('continueUrl');
    const emailParam = searchParams.get('email');

    // Initial state calculation: if an action code or token is present, start in 'ready_to_verify'
    const isVerificationAction = Boolean((mode === 'verifyEmail' && oobCode) || (!mode && oobCode) || token);

    // Initial status determination: check if user is already verified before showing 'ready_to_verify'
    const getInitialStatus = () => {
        if (isVerificationAction) {
            try {
                const stored = localStorage.getItem('user');
                if (stored && JSON.parse(stored).emailVerified) {
                    return 'already_verified';
                }
            } catch {}
            if (auth.currentUser?.emailVerified) {
                return 'already_verified';
            }
            return 'ready_to_verify';
        }
        return 'loading';
    };

    // Page state: 'ready_to_verify' | 'continue_step' | 'done_template' | 'verifying' | 'loading' | 'pending' | 'success' | 'already_verified' | 'expired' | 'invalid' | 'error'
    const [status, setStatus] = useState(getInitialStatus);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [verifiedEmail, setVerifiedEmail] = useState(emailParam || '');
    const [verifiedUser, setVerifiedUser] = useState(null);

    // Ref guard to prevent double execution in React StrictMode
    const hasVerifiedRef = useRef(false);

    // Resend verification state
    const [resendEmail, setResendEmail] = useState(emailParam || '');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState({ type: '', text: '' });
    const [resendCooldown, setResendCooldown] = useState(0);

    // Helper: Mark local user verified in localStorage
    const markLocalUserVerified = useCallback((email) => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (!email || !parsed.email || parsed.email.toLowerCase() === email.toLowerCase()) {
                    parsed.emailVerified = true;
                    localStorage.setItem('user', JSON.stringify(parsed));
                }
            }
        } catch (e) {
            // Local storage update non-fatal error
        }
    }, []);

    // ─── Main Verification Processor ─────────────────────────────────────────
    const executeVerification = useCallback(async (isFromButtonClick = false) => {
        if (hasVerifiedRef.current) return;

        // Validation: If mode is specified and is NOT verifyEmail, reject arbitrary mode
        if (mode && mode !== 'verifyEmail') {
            setStatus('invalid');
            setMessage('This verification link is invalid or has expired.');
            return;
        }

        // Priority 1: Firebase Action Code (?oobCode=...)
        if (oobCode) {
            hasVerifiedRef.current = true;
            if (!isFromButtonClick) {
                setStatus('verifying');
            }

            try {
                // Apply the Firebase action code directly
                const result = await verifyEmailWithActionCode(oobCode);
                const resolvedEmail = result?.email || emailParam || auth.currentUser?.email || '';

                if (resolvedEmail) {
                    markLocalUserVerified(resolvedEmail);
                    // Sync verified status to MongoDB
                    try {
                        await axios.post(`${API_URL}/auth/sync-verification`, {
                            email: resolvedEmail,
                            uid: auth.currentUser?.uid
                        }, {
                            headers: {
                                'X-Client-ID': CLIENT_ID,
                                'X-Client-Secret': CLIENT_SECRET
                            }
                        });
                    } catch (syncErr) {
                        // Backend DB sync non-fatal error
                    }
                }

                // Security: remove sensitive query parameters from browser address bar immediately
                if (typeof window !== 'undefined' && window.history?.replaceState) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }

                setVerifiedEmail(resolvedEmail);
                setVerifiedUser({
                    email: resolvedEmail,
                    name: auth.currentUser?.displayName || 'Member',
                    role: 'candidate'
                });
                setMessage('Your email address has been verified successfully.');
                setStatus('continue_step');
                return;
            } catch (error) {
                const errorCode = error?.code || '';

                // Check if account is ALREADY verified (e.g. repeated click or page refresh)
                const storedUser = localStorage.getItem('user');
                let isAlreadyVerified = false;
                let existingEmail = emailParam || '';

                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        if (parsed.emailVerified) {
                            isAlreadyVerified = true;
                            existingEmail = parsed.email || existingEmail;
                        }
                    } catch {}
                }

                if (auth.currentUser?.emailVerified) {
                    isAlreadyVerified = true;
                    existingEmail = auth.currentUser.email || existingEmail;
                }

                if (isAlreadyVerified) {
                    // STATE 4: ALREADY VERIFIED
                    if (typeof window !== 'undefined' && window.history?.replaceState) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                    setStatus('already_verified');
                    setVerifiedEmail(existingEmail);
                    setMessage('Your email address has already been verified.');
                    return;
                }

                // STATE 3: INVALID / EXPIRED
                if (errorCode === 'auth/expired-action-code') {
                    setStatus('expired');
                    setMessage('This verification link is invalid or has expired.');
                } else {
                    setStatus('invalid');
                    setMessage('This verification link is invalid or has expired.');
                }
                return;
            }
        }

        // Priority 2: Backend verification token fallback (?token=...)
        if (token) {
            hasVerifiedRef.current = true;
            if (!isFromButtonClick) {
                setStatus('verifying');
            }

            try {
                const response = await axios.get(`${API_URL}/auth/verify-email`, {
                    params: { token },
                    headers: {
                        'X-Client-ID': CLIENT_ID,
                        'X-Client-Secret': CLIENT_SECRET
                    }
                });

                if (response.data.status === 'success') {
                    const u = response.data.user;
                    const resolvedEmail = u?.email || emailParam || '';
                    if (resolvedEmail) {
                        markLocalUserVerified(resolvedEmail);
                    }
                    if (typeof window !== 'undefined' && window.history?.replaceState) {
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                    setVerifiedEmail(resolvedEmail);
                    setVerifiedUser(u);
                    setMessage('Your email address has been verified successfully.');
                    setStatus('continue_step');
                    return;
                }
            } catch (error) {
                const data = error.response?.data;
                const httpStatus = error.response?.status;

                // Check if already verified
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        if (parsed.emailVerified) {
                            setStatus('already_verified');
                            setVerifiedEmail(parsed.email || '');
                            setMessage('Your email address has already been verified.');
                            return;
                        }
                    } catch {}
                }

                if (httpStatus === 410 || data?.status === 'expired') {
                    setStatus('expired');
                    setMessage('This verification link is invalid or has expired.');
                } else {
                    setStatus('invalid');
                    setMessage('This verification link is invalid or has expired.');
                }
                return;
            }
        }

        // Priority 3: No token or oobCode in URL
        // Check if user is already verified in current session/storage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed.emailVerified) {
                    setStatus('already_verified');
                    setVerifiedEmail(parsed.email || '');
                    setMessage('Your email address has already been verified.');
                    return;
                }
            } catch {}
        }

        if (auth.currentUser?.emailVerified) {
            setStatus('already_verified');
            setVerifiedEmail(auth.currentUser.email || '');
            setMessage('Your email address has already been verified.');
            return;
        }

        // Priority 4: Initial pending state (after signup, waiting for email click)
        let currentTargetEmail = emailParam || '';
        if (!currentTargetEmail && storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                currentTargetEmail = parsed.email || '';
            } catch {}
        }
        if (currentTargetEmail) {
            setVerifiedEmail(currentTargetEmail);
            setResendEmail(currentTargetEmail);
        }
        setStatus('pending');
    }, [oobCode, mode, token, emailParam, markLocalUserVerified]);

    useEffect(() => {
        if (!isVerificationAction) {
            executeVerification(false);
        }
    }, [executeVerification, isVerificationAction]);

    // ─── Resend cooldown countdown ──────────────────────────────────────────
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // ─── Handle Resend Verification Email ───────────────────────────────────
    const handleResend = async (e) => {
        if (e) e.preventDefault();
        const targetEmail = (resendEmail || verifiedEmail || '').trim().toLowerCase();
        if (!targetEmail || resendCooldown > 0) return;

        setResendLoading(true);
        setResendMessage({ type: '', text: '' });

        try {
            // Trigger Firebase native email if user has active session
            if (auth.currentUser) {
                try {
                    await reloadFirebaseUser(auth.currentUser);
                    if (auth.currentUser.emailVerified) {
                        setStatus('already_verified');
                        setResendLoading(false);
                        return;
                    }
                    await sendVerificationEmail(auth.currentUser);
                } catch (fbErr) {
                    // Non-fatal, proceed with backend resend
                }
            }

            // Also call backend resend
            const response = await axios.post(`${API_URL}/auth/resend-verification`, 
                { email: targetEmail },
                {
                    headers: {
                        'X-Client-ID': CLIENT_ID,
                        'X-Client-Secret': CLIENT_SECRET
                    }
                }
            );

            if (response.data.alreadyVerified) {
                setStatus('already_verified');
                setResendMessage({ 
                    type: 'success', 
                    text: 'Your email is already verified! You can proceed to log in directly.' 
                });
            } else {
                setResendMessage({ 
                    type: 'success', 
                    text: response.data.message || `Verification email sent to ${targetEmail}!` 
                });
                setResendCooldown(60);
            }
        } catch (error) {
            const data = error.response?.data;
            if (error.response?.status === 429) {
                const wait = data?.retryAfter || 60;
                setResendCooldown(wait);
                setResendMessage({ 
                    type: 'warning', 
                    text: data?.message || `Please wait ${wait}s before requesting another email.` 
                });
            } else {
                setResendMessage({ 
                    type: 'error', 
                    text: data?.message || 'Failed to resend verification email. Please try again.' 
                });
            }
        } finally {
            setResendLoading(false);
        }
    };

    // ─── Actions for Multi-Step Verification Flow ────────────────────────────
    const handleCompleteVerification = async () => {
        if (actionLoading) return;
        setActionLoading(true);
        try {
            await executeVerification(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleContinueToDone = () => {
        setStatus('done_template');
    };

    // ─── Continue to Hire1Percent Destination / Website Navigation ──────────
    const handleNavigateWebsite = () => {
        // 1. Safe internal continueUrl check
        if (continueUrl && continueUrl.startsWith('/') && !continueUrl.startsWith('//')) {
            navigate(continueUrl, { replace: true });
            return;
        }

        // 2. Active session check
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                const path = (user.role === 'recruiter' || user.role === 'admin')
                    ? '/recruiter/my-jobs'
                    : '/candidate';
                navigate(path, { replace: true });
                return;
            } catch {}
        }

        // 3. Fallback: navigate directly to website root
        navigate('/', { replace: true });
    };

    const handleContinue = handleNavigateWebsite;

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 1: COMPLETE VERIFICATION ("Complete Verification")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderCompleteVerificationTemplate = () => {
        const displayEmail = emailParam || verifiedEmail || auth.currentUser?.email || '';

        return (
            <motion.div
                key="ready_to_verify"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Shield Badge */}
                <EnvelopeWithBadge type="shield" badgeColor="#2563eb" />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    Complete Verification
                </h1>

                {/* Subtitle / Description */}
                <p className="text-gray-500 text-sm sm:text-[14.5px] leading-relaxed mb-5 max-w-xs sm:max-w-sm">
                    Click the button below to verify your email address and activate your Hire1Percent account.
                </p>

                {/* Email Address Pill Badge */}
                {displayEmail && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/70 text-blue-800 text-xs font-semibold mb-6 shadow-xs max-w-full">
                        <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate max-w-[240px] sm:max-w-[280px]">{displayEmail}</span>
                    </div>
                )}

                {/* Primary Action Button */}
                <button
                    onClick={handleCompleteVerification}
                    disabled={actionLoading}
                    className="w-full sm:w-auto min-w-[250px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] mb-5 cursor-pointer uppercase flex items-center justify-center gap-2"
                >
                    {actionLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>COMPLETE VERIFICATION</span>
                        </>
                    )}
                </button>

                {/* Footer Subtext */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <span>Having trouble?</span>
                    <Link
                        to="/contact"
                        className="font-semibold underline text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
                    >
                        Contact Support &rarr;
                    </Link>
                </p>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 2: CONTINUE ("Continue")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderContinueTemplate = () => {
        return (
            <motion.div
                key="continue_step"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Checkmark Badge */}
                <EnvelopeWithBadge type="check" badgeColor="#10b981" />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    Verification Confirmed
                </h1>

                {/* Subtitle / Description */}
                <p className="text-gray-500 text-sm sm:text-[14.5px] leading-relaxed mb-6 max-w-xs sm:max-w-sm">
                    Your email address has been successfully confirmed. Click continue to proceed.
                </p>

                {/* Primary Action Button */}
                <button
                    onClick={handleContinueToDone}
                    className="w-full sm:w-auto min-w-[250px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] mb-5 cursor-pointer uppercase flex items-center justify-center gap-2 group"
                >
                    <span>CONTINUE</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                {/* Footer Subtext */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <span>Almost done!</span>
                    <button
                        onClick={handleContinueToDone}
                        className="font-semibold underline text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
                    >
                        Click continue &rarr;
                    </button>
                </p>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 3: DONE TEMPLATE ("Your email verification is done")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderDoneTemplate = () => {
        const displayEmail = verifiedEmail || emailParam || auth.currentUser?.email || 'your account';

        return (
            <motion.div
                key="done_template"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Check Badge */}
                <EnvelopeWithBadge type="check" badgeColor="#10b981" />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    Your email verification is done
                </h1>

                {/* Subtitle / Description */}
                <p className="text-gray-500 text-sm sm:text-[14.5px] leading-relaxed mb-5 max-w-xs sm:max-w-sm">
                    Your email verification has been completed successfully. Your account is active and ready to use.
                </p>

                {/* Status Card Pill */}
                <div className="w-full bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5 mb-6 text-center shadow-xs">
                    <div className="flex items-center justify-center gap-2 text-emerald-800 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Verification Status: Completed</span>
                    </div>
                    {displayEmail && (
                        <p className="text-[11.5px] text-emerald-700/80 mt-1 truncate max-w-full font-medium">
                            {displayEmail}
                        </p>
                    )}
                </div>

                {/* Primary Action Button: Update email (navigates to website) */}
                <button
                    onClick={handleNavigateWebsite}
                    className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] mb-3 cursor-pointer uppercase flex items-center justify-center gap-2"
                >
                    <span>Update email</span>
                </button>

                {/* Secondary Website Link */}
                <button
                    onClick={handleNavigateWebsite}
                    className="font-semibold underline text-xs text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer flex items-center justify-center gap-1 mb-2"
                >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Go to Website &rarr;</span>
                </button>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE 1: VERIFYING ("Verifying your email...")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderVerifyingTemplate = () => (
        <motion.div
            key="verifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-4"
        >
            <EnvelopeWithBadge type="loading" badgeColor="#2563eb" />

            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#312E81] mb-2 tracking-tight">
                Verifying your email...
            </h1>

            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
                Please wait a moment while we verify your email address.
            </p>

            {/* Glowing progress line */}
            <div className="w-full max-w-xs h-1.5 bg-gray-100 rounded-full overflow-hidden relative">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-full"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: '60%' }}
                />
            </div>
        </motion.div>
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE 2: SUCCESS ("Email Verified Successfully")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderSuccessTemplate = () => {
        return (
            <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Checkmark Badge */}
                <EnvelopeWithBadge type="check" badgeColor="#10b981" />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    Email Verified Successfully
                </h1>

                {/* Subtitle / Description */}
                <p className="text-gray-500 text-sm sm:text-[14.5px] leading-relaxed mb-6 max-w-xs sm:max-w-sm">
                    Your email address has been verified successfully.
                </p>

                {/* Primary Action Button */}
                <button
                    onClick={handleContinue}
                    className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] mb-5 cursor-pointer uppercase"
                >
                    CONTINUE TO HIRE1PERCENT
                </button>

                {/* Footer Subtext */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <span>Ready to proceed?</span>
                    <button
                        onClick={handleContinue}
                        className="font-semibold underline text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
                    >
                        Continue to platform &rarr;
                    </button>
                </p>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE 4: ALREADY VERIFIED ("Email Already Verified")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderAlreadyVerifiedTemplate = () => {
        return (
            <motion.div
                key="already_verified"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Checkmark Badge */}
                <EnvelopeWithBadge type="check" badgeColor="#10b981" />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    Email Already Verified
                </h1>

                {/* Subtitle / Description */}
                <p className="text-gray-500 text-sm sm:text-[14.5px] leading-relaxed mb-6 max-w-xs sm:max-w-sm">
                    Your email address has already been verified.
                </p>

                {/* Primary Action Button */}
                <button
                    onClick={handleContinue}
                    className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] mb-5 cursor-pointer uppercase"
                >
                    CONTINUE TO HIRE1PERCENT
                </button>

                {/* Footer Subtext */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <span>Account is active.</span>
                    <button
                        onClick={handleContinue}
                        className="font-semibold underline text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
                    >
                        Continue to platform &rarr;
                    </button>
                </p>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE 3: INVALID / EXPIRED ("Verification Link Expired")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderInvalidExpiredTemplate = () => {
        return (
            <motion.div
                key="expired"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Alert Badge */}
                <EnvelopeWithBadge type="alert" badgeColor="#f59e0b" />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    Verification Link Expired
                </h1>

                {/* Subtitle */}
                <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-sm">
                    {message || "This verification link is invalid or has expired."}
                </p>

                {/* Resend Form Box */}
                <div className="w-full bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 mb-5 text-left">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Email Address
                    </label>

                    <form onSubmit={handleResend} className="space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                value={resendEmail}
                                onChange={(e) => setResendEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-900 transition-all placeholder-gray-400"
                            />
                        </div>

                        {/* Status Message */}
                        {resendMessage.text && (
                            <div className={`p-2.5 rounded-xl text-xs border ${
                                resendMessage.type === 'success'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : resendMessage.type === 'warning'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                                {resendMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={resendLoading || resendCooldown > 0 || !resendEmail}
                            className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                                resendLoading || resendCooldown > 0 || !resendEmail
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-blue-500/20 active:scale-[0.98]'
                            }`}
                        >
                            {resendLoading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : resendCooldown > 0 ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Resend in {resendCooldown}s</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>SEND NEW VERIFICATION EMAIL</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Subtext */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mb-4">
                    <span>Need a new link?</span>
                    <button
                        onClick={handleResend}
                        disabled={resendLoading || resendCooldown > 0}
                        className="font-semibold underline text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
                    >
                        Send it once more.
                    </button>
                </p>

                {/* Navigation Options */}
                <div className="flex items-center justify-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100 w-full">
                    <Link to="/login" className="hover:text-blue-600 transition-colors">
                        Back to Login
                    </Link>
                    <span>•</span>
                    <Link to="/" className="hover:text-blue-600 transition-colors">
                        Homepage
                    </Link>
                    <span>•</span>
                    <Link to="/contact" className="hover:text-blue-600 transition-colors">
                        Need Help?
                    </Link>
                </div>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIAL PENDING: POST-SIGNUP ("Authenticate Your Email Address")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderPendingTemplate = () => {
        const displayEmail = verifiedEmail || 'your email';

        return (
            <motion.div
                key="pending"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with @ Badge Icon + Floating Dots */}
                <EnvelopeWithBadge type="at" badgeColor="#6366f1" />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#312E81] mb-2.5 tracking-tight">
                    Authenticate Your Email Address
                </h1>

                {/* Subtitle / Email Address */}
                <p className="text-gray-500 text-sm sm:text-[15px] leading-relaxed mb-6 max-w-sm">
                    An email has been sent to{' '}
                    <span className="font-semibold underline text-gray-800 break-all">
                        {displayEmail}
                    </span>
                    . Please check your inbox to verify your account.
                </p>

                {/* Resend Status Feedback Alert */}
                {resendMessage.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`w-full mb-4 p-3 rounded-xl text-xs border ${
                            resendMessage.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : resendMessage.type === 'warning'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                    >
                        {resendMessage.text}
                    </motion.div>
                )}

                {/* Primary Action Button */}
                <button
                    onClick={() => navigate('/signup')}
                    className="w-auto min-w-[160px] px-8 py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] mb-5 cursor-pointer"
                >
                    Update email
                </button>

                {/* Footer Subtext with "Send it once more." link */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <span>Email not received?</span>
                    <button
                        onClick={handleResend}
                        disabled={resendLoading || resendCooldown > 0}
                        className={`font-semibold underline transition-colors cursor-pointer ${
                            resendCooldown > 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-[#2563eb] hover:text-[#1d4ed8]'
                        }`}
                    >
                        {resendLoading ? 'Sending...' : resendCooldown > 0 ? `Wait (${resendCooldown}s)` : 'Send it once more.'}
                    </button>
                </p>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN PAGE SHELL (Cloudy Lavender Sky Backdrop + Center Card)
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-[#b49fe8] via-[#9d84e0] to-[#8062cf]">
            {/* Ethereal Lavender / Purple Cloud Sky Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-20 left-10 w-[500px] h-[400px] bg-white/45 rounded-full blur-[70px]" />
                <div className="absolute top-1/4 -left-20 w-[600px] h-[500px] bg-[#ede9fe]/60 rounded-full blur-[80px]" />
                <div className="absolute top-10 right-0 w-[550px] h-[450px] bg-[#c4b5fd]/55 rounded-full blur-[75px]" />
                <div className="absolute bottom-10 -right-20 w-[650px] h-[550px] bg-[#6d28d9]/50 rounded-full blur-[90px]" />
                <div className="absolute -bottom-20 left-1/4 w-[600px] h-[450px] bg-[#f5f3ff]/50 rounded-full blur-[70px]" />
                <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-[#5b21b6]/35 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[400px] bg-[#4c1d95]/30 rounded-full blur-[90px]" />
                <div className="absolute top-10 left-1/3 w-[700px] h-[350px] bg-white/30 rounded-full blur-[90px]" />
                <div className="absolute bottom-10 left-10 w-[600px] h-[300px] bg-[#c4b5fd]/40 rounded-full blur-[80px]" />
            </div>

            {/* Top Brand Logo */}
            <div className="mb-6 relative z-10">
                <Link to="/" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/90 shadow-sm hover:bg-white transition-all">
                    <span className="text-sm font-extrabold tracking-tight">
                        <span className="text-blue-600">Hire</span><span className="text-gray-900">1</span><span className="text-teal-600">Percent</span>
                    </span>
                </Link>
            </div>

            {/* Center White Card */}
            <main className="w-full max-w-[440px] bg-white rounded-[2.2rem] sm:rounded-[2.6rem] shadow-[0_25px_70px_-15px_rgba(79,70,229,0.22)] border border-purple-100/90 p-8 sm:p-10 text-center relative z-10 transition-all">
                <AnimatePresence mode="wait">
                    {status === 'ready_to_verify' && renderCompleteVerificationTemplate()}
                    {status === 'continue_step' && renderContinueTemplate()}
                    {status === 'done_template' && renderDoneTemplate()}
                    {status === 'verifying' && renderVerifyingTemplate()}
                    {status === 'loading' && renderVerifyingTemplate()}
                    {status === 'pending' && renderPendingTemplate()}
                    {status === 'success' && renderSuccessTemplate()}
                    {status === 'already_verified' && renderAlreadyVerifiedTemplate()}
                    {(status === 'expired' || status === 'invalid' || status === 'error') && renderInvalidExpiredTemplate()}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default VerifyEmailPage;
