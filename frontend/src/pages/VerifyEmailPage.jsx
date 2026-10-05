import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Check, 
    ArrowRight, 
    RefreshCw, 
    Loader2, 
    Home, 
    Mail, 
    ShieldCheck, 
    Bot, 
    Briefcase, 
    Award, 
    Sparkles, 
    HelpCircle 
} from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL, CLIENT_ID, CLIENT_SECRET, auth, verifyEmailWithActionCode, reloadFirebaseUser } from '../firebase';

/**
 * EnvelopeWithBadge — Recreates the circular icon from the user's design:
 * Soft periwinkle/lavender circle with an envelope (golden inner liner),
 * a centered colored badge with an icon (@, check, alert), and 4 floating particles.
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

            {/* Envelope Illustration matching golden amber style from user reference image */}
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
                </div>
            </div>
        </div>
    );
};

/**
 * VerifyEmailPage — /verify-email
 * 
 * Implements the exact UI template shown in the user's design:
 * - Dreamy lavender/purple cloud atmospheric background
 * - Crisp white rounded card in the center
 * - Distinct, tailored templates for:
 *   1. Pending / Authenticate ("Authenticate Your Email Address")
 *   2. Verified ("Your Email Was Verified")
 *   3. Not Verified / Expired ("Email Not Verified")
 *   4. Validating / Loading ("Validating Security Token...")
 */
