import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Users, Mail, Lock, CheckCircle, ArrowLeft, Globe, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { loginWithEmail, getUserProfile, signInWithGoogle, signInWithGoogleRedirect, getGoogleRedirectResult, saveUserProfile, API_URL, signupWithEmail, resetPasswordWithFirebase, CLIENT_ID, CLIENT_SECRET, sendVerificationEmail, reloadFirebaseUser, auth } from '../firebase';
import apiClient from '../utils/apiClient';
import SEO from '../components/SEO';
import { trackEvent } from '../utils/analytics';

// Retry wrapper for critical operations
const withRetry = async (fn, maxAttempts = 3, label = 'operation') => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                const delay = Math.min(300 * Math.pow(2, attempt - 1), 5000);
                console.warn(`[LOGIN-RETRY] ${label} failed (attempt ${attempt}/${maxAttempts}): ${error.message}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [role, setRole] = useState(() => {
        const params = new URLSearchParams(location.search);
        const roleParam = params.get('role');
        if (roleParam === 'recruiter' || roleParam === 'candidate' || roleParam === 'admin') {
            return roleParam;
        }
        if (params.get('expired') === 'true' || location.state?.pilotExpired || location.state?.sessionExpired) {
            return 'recruiter';
        }
        
        const fromPath = location.state?.from?.pathname || '';
        if (fromPath.startsWith('/candidate')) return 'candidate';
        if (fromPath.startsWith('/recruiter')) return 'recruiter';
        return null;
    }); // 'recruiter', 'candidate', or 'admin'
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(() => {
        const params = new URLSearchParams(location.search);
        if (location.state?.message) {
            return { type: 'error', text: location.state.message };
        }
        const sessionMsg = sessionStorage.getItem('login_notice_msg');
        if (sessionMsg) {
            sessionStorage.removeItem('login_notice_msg');
            return { type: 'error', text: sessionMsg };
        }
        if (params.get('expired') === 'true') {
            return { type: 'error', text: 'Your session has expired.' };
        }
        return { type: '', text: '' };
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const sessionMsg = sessionStorage.getItem('login_notice_msg');
        if (location.state?.message) {
            setMessage({ type: 'error', text: location.state.message });
            if (location.state?.pilotExpired || location.state?.sessionExpired) setRole('recruiter');
        } else if (sessionMsg) {
            sessionStorage.removeItem('login_notice_msg');
            setMessage({ type: 'error', text: sessionMsg });
            setRole('recruiter');
        } else if (params.get('expired') === 'true') {
            setMessage({ type: 'error', text: 'Your session has expired.' });
            setRole('recruiter');
        }
    }, [location.search, location.state]);

    // Email verification state (disabled for login - email verification is signup only)
    const [verificationRequired, setVerificationRequired] = useState(null);
    const [checkingVerification, setCheckingVerification] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [verificationNotice, setVerificationNotice] = useState({ type: '', text: '' });

    // Resend cooldown timer countdown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Forgot Password States
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStep, setForgotStep] = useState(1);
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' });
    const [devOtpText, setDevOtpText] = useState('');

    // Handle Redirect Result (for when Popup fails)
    React.useEffect(() => {
        const checkRedirect = async () => {
            try {
                const googleUserLink = await getGoogleRedirectResult();
                if (googleUserLink && googleUserLink.user) {
                    const savedRole = sessionStorage.getItem('pendingRole');

                    if (savedRole) {
                        setRole(savedRole); // Restore role
                        await processGoogleUser(googleUserLink.user, savedRole);
                        sessionStorage.removeItem('pendingRole');
                    } else {
                        setMessage({ type: 'warning', text: "Login verified, but role was lost. Please select Recruiter or Candidate." });
                    }
                }
            } catch (err) {
                console.error("[AUTH-REDIRECT] Error:", err);
                setMessage({ type: 'error', text: `Login failed: ${err.message}` });
            }
        };
        checkRedirect();
    }, []);

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setMessage({ type: '', text: '' });
    };

    const handleBack = () => {
        setRole(null);
        setFormData({ email: '', password: '' });
        setMessage({ type: '', text: '' });
        sessionStorage.removeItem('pendingRole'); // Clean up
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleForgotPasswordClick = () => {
        setForgotPasswordMode(true);
        setForgotStep(1);
        setForgotEmail(formData.email);
        setForgotMessage({ type: '', text: '' });
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setDevOtpText('');
    };

    const handleForgotRequestSubmit = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMessage({ type: '', text: '' });
        setDevOtpText('');

        try {
            const response = await axios.post(`${API_URL}/forgot-password`, {
                email: forgotEmail,
                role: role
            });
            
            if (response.data.devOtp) {
                setDevOtpText(response.data.devOtp);
            }
            
            setForgotMessage({ type: 'success', text: response.data.message || "Verification code sent to your email." });
            setForgotStep(2);
            
        } catch (error) {
            console.error("[FORGOT-PASSWORD-ERROR]", error);
            let errMsg = "Failed to send reset code. Please ensure the email is correct.";
            if (error.response?.data?.message) {
                errMsg = error.response.data.message;
            } else if (error.message) {
                errMsg = error.message;
            }
            setForgotMessage({ type: 'error', text: errMsg });
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setForgotMessage({ type: 'error', text: "Passwords do not match." });
            return;
        }

        setForgotLoading(true);
        setForgotMessage({ type: '', text: '' });

        try {
            // Step 3: Verify OTP first
            await axios.post(`${API_URL}/verify-otp`, {
                email: forgotEmail,
                otp
            });

            // Step 4: Reset password
            const response = await axios.post(`${API_URL}/reset-password`, {
                email: forgotEmail,
                role: role,
                newPassword
            });
            
            setForgotMessage({ type: 'success', text: response.data.message || "Password reset successfully!" });
            
            // Wait 2 seconds, then return to login
            setTimeout(() => {
                setForgotPasswordMode(false);
                setFormData({ email: forgotEmail, password: '' });
                setForgotMessage({ type: '', text: '' });
                setDevOtpText('');
            }, 2000);
            
        } catch (error) {
            console.error("[RESET-PASSWORD-ERROR]", error);
            let errMsg = "Failed to reset password. The code might be expired or incorrect.";
            if (error.response?.data?.message) {
                errMsg = error.response.data.message;
            } else if (error.message) {
                errMsg = error.message;
            }
            setForgotMessage({ type: 'error', text: errMsg });
        } finally {
            setForgotLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let profile;

            if (role === 'admin') {
                // 1. Backend Login for Admin (No Firebase)
                const response = await axios.post(`${API_URL}/login`, {
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password,
                    role: 'admin'
                }, {
                    headers: {
                        'X-Client-ID': CLIENT_ID,
                        'X-Client-Secret': CLIENT_SECRET
                    }
                });

                profile = response.data.user;
                if (!profile) throw new Error("Invalid response from server.");
            } else {
                const normalizedEmail = formData.email.toLowerCase().trim();
                let user;
                let backendUser = null;
                try {
                    // 1. Firebase Auth Login for others
                    const userCredential = await loginWithEmail(normalizedEmail, formData.password);
                    user = userCredential.user;
                } catch (error) {
                    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                        // MIGRATION FLOW: Try backend login to check old hashed passwords
                        try {
                            const backendRes = await axios.post(`${API_URL}/login`, {
                                email: normalizedEmail,
                                password: formData.password,
                                role: role
                            }, {
                                headers: {
                                    'X-Client-ID': CLIENT_ID,
                                    'X-Client-Secret': CLIENT_SECRET
                                }
                            });
                            
                            if (backendRes.data && backendRes.data.user) {
                                backendUser = backendRes.data.user; 
                                // Password matched in backend! 
                                // Try to silently create the Firebase account to migrate them
                                try {
                                    const newFbUser = await signupWithEmail(normalizedEmail, formData.password);
                                    user = newFbUser.user;
                                    
                                    // Sync new UID to MongoDB to link the old profile
                                    await withRetry(async () => {
                                        await apiClient.post('/users/sync', {
                                            uid: user.uid,
                                            email: normalizedEmail,
                                            role: role
                                        });
                                    }, 3, 'migrationSync');
                                } catch (signupErr) {
                                    if (signupErr.code === 'auth/email-already-in-use') {
                                        console.log("Firebase user exists, bypassing Firebase login and using backend session.");
                                        user = backendRes.data.user; 
                                    } else {
                                        throw signupErr;
                                    }
                                }
                            } else {
                                throw error;
                            }
                        } catch (backendError) {
                            if (backendError.response?.data?.message) {
                                throw new Error(backendError.response.data.message);
                            }
                            throw error;
                        }
                    } else {
                        throw error;
                    }
                }

                // Fetch Profile and initialize Gateway Session in parallel
                const [fetchedProfile] = await Promise.all([
                    withRetry(() => getUserProfile(normalizedEmail), 3, 'getProfile').catch(() => null),
                    withRetry(() => apiClient.initializeGatewaySession(normalizedEmail, user.uid), 3, 'gatewaySession').catch(err => {
                        console.warn('[LOGIN] Gateway session init failed (non-fatal):', err.message);
                    }),
                    withRetry(async () => {
                        await apiClient.post('/users/sync', {
                            uid: user.uid,
                            email: user.email || normalizedEmail,
                            name: user.displayName || normalizedEmail.split('@')[0],
                            role: role
                        });
                    }, 2, 'loginSync').catch(err => {
                        console.warn('[LOGIN] Sync call failed (non-fatal):', err.message);
                    })
                ]);

                profile = fetchedProfile || backendUser;

                if (!profile) {
                    // Auto-create profile from Firebase data
                    try {
                        const newProfile = {
                            uid: user.uid,
                            name: user.displayName || normalizedEmail.split('@')[0],
                            email: user.email || normalizedEmail,
                            role: role || 'candidate',
                            createdAt: new Date().toISOString()
                        };
                        profile = await withRetry(
                            () => saveUserProfile(user.uid, newProfile),
                            3, 'autoCreateProfile'
                        );
                    } catch (syncErr) {
                        console.error("[AUTO-SYNC-LOGIN-ERR]", syncErr);
                        throw new Error("User profile not found. Please signup first.");
                    }
                }

                // Also backfill password to MongoDB in background if missing (self-healing for Bug #2)
                if (formData.password && profile && !profile.password) {
                    axios.post(`${API_URL}/signup`, {
                        name: profile.name,
                        email: normalizedEmail,
                        password: formData.password,
                        role: role,
                        uid: user.uid
                    }, {
                        headers: {
                            'X-Client-ID': CLIENT_ID,
                            'X-Client-Secret': CLIENT_SECRET
                        }
                    }).catch(err => {
                        console.warn('[LOGIN] Password backfill failed (non-fatal):', err.message);
                    });
                }

                // Rule: recruiter and admin share the same email — allow crossing between them.
                const profileIsStaff = profile.role === 'recruiter' || profile.role === 'admin';
                const selectedIsStaff = role === 'recruiter' || role === 'admin';
                if (profileIsStaff !== selectedIsStaff) {
                    throw new Error(`Unauthorized. This account is registered as a ${profile.role}.`);
                }
            }

            // Enforce expiration check for pilot recruiter accounts
            if (profile && profile.role === 'recruiter' && profile.accountType === 'pilot') {
                const now = new Date();
                const expiresAt = profile.pilotExpiresAt ? new Date(profile.pilotExpiresAt) : null;
                if (expiresAt && now > expiresAt) {
                    throw new Error("Your Hire1Percent pilot access has expired. Please contact the Hire1Percent team if you need continued access.");
                }
            }

            setMessage({ type: 'success', text: "Login successful!" });

            // Store using the SELECTED role (not the DB role) so the session matches what the user chose.
            localStorage.setItem('user', JSON.stringify({ ...profile, role: role }));

            // Track GA4 login conversion event (zero PII)
            trackEvent('login', { method: 'email', role: role || 'candidate' });

            // Navigate based on what the user selected, not what the DB says
            const from = location.state?.from?.pathname;
            if (from && from !== '/recruiter' && from !== '/admin') {
                navigate(from, { replace: true });
            } else if (role === 'admin') {
                navigate('/recruiter/my-jobs', { replace: true });
            } else {
                navigate(role === 'recruiter' ? '/recruiter/my-jobs' : '/candidate', { replace: true });
            }
        } catch (error) {
            console.error("[LOGIN-ERROR]", error);
            let userFriendlyMessage = "Invalid credentials. Please check your email/password.";

            if (error.response?.data?.message) {
                userFriendlyMessage = error.response.data.message;
            } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                userFriendlyMessage = "Account not found or password incorrect. Since we switched to Firebase, you may need to Create a New Account.";
            } else if (error.code === 'auth/network-request-failed') {
                userFriendlyMessage = "Network error: Unable to reach authentication server. Please check your internet connection or disable ad-blockers/shields and try again.";
            } else if (error.message) {
                userFriendlyMessage = error.message;
            }

            setMessage({
                type: 'error',
                text: userFriendlyMessage
            });
        } finally {
            setLoading(false);
        }
    };

    // Shared logic for both Popup and Redirect flows
    const processGoogleUser = async (googleUser, targetRole) => {
        setLoading(true);
        try {
            const normalizedEmail = (googleUser.email || '').toLowerCase().trim();

            // Step 1: Check if this Google account already has a profile in the backend.
            const existingProfile = await withRetry(
                () => getUserProfile(normalizedEmail),
                3, 'googleGetProfile'
            ).catch(() => null);

            if (existingProfile && existingProfile.role) {
                const isSelectedStaff = targetRole === 'recruiter' || targetRole === 'admin';
                const isDbStaff = existingProfile.role === 'recruiter' || existingProfile.role === 'admin';
                if (!(isSelectedStaff && isDbStaff)) {
                    targetRole = existingProfile.role;
                }
            }

            // Step 2: Build the profile
            const baseProfile = existingProfile || {};
            const basicProfile = {
                uid: googleUser.uid,
                name: googleUser.displayName,
                email: normalizedEmail,
                profilePic: googleUser.photoURL,
                isBasic: !existingProfile,
                ...baseProfile,
                role: targetRole
            };

            // Sync to MongoDB, save profile, and initialize Gateway session tokens in parallel
            await Promise.all([
                withRetry(async () => {
                    await apiClient.post('/users/sync', {
                        uid: googleUser.uid,
                        email: normalizedEmail,
                        name: googleUser.displayName,
                        profilePic: googleUser.photoURL,
                        role: targetRole
                    });
                }, 2, 'googleLoginSync').catch(err => {
                    console.warn('[GOOGLE-LOGIN] Sync call failed (non-fatal):', err.message);
                }),
                withRetry(
                    () => saveUserProfile(googleUser.uid, {
                        ...basicProfile,
                        createdAt: basicProfile.createdAt || new Date().toISOString()
                    }),
                    2, 'googleSaveProfile'
                ).catch(err => {
                    console.warn('[GOOGLE-LOGIN] Profile save failed (non-fatal):', err.message);
                }),
                withRetry(
                    () => apiClient.initializeGatewaySession(normalizedEmail, basicProfile.uid || basicProfile.id || basicProfile._id),
                    2, 'googleGatewaySession'
                ).catch(err => {
                    console.warn('[GOOGLE-LOGIN] Gateway session init failed (non-fatal):', err.message);
                })
            ]);

            // Step 5: Store and navigate
            localStorage.setItem('user', JSON.stringify(basicProfile));

            // Track GA4 login conversion event (zero PII)
            trackEvent('login', { method: 'google', role: targetRole || 'candidate' });
            setMessage({ type: 'success', text: "Authenticated! Logging in..." });

            const from = location.state?.from?.pathname;
            if (from && from !== '/recruiter' && from !== '/admin') {
                navigate(from, { replace: true });
            } else if (targetRole === 'admin') {
                navigate('/recruiter/my-jobs', { replace: true });
            } else if (targetRole === 'recruiter') {
                navigate('/recruiter/my-jobs', { replace: true });
            } else {
                navigate('/candidate', { replace: true });
            }

        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.message || "Profile setup failed." });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!role) {
            setMessage({ type: 'error', text: 'Please select a role first.' });
            return;
        }
        setLoading(true);
        try {
            const googleUser = await signInWithGoogle();
            await processGoogleUser(googleUser, role);

        } catch (error) {
            console.error("Popup Login Failed:", error);

            if (error.code === 'auth/popup-blocked' || error.message?.toLowerCase().includes('popup')) {
                console.warn("Popup blocked or closed. Switching to Redirect method...");
                setMessage({ type: 'warning', text: "Popup blocked. Redirecting to Google..." });

                sessionStorage.setItem('pendingRole', role);

                try {
                    await signInWithGoogleRedirect();
                } catch (redirErr) {
                    console.error("Redirect failed:", redirErr);
                    setMessage({ type: 'error', text: "Google Login failed completely." });
                    setLoading(false);
                }
                setTimeout(() => setLoading(false), 5000);
            } else {
                setMessage({ type: 'error', text: error.message || "Google login failed." });
                setLoading(false);
            }
        }
    };

    const renderForgotPasswordForm = () => {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full space-y-5"
            >
                <div>
                    <h3 className="text-2xl font-extrabold text-[#20263A] mb-1.5 tracking-tight">
                        {role === 'admin' ? 'Admin Reset' : 'Reset Password'}
                    </h3>
                    <p className="text-[#5E6577] text-sm leading-relaxed">
                        {role === 'admin' 
                            ? 'Verify your admin identity via one-time pass code.' 
                            : 'Receive a secure code to change your password.'
                        }
                    </p>
                </div>

                {forgotMessage.text && (
                    <div className={`p-3.5 rounded-xl text-sm border font-medium transition-all ${
                        forgotMessage.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {forgotMessage.text}
                    </div>
                )}

                {forgotStep === 1 ? (
                    <form onSubmit={handleForgotRequestSubmit} className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors" />
                            <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                placeholder="Enter Your Registered Email"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F8F8FA] border border-[#E3E5EC] focus:border-[#20263A] focus:bg-white focus:ring-2 focus:ring-[#20263A]/10 outline-none transition-all text-sm text-[#20263A] placeholder-[#9AA0B2]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={forgotLoading}
                            className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(32,38,58,0.14)] hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2 bg-[#20263A] hover:bg-[#151A2D] text-white cursor-pointer ${forgotLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {forgotLoading ? 'Sending Code...' : 'Send Verification Code'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setForgotPasswordMode(false)}
                            className="w-full text-center text-xs text-[#5E6577] hover:text-[#20263A] font-semibold transition-colors pt-2 cursor-pointer"
                        >
                            Back to Sign In
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                        {devOtpText && (
                            <div className="p-3 bg-[#F4EBDD] border border-[#E6BC6B] text-[#8C6B28] text-sm rounded-xl mb-4 text-center font-medium">
                                DEV OTP: <span className="font-bold text-[#20263A] tracking-widest">{devOtpText}</span>
                            </div>
                        )}
                        
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors" />
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="6-digit Verification Code"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F8F8FA] border border-[#E3E5EC] focus:border-[#20263A] focus:bg-white focus:ring-2 focus:ring-[#20263A]/10 outline-none transition-all text-sm text-[#20263A] placeholder-[#9AA0B2] tracking-widest"
                                maxLength={6}
                            />
                        </div>
                        
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F8F8FA] border border-[#E3E5EC] focus:border-[#20263A] focus:bg-white focus:ring-2 focus:ring-[#20263A]/10 outline-none transition-all text-sm text-[#20263A] placeholder-[#9AA0B2]"
                            />
                        </div>
                        
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors" />
                            <input
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Confirm New Password"
                                required
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F8F8FA] border border-[#E3E5EC] focus:border-[#20263A] focus:bg-white focus:ring-2 focus:ring-[#20263A]/10 outline-none transition-all text-sm text-[#20263A] placeholder-[#9AA0B2]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={forgotLoading}
                            className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(32,38,58,0.14)] hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2 bg-[#20263A] hover:bg-[#151A2D] text-white cursor-pointer ${forgotLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {forgotLoading ? 'Resetting...' : 'Reset Password'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setForgotStep(1);
                                setForgotMessage({ type: '', text: '' });
                            }}
                            className="w-full text-center text-xs text-[#5E6577] hover:text-[#20263A] font-semibold transition-colors pt-2 cursor-pointer"
                        >
                            Back to Request Code
                        </button>
                    </form>
                )}
            </motion.div>
        );
    };

    const handleCheckVerification = async () => {
        if (!verificationRequired) return;
        setCheckingVerification(true);
        setVerificationNotice({ type: '', text: '' });

        try {
            const currentUser = verificationRequired.user || auth.currentUser;
            if (!currentUser) {
                setVerificationNotice({
                    type: 'error',
                    text: "Session expired. Please sign in with your credentials again."
                });
                return;
            }

            const refreshedUser = await reloadFirebaseUser(currentUser);
            if (refreshedUser && refreshedUser.emailVerified) {
                setVerificationNotice({
                    type: 'success',
                    text: "Email verified successfully! Logging you in..."
                });

                const normalizedEmail = (refreshedUser.email || verificationRequired.email).toLowerCase().trim();
                const targetRole = verificationRequired.role || role || 'candidate';

                // Fetch Profile and initialize Gateway Session in parallel
                const [fetchedProfile] = await Promise.all([
                    withRetry(() => getUserProfile(normalizedEmail), 3, 'getProfile').catch(() => null),
                    withRetry(() => apiClient.initializeGatewaySession(normalizedEmail, refreshedUser.uid), 3, 'gatewaySession').catch(err => {
                        console.warn('[LOGIN] Gateway session init failed (non-fatal):', err.message);
                    }),
                    withRetry(async () => {
                        await apiClient.post('/users/sync', {
                            uid: refreshedUser.uid,
                            email: normalizedEmail,
                            name: refreshedUser.displayName || normalizedEmail.split('@')[0],
                            role: targetRole
                        });
                    }, 2, 'loginSync').catch(err => {
                        console.warn('[LOGIN] Sync call failed (non-fatal):', err.message);
                    })
                ]);

                let profile = fetchedProfile;
                if (!profile) {
                    profile = {
                        uid: refreshedUser.uid,
                        name: refreshedUser.displayName || normalizedEmail.split('@')[0],
                        email: normalizedEmail,
                        role: targetRole,
                        createdAt: new Date().toISOString()
                    };
                    await withRetry(() => saveUserProfile(refreshedUser.uid, profile), 3, 'autoCreateProfile').catch(() => {});
                }

                localStorage.setItem('user', JSON.stringify({ ...profile, role: targetRole }));

                // Track GA4 login conversion event (zero PII)
                trackEvent('login', { method: 'email_verification', role: targetRole || 'candidate' });

                const from = location.state?.from?.pathname;
                if (from && from !== '/recruiter' && from !== '/admin') {
                    navigate(from, { replace: true });
                } else if (targetRole === 'admin') {
                    navigate('/recruiter/my-jobs', { replace: true });
                } else {
                    navigate(targetRole === 'recruiter' ? '/recruiter/my-jobs' : '/candidate', { replace: true });
                }
            } else {
                setVerificationNotice({
                    type: 'warning',
                    text: "Email not verified yet. Please check your inbox (and spam/junk folder), click the verification link, and then click this button again."
                });
            }
        } catch (err) {
            console.error("[CHECK-LOGIN-VERIFICATION-ERR]", err);
            setVerificationNotice({
                type: 'error',
                text: "Unable to verify status. Please check your connection and try again."
            });
        } finally {
            setCheckingVerification(false);
        }
    };

    const handleResendEmail = async () => {
        if (resendCooldown > 0 || !verificationRequired) return;
        setCheckingVerification(true);
        setVerificationNotice({ type: '', text: '' });

        try {
            const currentUser = verificationRequired.user || auth.currentUser;
            if (!currentUser) {
                setVerificationNotice({
                    type: 'error',
                    text: "Session expired. Please sign in with your credentials again to request verification."
                });
                return;
            }

            await reloadFirebaseUser(currentUser);
            if (currentUser.emailVerified) {
                await handleCheckVerification();
                return;
            }

            // Send native verification email
            await sendVerificationEmail(currentUser);

            // Also trigger backend branded email with CTA button
            axios.post(`${API_URL}/auth/resend-verification`, { email: verificationRequired.email }, {
                headers: { 'X-Client-ID': CLIENT_ID, 'X-Client-Secret': CLIENT_SECRET }
            }).catch(e => {
                console.warn('[LOGIN] Backend resend-verification warning (non-fatal):', e.message);
            });

            setVerificationNotice({
                type: 'success',
                text: `Verification email sent to ${verificationRequired.email}! Please check your inbox and spam folder.`
            });
            setResendCooldown(60);
        } catch (err) {
            console.error("[RESEND-LOGIN-VERIFICATION-ERR]", err);
            let msg = "Failed to resend verification email. Please try again.";
            if (err.code === 'auth/too-many-requests') {
                msg = "Too many requests. Please wait a minute before requesting another email.";
                setResendCooldown(60);
            } else if (err.code === 'auth/network-request-failed') {
                msg = "Network error: Unable to reach verification server. Please check your connection.";
            }
            setVerificationNotice({ type: 'error', text: msg });
        } finally {
            setCheckingVerification(false);
        }
    };

    const renderVerificationRequired = () => {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full space-y-6 text-center"
            >
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#F4EBDD] border border-[#E6BC6B]/40 text-[#C99A45] flex items-center justify-center mb-4 shadow-sm">
                        <Mail className="w-8 h-8 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-bold mb-1.5 text-[#20263A]">Email Verification Required</h3>
                    <p className="text-[#5E6577] text-xs max-w-sm mb-3">
                        Your account requires email verification before accessing Hire1Percent.
                    </p>
                    <div className="px-4 py-2 rounded-xl bg-[#F8F8FA] border border-[#E3E5EC] text-[#20263A] font-mono text-xs font-semibold mb-3 max-w-full truncate">
                        {verificationRequired?.email}
                    </div>
                </div>

                {verificationNotice.text && (
                    <div className={`p-3.5 rounded-xl text-xs border font-medium text-left ${
                        verificationNotice.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : verificationNotice.type === 'warning'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                        {verificationNotice.text}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={handleCheckVerification}
                        disabled={checkingVerification}
                        className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(32,38,58,0.14)] hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2 bg-[#20263A] hover:bg-[#151A2D] text-white cursor-pointer ${checkingVerification ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {checkingVerification && <Loader2 className="w-4 h-4 animate-spin" />}
                        {checkingVerification ? "Checking Status..." : "I've Verified My Email"}
                    </button>

                    <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={checkingVerification || resendCooldown > 0}
                        className={`w-full py-2.5 rounded-xl border border-[#E3E5EC] hover:bg-[#F8F8FA] text-[#20263A] transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                            resendCooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${checkingVerification ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0
                            ? `Resend Verification Email (${resendCooldown}s)`
                            : "Resend Verification Email"
                        }
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setVerificationRequired(null);
                            setVerificationNotice({ type: '', text: '' });
                        }}
                        className="w-full text-center text-xs text-[#5E6577] hover:text-[#20263A] font-semibold transition-colors pt-1 cursor-pointer"
                    >
                        Back to Sign In
                    </button>
                </div>
            </motion.div>
        );
    };

    const renderRoleSelection = () => (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-4xl mx-auto text-center py-6"
        >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4EBDD] border border-[#E6BC6B]/40 text-[#C99A45] text-xs font-bold uppercase tracking-wider mb-4">
                Secure Access
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#20263A] tracking-tight mb-3">Welcome Back</h1>
            <p className="text-[#5E6577] mb-8 text-base md:text-lg max-w-md mx-auto leading-relaxed">
                Select your account type to continue your journey.
            </p>

            {message.text && (
                <div className={`max-w-md mx-auto mb-8 p-3.5 rounded-xl text-sm font-semibold text-center ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {/* Recruiter Card */}
                <motion.div
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect('recruiter')}
                    className="p-8 md:p-10 rounded-[2rem] bg-white border border-[#E3E5EC] hover:border-[#C99A45] cursor-pointer transition-all duration-300 group relative overflow-hidden shadow-[0_10px_35px_rgba(32,38,58,0.06)] hover:shadow-[0_22px_55px_rgba(32,38,58,0.12)] text-center flex flex-col items-center"
                >
                    <div className="absolute top-0 right-0 p-6 text-[#20263A]/5 group-hover:text-[#C99A45]/10 transition-colors pointer-events-none">
                        <Briefcase className="w-32 h-32" />
                    </div>
                    <div className="w-16 h-16 bg-[#20263A] rounded-2xl flex items-center justify-center text-[#E6BC6B] mb-6 shadow-md group-hover:scale-110 group-hover:bg-[#151A2D] transition-all">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#20263A] mb-3">Recruiter Login</h3>
                    <p className="text-[#5E6577] text-sm leading-relaxed mb-6 max-w-xs">
                        Access your dashboard to manage jobs and track candidate progress.
                    </p>
                    <button className="px-7 py-2.5 rounded-xl bg-[#20263A] group-hover:bg-[#151A2D] text-white transition-all text-sm font-bold shadow-sm">
                        Continue
                    </button>
                </motion.div>

                {/* Candidate Card */}
                <motion.div
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect('candidate')}
                    className="p-8 md:p-10 rounded-[2rem] bg-white border border-[#E3E5EC] hover:border-[#C99A45] cursor-pointer transition-all duration-300 group relative overflow-hidden shadow-[0_10px_35px_rgba(32,38,58,0.06)] hover:shadow-[0_22px_55px_rgba(32,38,58,0.12)] text-center flex flex-col items-center"
                >
                    <div className="absolute top-0 right-0 p-6 text-[#20263A]/5 group-hover:text-[#C99A45]/10 transition-colors pointer-events-none">
                        <Users className="w-32 h-32" />
                    </div>
                    <div className="w-16 h-16 bg-[#F4EBDD] border border-[#E6BC6B]/40 rounded-2xl flex items-center justify-center text-[#C99A45] mb-6 shadow-sm group-hover:scale-110 group-hover:bg-[#EEDFC6] transition-all">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#20263A] mb-3">Candidate Login</h3>
                    <p className="text-[#5E6577] text-sm leading-relaxed mb-6 max-w-xs">
                        Continue your job search, refine your skills, and get hired.
                    </p>
                    <button className="px-7 py-2.5 rounded-xl border-2 border-[#20263A] text-[#20263A] group-hover:bg-[#20263A] group-hover:text-white transition-all text-sm font-bold shadow-sm">
                        Continue
                    </button>
                </motion.div>
            </div>

            <div className="mt-10 text-[#5E6577] text-sm">
                <p>
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-[#20263A] hover:text-[#C99A45] font-bold underline transition-colors ml-1">
                        Join the ecosystem
                    </Link>
                </p>
            </div>
        </motion.div>
    );

    const renderLoginForm = () => {
        const isRecruiter = role === 'recruiter';

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col lg:flex-row w-full max-w-5xl bg-white border border-[#E3E5EC] rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(32,38,58,0.1)] my-auto"
            >
                {/* Left Side: Brand Panel */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:w-5/12 p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-[#20263A] text-white"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(201,154,69,0.22),transparent_55%)] pointer-events-none" />

                    <div className="relative z-10">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-[#E3E5EB]/80 hover:text-white mb-6 transition-colors group cursor-pointer text-sm font-medium"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Selection
                        </button>

                        <div className="flex items-center gap-2.5 mb-6">
                            <div className="w-9 h-9 rounded-lg bg-[#20263A] border border-[#D4AC5F] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                <img src="/logo.png" alt="Hire1Percent" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-lg font-extrabold tracking-tight text-white">Hire<span className="text-[#D5A54F]">1</span>Percent</span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
                            {role === 'admin' ? 'Admin Control Center' : isRecruiter ? 'Welcome Back, Recruiter' : 'Welcome Back, Candidate'}
                        </h2>

                        <p className="text-[#C5CAD8] mb-8 text-sm leading-relaxed">
                            {role === 'admin'
                                ? 'System overview and core management tools are ready for your oversight.'
                                : isRecruiter
                                    ? 'Your hiring suite is ready. Find top-tier talent with AI precision.'
                                    : 'Ready for your next big break? Your future in tech starts here.'
                            }
                        </p>

                        <div className="space-y-3.5">
                            {[
                                role === 'admin' ? "Manage platform content" : isRecruiter ? "Manage active postings" : "Track your applications",
                                role === 'admin' ? "Approve job requests" : isRecruiter ? "Analyze recent applications" : "Get matching job alerts",
                                role === 'admin' ? "System performance monitoring" : isRecruiter ? "Schedule AI interviews" : "Improve your skill score"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-[#C99A45]/20 border border-[#C99A45]/40 flex items-center justify-center text-[#E6BC6B] shrink-0">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[#E3E5EB] font-medium">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="absolute -bottom-6 -right-6 opacity-10 text-[#C99A45] pointer-events-none">
                        {role === 'admin' ? <ShieldCheck size={200} /> : isRecruiter ? <Briefcase size={200} /> : <Users size={200} />}
                    </div>
                </motion.div>

                {/* Right Side: Form */}
                <div className="lg:w-7/12 p-8 sm:p-12 flex flex-col justify-center bg-white">
                    <div className="max-w-md mx-auto w-full">
                        {forgotPasswordMode ? renderForgotPasswordForm() : verificationRequired ? renderVerificationRequired() : (
                            <>
                                <div className="mb-6">
                                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#20263A] mb-1.5 tracking-tight">Login to Account</h3>
                                    <p className="text-[#5E6577] text-sm">Enter your credentials to continue.</p>
                                </div>

                                {message.text && (
                                    <div className={`mb-4 p-3.5 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                        {message.text}
                                    </div>
                                )}

                                <form className="space-y-4" onSubmit={handleSubmit}>
                                    <div className="space-y-3">
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="Work Email"
                                                required
                                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F8F8FA] border border-[#E3E5EC] focus:border-[#20263A] focus:bg-white focus:ring-2 focus:ring-[#20263A]/10 outline-none transition-all text-sm text-[#20263A] placeholder-[#9AA0B2]"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA0B2] group-focus-within:text-[#20263A] transition-colors" />
                                            <input
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Password"
                                                required
                                                autoComplete="current-password"
                                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#F8F8FA] border border-[#E3E5EC] focus:border-[#20263A] focus:bg-white focus:ring-2 focus:ring-[#20263A]/10 outline-none transition-all text-sm text-[#20263A] placeholder-[#9AA0B2]"
                                            />
                                        </div>
                                    </div>

                                    {role === 'admin' && (
                                        <div className="flex items-center justify-end">
                                            <button type="button" onClick={handleForgotPasswordClick} className="text-xs text-[#20263A] hover:text-[#C99A45] font-semibold transition-colors cursor-pointer">
                                                Forgot Password?
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(32,38,58,0.14)] hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center justify-center gap-2 bg-[#20263A] hover:bg-[#151A2D] text-white cursor-pointer ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {loading ? 'Signing In...' : 'Sign In'}
                                    </button>

                                    {role !== 'admin' && (
                                        <>
                                            <div className="relative flex items-center justify-center py-2">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-[#E3E5EC]" />
                                                </div>
                                                <span className="relative bg-white px-3 text-[11px] font-bold text-[#8C93A4] uppercase tracking-wider">
                                                    Or continue with
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={handleGoogleLogin}
                                                    className="flex items-center justify-center gap-2.5 py-3 rounded-xl border border-[#E3E5EC] bg-white hover:bg-[#F8F8FA] text-[#20263A] font-semibold text-sm transition-all shadow-sm hover:border-[#D1D5DF] cursor-pointer"
                                                >
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                    </svg>
                                                    Google
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </form>

                                {role !== 'admin' && (
                                    <p className="mt-8 text-center text-[#5E6577] text-sm">
                                        New here?{' '}
                                        <Link to="/signup" className="text-[#20263A] hover:text-[#C99A45] font-bold underline transition-colors cursor-pointer ml-1">
                                            Create an account
                                        </Link>
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8F8FA] text-[#20263A] flex flex-col relative overflow-x-hidden selection:bg-[#C99A45]/20 selection:text-[#20263A]">
            <SEO 
                title="Sign In | Hire1Percent" 
                description="Sign in to your Hire1Percent account to access coding assessments and recruitment dashboards." 
                canonicalUrl="/login"
                robots="noindex, follow" 
            />
            {/* Background Decor matching homepage hero warmth */}
            <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-[#C99A45]/10 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-[#20263A]/5 blur-[130px] rounded-full pointer-events-none" />

            <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-24 sm:py-28">
                <div className="w-full max-w-5xl flex items-center justify-center my-auto">
                    <AnimatePresence mode="wait">
                        {!role ? renderRoleSelection() : renderLoginForm()}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;
