import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, linkFirebasePassword, getAuthHeaders, API_URL } from '../firebase';

const CreatePasswordModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' }); // 'success' or 'error'

    // Real-time password validation
    const validations = {
        minLength: password.length >= 6,
        hasNumber: /\d/.test(password),
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
    };

    const isPasswordValid = Object.values(validations).every(Boolean);
    const doPasswordsMatch = password === confirmPassword && password !== '';

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setFirebaseUser(user);
                
                // Inspect providerData to check if user has google.com but not password provider
                const providers = user.providerData.map(p => p.providerId);
                const hasGoogle = providers.includes('google.com');
                const hasPassword = providers.includes('password');

                // Check if user has already skipped password setup in the current session
                const hasSkipped = sessionStorage.getItem('skipPasswordSetup');

                if (hasGoogle && !hasPassword && !hasSkipped) {
                    setIsOpen(true);
                } else {
                    setIsOpen(false);
                }
            } else {
                setFirebaseUser(null);
                setIsOpen(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleSkip = () => {
        sessionStorage.setItem('skipPasswordSetup', 'true');
        setIsOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) {
            setStatus({ type: 'error', message: 'Please meet all password requirements.' });
            return;
        }
        if (!doPasswordsMatch) {
            setStatus({ type: 'error', message: 'Passwords do not match.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            // 1. Link password provider in Firebase
            await linkFirebasePassword(firebaseUser.email, password);

            // 2. Sync hashed password in MongoDB backend
            const headers = await getAuthHeaders();
            await axios.post(
                `${API_URL}/auth/link-password`,
                { password },
                { headers }
            );

            // 3. Success state
            setStatus({
                type: 'success',
                message: 'Password created successfully! You can now log in using either Google or your Email + Password.'
            });

            // Mark session as complete so they are never prompted again in this browser session
            sessionStorage.setItem('skipPasswordSetup', 'true');

            // Wait 3 seconds and close modal
            setTimeout(() => {
                setIsOpen(false);
            }, 3000);

        } catch (error) {
            console.error('[PASSWORD-LINK-ERROR]', error);
            let errMsg = 'Failed to link password. Please try again.';
            if (error.code === 'auth/credential-already-in-use') {
                errMsg = 'This email is already linked to another password credential.';
            } else if (error.response?.data?.message) {
                errMsg = error.response.data.message;
            } else if (error.message) {
                errMsg = error.message;
            }
            setStatus({ type: 'error', message: errMsg });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop with beautiful blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleSkip}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                {/* Glassmorphic Modal Card */}
                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                    className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0d111a]/85 p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                    {/* Background glow effects */}
                    <div className="absolute -left-20 -top-20 -z-10 h-40 w-40 rounded-full bg-blue-500/10 blur-[50px]" />
                    <div className="absolute -right-20 -bottom-20 -z-10 h-40 w-40 rounded-full bg-teal-500/10 blur-[50px]" />

                    {/* Header */}
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight">Create email login password</h3>
                        <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                            You logged in with Google. Set a password to log in securely with your email <span className="text-blue-300 font-semibold">{firebaseUser?.email}</span> as well.
                        </p>
                    </div>

                    {/* Notification Alerts */}
                    {status.message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-6 flex gap-3 rounded-2xl border p-4 text-sm ${
                                status.type === 'success'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                        >
                            {status.type === 'success' ? (
                                <CheckCircle className="h-5 w-5 shrink-0" />
                            ) : (
                                <AlertCircle className="h-5 w-5 shrink-0" />
                            )}
                            <span>{status.message}</span>
                        </motion.div>
                    )}

                    {status.type !== 'success' && (
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            {/* Password input */}
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your new password"
                                    required
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-12 text-sm outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.08]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Confirm password input */}
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm password"
                                    required
                                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm outline-none transition-all focus:border-blue-500/50 focus:bg-white/[0.08]"
                                />
                            </div>

                            {/* Requirement Indicators */}
                            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-4 text-[11px] text-gray-400 border border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full transition-colors duration-300 ${validations.minLength ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/20'}`} />
                                    <span>Min 6 characters</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full transition-colors duration-300 ${validations.hasNumber ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/20'}`} />
                                    <span>At least 1 number</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full transition-colors duration-300 ${validations.hasUpper ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/20'}`} />
                                    <span>Upper case letter</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full transition-colors duration-300 ${validations.hasLower ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/20'}`} />
                                    <span>Lower case letter</span>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="mt-6 flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={loading || !isPasswordValid || !doPasswordsMatch}
                                    className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-600 py-3.5 text-sm font-bold text-white transition-all shadow-lg active:scale-95 duration-200 ${
                                        loading || !isPasswordValid || !doPasswordsMatch
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:brightness-110 shadow-blue-500/20'
                                    }`}
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {loading ? 'Securing your account...' : 'Create Password'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    className="w-full text-center text-xs font-semibold text-gray-500 hover:text-white transition-colors py-2"
                                >
                                    Skip for now
                                </button>
                            </div>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreatePasswordModal;