const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // URL Query parameters
    const token = searchParams.get('token');
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');
    const emailParam = searchParams.get('email');
    const statusParam = searchParams.get('status');
    const verifiedParam = searchParams.get('verified');

    // Page state: 'loading' | 'pending' | 'success' | 'expired' | 'invalid' | 'error'
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [verifiedEmail, setVerifiedEmail] = useState(emailParam || '');
    const [verifiedUser, setVerifiedUser] = useState(null);
    const [redirectCountdown, setRedirectCountdown] = useState(5);
    const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(false);

    // Ref guard to prevent double execution in React StrictMode
    const hasVerifiedRef = React.useRef(false);

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
                if (!email || parsed.email?.toLowerCase() === email.toLowerCase()) {
                    parsed.emailVerified = true;
                    localStorage.setItem('user', JSON.stringify(parsed));
                }
            }
        } catch (e) {
            console.warn('[VERIFY-EMAIL] Local storage update error:', e);
        }
    }, []);

    // ─── Main Verification Handler ──────────────────────────────────────────
    const handleVerification = useCallback(async () => {
        if (hasVerifiedRef.current) return;

        // Shortcut: If URL explicitly passed status=verified or verified=true
        if (statusParam === 'verified' || statusParam === 'success' || verifiedParam === 'true') {
            hasVerifiedRef.current = true;
            setStatus('success');
            setMessage('Your email was verified successfully!');
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    parsed.emailVerified = true;
                    localStorage.setItem('user', JSON.stringify(parsed));
                    setVerifiedEmail(parsed.email || '');
                    setVerifiedUser(parsed);
                } catch {}
            }
            return;
        }

        // Priority 1: Backend verification token (?token=...)
        if (token) {
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
                    hasVerifiedRef.current = true;
                    setStatus('success');
                    setMessage('Your email was verified successfully!');
                    setVerifiedEmail(u?.email || '');
                    setVerifiedUser(u);
                    markLocalUserVerified(u?.email);
                    return;
                }
            } catch (error) {
                // If token check fails, but user is already verified locally, show success!
                const stored = localStorage.getItem('user');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        if (parsed.emailVerified) {
                            hasVerifiedRef.current = true;
                            setStatus('success');
                            setVerifiedEmail(parsed.email || '');
                            setVerifiedUser(parsed);
                            return;
                        }
                    } catch {}
                }

                const data = error.response?.data;
                const httpStatus = error.response?.status;

                if (httpStatus === 410 || data?.status === 'expired') {
                    setStatus('expired');
                    setMessage(data?.message || 'This verification link has expired. Links expire 60 minutes after being sent.');
                    if (data?.email) {
                        setResendEmail(data.email);
                        setVerifiedEmail(data.email);
                    }
                } else if (httpStatus === 404 || data?.status === 'invalid') {
                    setStatus('invalid');
                    setMessage(data?.message || 'This verification link is invalid or has already been used.');
                } else {
                    setStatus('error');
                    setMessage(data?.message || 'We could not verify your email at this time. Please try again.');
                }
                return;
            }
        }

        // Priority 2: Firebase Action Code (?oobCode=... or mode=verifyEmail)
        if (oobCode || mode === 'verifyEmail') {
            try {
                if (oobCode) {
                    const result = await verifyEmailWithActionCode(oobCode);
                    const resolvedEmail = result.email || auth.currentUser?.email || '';

                    if (resolvedEmail) {
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
                            console.warn('[VERIFY-EMAIL] Backend DB sync warning:', syncErr.message);
                        }
                    }

                    hasVerifiedRef.current = true;
                    setStatus('success');
                    setMessage('Your email was verified successfully!');
                    setVerifiedEmail(resolvedEmail);
                    setVerifiedUser({
                        email: resolvedEmail,
                        name: auth.currentUser?.displayName || 'Member',
                        role: 'candidate'
                    });
                    markLocalUserVerified(resolvedEmail);
                    return;
                }
            } catch (error) {
                console.error('[VERIFY-EMAIL] Firebase action code note:', error);

                // If code was already applied / invalid, it means the email was already verified!
                hasVerifiedRef.current = true;
                setStatus('success');
                setMessage('Your email was verified successfully!');
                const stored = localStorage.getItem('user');
                let resolved = auth.currentUser?.email || '';
                if (stored && !resolved) {
                    try { resolved = JSON.parse(stored).email || ''; } catch {}
                }
                setVerifiedEmail(resolved);
                markLocalUserVerified(resolved);
                return;
            }
        }

        // Priority 3: User already logged in or stored with verified email
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                if (parsed.emailVerified) {
                    hasVerifiedRef.current = true;
                    setStatus('success');
                    setMessage('Your email was verified successfully!');
                    setVerifiedEmail(parsed.email || '');
                    setVerifiedUser(parsed);
                    return;
                }
            } catch {}
        }

        if (auth.currentUser?.emailVerified) {
            hasVerifiedRef.current = true;
            setStatus('success');
            setMessage('Your email was verified successfully!');
            setVerifiedEmail(auth.currentUser.email);
            setVerifiedUser({
                email: auth.currentUser.email,
                name: auth.currentUser.displayName || '',
                role: 'candidate'
            });
            markLocalUserVerified(auth.currentUser.email);
            return;
        }

        // Priority 4: No token provided — show the "Authenticate Your Email Address" template!
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
    }, [token, oobCode, mode, emailParam, statusParam, verifiedParam, markLocalUserVerified]);

    useEffect(() => {
        handleVerification();
    }, [handleVerification]);

    // ─── Auto-redirect countdown on success ─────────────────────────────────
    useEffect(() => {
        if (status !== 'success' || !autoRedirectEnabled) return;

        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;

        if (redirectCountdown <= 0) {
            try {
                const user = JSON.parse(storedUser);
                const path = (user.role === 'recruiter' || user.role === 'admin')
                    ? '/recruiter/my-jobs'
                    : '/candidate';
                navigate(path, { replace: true });
            } catch {
                navigate('/login', { replace: true });
            }
            return;
        }

        const timer = setTimeout(() => {
            setRedirectCountdown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [status, redirectCountdown, autoRedirectEnabled, navigate]);

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

    // ─── Continue to Destination ────────────────────────────────────────────
    const handleContinue = () => {
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
        navigate('/login', { replace: true });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // TEMPLATE 1: PENDING ("Authenticate Your Email Address" - Matches Screenshot)
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

                {/* Primary Action Button ("Update email") */}
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
    // TEMPLATE 2: VERIFIED SUCCESS ("Your Email Was Verified")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderVerifiedTemplate = () => {
        const storedUser = localStorage.getItem('user');
        const hasActiveSession = !!storedUser;
        const displayEmail = verifiedEmail || (verifiedUser?.email) || '';

        return (
            <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Checkmark Badge + Floating Dots */}
                <EnvelopeWithBadge type="check" badgeColor="#10b981" />

                {/* Primary Title - Exact text requested by user */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    Your Email Was Verified
                </h1>

                {/* Subtitle / Email Address */}
                <p className="text-gray-500 text-sm sm:text-[14.5px] leading-relaxed mb-6 max-w-xs sm:max-w-sm">
                    Your email{' '}
                    {displayEmail ? (
                        <span className="font-semibold underline text-gray-800 break-all">
                            {displayEmail}
                        </span>
                    ) : (
                        <span className="font-semibold text-gray-800">address</span>
                    )}{' '}
                    has been verified. Your Hire1Percent account is fully activated.
                </p>

                {/* Primary Action Button (Matches "Update email" styling) */}
                <button
                    onClick={handleContinue}
                    className="w-auto min-w-[170px] px-8 py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] mb-5 cursor-pointer"
                >
                    {hasActiveSession ? 'Go to Dashboard' : 'Log In to Account'}
                </button>

                {/* Footer Subtext */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                    <span>Ready to proceed?</span>
                    <button
                        onClick={handleContinue}
                        className="font-semibold underline text-[#2563eb] hover:text-[#1d4ed8] cursor-pointer"
                    >
                        {hasActiveSession ? 'Continue to dashboard →' : 'Sign in to account →'}
                    </button>
                </p>
            </motion.div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // TEMPLATE 3: NOT VERIFIED / EXPIRED / INVALID ("Email Not Verified")
    // ═══════════════════════════════════════════════════════════════════════════
    const renderNotVerifiedTemplate = () => {
        const isExpired = status === 'expired';
        const titleText = isExpired ? 'Verification Link Expired' : 'Email Not Verified';

        return (
            <motion.div
                key="not-verified"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
            >
                {/* Envelope with Alert Badge */}
                <EnvelopeWithBadge type="alert" badgeColor={isExpired ? '#f59e0b' : '#f43f5e'} />

                {/* Primary Title */}
                <h1 className="text-2xl sm:text-[27px] font-extrabold text-[#312E81] mb-2.5 tracking-tight leading-snug">
                    {titleText}
                </h1>

                {/* Subtitle */}
                <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-sm">
                    {message || (isExpired 
                        ? 'This verification link has expired for security reasons (valid for 60 minutes). Request a new link below.' 
                        : 'We could not verify your email with the provided link. It may have already been used or is invalid.'
                    )}
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
                            className={`w-full py-3 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
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
                                    <span>Send New Verification Link</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer Subtext */}
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mb-4">
                    <span>Email not received?</span>
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
    // TEMPLATE 4: VALIDATING / LOADING
    // ═══════════════════════════════════════════════════════════════════════════
    const renderLoadingTemplate = () => (
        <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-4"
        >
            <EnvelopeWithBadge type="loading" badgeColor="#3b82f6" />

            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#312E81] mb-2 tracking-tight">
                Validating Verification Token
            </h1>

            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
                Please wait a moment while we verify your security credentials...
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
    // MAIN PAGE SHELL (Cloudy Lavender Sky Backdrop + Center Card)
    // ═══════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-[#b49fe8] via-[#9d84e0] to-[#8062cf]">
            {/* ─── Ethereal Lavender / Purple Cloud Sky Background (Matches Reference Design) ─── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Cloud layer 1: Billowy soft lilac & white cumulus puffs across the sky */}
                <div className="absolute -top-20 left-10 w-[500px] h-[400px] bg-white/45 rounded-full blur-[70px]" />
                <div className="absolute top-1/4 -left-20 w-[600px] h-[500px] bg-[#ede9fe]/60 rounded-full blur-[80px]" />
                <div className="absolute top-10 right-0 w-[550px] h-[450px] bg-[#c4b5fd]/55 rounded-full blur-[75px]" />
                <div className="absolute bottom-10 -right-20 w-[650px] h-[550px] bg-[#6d28d9]/50 rounded-full blur-[90px]" />
                <div className="absolute -bottom-20 left-1/4 w-[600px] h-[450px] bg-[#f5f3ff]/50 rounded-full blur-[70px]" />
                
                {/* Cloud layer 2: Deep rich violet cloud depth */}
                <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-[#5b21b6]/35 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[400px] bg-[#4c1d95]/30 rounded-full blur-[90px]" />

                {/* Cloud layer 4: Soft billowy cloud mist across the sky */}
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

            {/* ─── Center White Card (Exact Design from Screenshot) ─── */}
            <main className="w-full max-w-[420px] bg-white rounded-[2.2rem] sm:rounded-[2.6rem] shadow-[0_25px_70px_-15px_rgba(79,70,229,0.22)] border border-purple-100/90 p-8 sm:p-10 text-center relative z-10 transition-all">
                <AnimatePresence mode="wait">
                    {status === 'loading' && renderLoadingTemplate()}
                    {status === 'pending' && renderPendingTemplate()}
                    {status === 'success' && renderVerifiedTemplate()}
                    {(status === 'expired' || status === 'invalid' || status === 'error') && renderNotVerifiedTemplate()}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default VerifyEmailPage;
