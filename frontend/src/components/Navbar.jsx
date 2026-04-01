import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const Navbar = ({ theme = 'dark' }) => {
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isLight = theme === 'light';

    useEffect(() => {
        const updateAuth = () => {
            const userData = localStorage.getItem('user');
            if (userData && userData !== 'undefined') {
                try {
                    setUser(JSON.parse(userData));
                } catch (e) {
                    console.error("Auth parse error", e);
                }
            } else {
                setUser(null);
            }
        };

        updateAuth();

        // Listen for storage changes (for multiple tabs or manual logout)
        window.addEventListener('storage', updateAuth);
        return () => window.removeEventListener('storage', updateAuth);
    }, []);



    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md ${isLight ? 'border-b border-gray-200 bg-white/90' : 'border-b border-white/10 bg-[#0c0f16]/80'}`}
        >
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <span className="text-white font-bold text-xl">H</span>
                    </div>
                    <span className={`text-xl font-bold bg-clip-text text-transparent transition-all ${isLight ? 'bg-gradient-to-r from-gray-900 to-gray-500 group-hover:from-blue-500 group-hover:to-teal-500' : 'bg-gradient-to-r from-white to-white/60 group-hover:from-blue-400 group-hover:to-teal-400'}`}>
                        hire1percent
                    </span>
                </Link>

                <div className="hidden md:flex items-center space-x-8">
                    <a href="/#elite-talent" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>Elite Talent</a>
                    <a href="/#operations" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>Operations</a>
                    <a href="/#safety" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>Safety</a>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <Link to={user.role === 'recruiter' ? '/recruiter' : '/seeker'} className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}>
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className={`px-5 py-2 text-sm font-medium transition-colors ${isLight ? 'text-gray-800 hover:text-blue-500' : 'text-white hover:text-blue-400'}`}>
                                    Login
                                </Link>
                                <Link to="/signup" className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-full transition-all shadow-lg shadow-blue-500/20">
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Hamburger for Mobile */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`md:hidden p-2 transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`md:hidden ${isLight ? 'border-t border-gray-200 bg-white' : 'border-t border-white/10 bg-[#0c0f16]'}`}
                    >
                        <div className="flex flex-col p-6 space-y-4">
                            <a href="/#elite-talent" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Elite Talent</a>
                            <a href="/#operations" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Operations</a>
                            <a href="/#safety" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Safety</a>
                            <div className="pt-4 flex flex-col space-y-4">
                                {user ? (
                                    <Link
                                        to={user.role === 'recruiter' ? '/recruiter' : '/seeker'}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}
                                    >
                                        Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Login</Link>
                                        <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="w-full py-3 text-center bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full">
                                            Sign Up
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default Navbar;
