import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Users, Mail, Lock, User, CheckCircle, ArrowLeft, Globe, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { signupWithEmail, saveUserProfile, signInWithGoogle, getUserProfile } from '../firebase';

const SignupPage = () => {
    const navigate = useNavigate();

    const [role, setRole] = useState(null); // 'recruiter' or 'seeker'
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleRoleSelect = (selectedRole) => {
        setRole(selectedRole);
        setMessage({ type: '', text: '' });
    };

    const handleBack = () => {
        setRole(null);
        setFormData({ name: '', email: '', password: '' });
        setMessage({ type: '', text: '' });
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // 1. Firebase Auth Signup
            const userCredential = await signupWithEmail(formData.email, formData.password);
            const user = userCredential.user;

            // 2. Prepare Profile (Optimistic)
            const profileData = {
                uid: user.uid,
                name: formData.name,
                email: formData.email,
                role: role,
                createdAt: new Date().toISOString()
            };

            // 3. Store and Navigate IMMEDIATELY
            localStorage.setItem('user', JSON.stringify(profileData));
            setMessage({ type: 'success', text: "Account created successfully!" });

            if (role === 'recruiter') navigate('/recruiter');
            else navigate('/seeker');

            // 4. Background Sync
            saveUserProfile(user.uid, profileData).catch(err =>
                console.warn("[Background] Profile sync failed, will retry on next login:", err)
            );

        } catch (error) {
            console.error("Firebase Signup Error:", error);
            let userFriendlyMessage = error.message || 'Signup failed. Please try again.';

            if (error.code === 'auth/email-already-in-use') {
                userFriendlyMessage = "This email is already registered. Try logging in.";
            } else if (error.code === 'auth/weak-password') {
                userFriendlyMessage = "Password is too weak. Please use at least 6 characters.";
            }

            setMessage({
                type: 'error',
                text: userFriendlyMessage
            });
            setLoading(false); // Only unset loading on error, otherwise we are navigating
        }
    };

    const handleGoogleSignup = async () => {
        if (!role) {
            setMessage({ type: 'error', text: 'Please select a role first.' });
            return;
        }
        setLoading(true);
        try {
            // 1. Authenticate (Immediate)
            const googleUser = await signInWithGoogle();

            // 2. Prepare Profile (Optimistic)
            const newProfile = {
                uid: googleUser.uid,
                name: googleUser.displayName,
                email: googleUser.email,
                profilePic: googleUser.photoURL,
                role: role,
                createdAt: new Date().toISOString(),
                isOptimistic: true
            };

            // 3. Store & Navigate IMMEDIATELY
            localStorage.setItem('user', JSON.stringify(newProfile));
            setMessage({ type: 'success', text: "Account created! Logging in..." });

            if (role === 'recruiter') navigate('/recruiter');
            else navigate('/seeker');

            // 4. Background: Sync to Firebase DB
            getUserProfile(googleUser.uid).then(async (existing) => {
                if (!existing) {
                    await saveUserProfile(googleUser.uid, newProfile);
                }
            }).catch(err => console.warn("Background signup sync delayed:", err));

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: "Google signup failed." });
        } finally {
            setLoading(false);
        }
    };



    const renderRoleSelection = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl mx-auto text-center"
        >
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Choose Your Path</h1>
            <p className="text-gray-400 mb-12 text-lg">Are you looking to hire top talent or start your dream career?</p>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Recruiter Card */}
                <motion.div
                    whileHover={{ scale: 1.02, borderColor: 'rgba(59, 130, 246, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect('recruiter')}
                    className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 cursor-pointer transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Briefcase className="w-32 h-32" />
                    </div>
                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 mx-auto group-hover:scale-110 transition-transform">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">I am a Recruiter</h3>
                    <p className="text-gray-400 text-sm mb-6">Find, assess, and hire the best talent using our AI-driven system.</p>
                    <button className="px-6 py-2 rounded-full border border-blue-500/30 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all text-sm font-bold">
                        Get Started
                    </button>
                </motion.div>

                {/* Candidate Card */}
                <motion.div
                    whileHover={{ scale: 1.02, borderColor: 'rgba(20, 184, 166, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRoleSelect('seeker')}
                    className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 cursor-pointer transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users className="w-32 h-32" />
                    </div>
                    <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 mb-6 mx-auto group-hover:scale-110 transition-transform">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">I am a Candidate</h3>
                    <p className="text-gray-400 text-sm mb-6">Verify your skills, build your AI resume, and land top roles.</p>
                    <button className="px-6 py-2 rounded-full border border-teal-500/30 text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all text-sm font-bold">
                        Get Started
                    </button>
                </motion.div>
            </div>

            <div className="mt-12 text-gray-500 text-sm">
                Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Login here</Link>
            </div>
        </motion.div>
    );

    const renderSignupForm = () => {
        const isRecruiter = role === 'recruiter';

        return (
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex flex-col lg:flex-row h-full w-full bg-[#0c0f16] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
            >
                {/* Left Side: Illustration / Info */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`lg:w-1/2 p-10 flex flex-col justify-center relative overflow-hidden bg-gradient-to-br ${isRecruiter ? 'from-blue-600/20 to-blue-900/40' : 'from-teal-600/20 to-teal-900/40'}`}
                >
                    {/* Animated Background Element */}
                    <div className={`absolute top-0 left-0 w-full h-full opacity-10 ${isRecruiter ? 'bg-[radial-gradient(circle_at_50%_50%,#3b82f6,transparent)]' : 'bg-[radial-gradient(circle_at_50%_50%,#14b8a6,transparent)]'} animate-pulse`} />

                    <div className="relative z-10">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Selection
                        </button>
                        <h2 className="text-3xl font-bold mb-4">
                            {isRecruiter ? 'Recruit with AI Precision' : 'Unlock Your Potential'}
                        </h2>
                        <p className="text-gray-400 mb-6 text-sm max-w-md">
                            {isRecruiter
                                ? 'Join thousands of employers using our AI matching system to find the world\'s most exceptional technical talent.'
                                : 'Build your career identity and get matched with the most innovative projects in the space.'
                            }
                        </p>

                        <div className="space-y-4">
                            {[
                                isRecruiter ? "Skill-based ranking" : "AI Resume Analysis",
                                isRecruiter ? "Automated interviewing" : "Verified skill badges",
                                isRecruiter ? "Seamless candidate management" : "Smart job matching"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isRecruiter ? 'bg-blue-500/20 text-blue-400' : 'bg-teal-500/20 text-teal-400'}`}>
                                        <CheckCircle className="w-3 h-3" />
                                    </div>
                                    <span className="text-gray-300 text-sm font-medium">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Floating UI Elements Mockup */}
                    <div className="absolute bottom-10 right-10 opacity-20 pointer-events-none">
                        {isRecruiter ? <Briefcase size={200} /> : <Users size={200} />}
                    </div>
                </motion.div>

                {/* Right Side: Form */}
                <div className="lg:w-1/2 p-10 flex flex-col justify-center">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold mb-1">Create {isRecruiter ? 'Recruiter' : 'Candidate'} Account</h3>
                            <p className="text-gray-500 text-sm">Fill in the details to get started.</p>
                        </div>

                        {message.text && (
                            <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-red-500/20 text-red-400 border border-red-500/20'}`}>
                                {message.text}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-3">
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Full Name"
                                        required
                                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Work Email"
                                        required
                                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Password"
                                        required
                                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 rounded-2xl font-bold transition-all shadow-xl active:scale-95 text-sm flex items-center justify-center gap-2 ${isRecruiter
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/10'
                                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-500/10'
                                    } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>

                            <div className="relative flex items-center gap-2 py-1">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Or continue with</span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    type="button"
                                    onClick={handleGoogleSignup}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-xs"
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
                        </form>

                        <p className="mt-8 text-center text-gray-500 text-sm">
                            By signing up, you agree to our <span className="text-white hover:underline cursor-pointer">Terms of Service</span>.
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-screen bg-[#0c0f16] text-white flex flex-col relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500/5 blur-[120px] rounded-full pointer-events-none" />

            <nav className="container mx-auto px-6 py-4 flex-none">
                <Link to="/" className="flex items-center space-x-2 group w-fit">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-400 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">H</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">hire1percent</span>
                </Link>
            </nav>

            <main className="flex-1 flex items-center justify-center px-6 pb-6 overflow-hidden">
                <div className="w-full max-w-6xl h-full max-h-[800px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {!role ? renderRoleSelection() : renderSignupForm()}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default SignupPage;
