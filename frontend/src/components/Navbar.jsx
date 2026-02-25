import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

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
        console.log("[NAVBAR] Checked Auth. User:", localStorage.getItem('user'));

        // Listen for storage changes (for multiple tabs or manual logout)
        window.addEventListener('storage', updateAuth);
        return () => window.removeEventListener('storage', updateAuth);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0c0f16]/80 backdrop-blur-md"
        >
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <span className="text-white font-bold text-xl">H</span>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 group-hover:from-blue-400 group-hover:to-teal-400 transition-all">
                        hire1percent
                    </span>
                </Link>

                <div className="hidden md:flex items-center space-x-8">
                    <a href="/#elite-talent" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Elite Talent</a>
                    <a href="/#operations" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Operations</a>
                    <a href="/#safety" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Safety</a>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                {user.role === 'admin' && (
                                    <Link to="/admin/recordings" className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-500/10">
                                        Admin Portal
                                    </Link>
                                )}
                                <Link to={user.role === 'recruiter' ? '/recruiter' : '/seeker'} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                    Dashboard
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="px-5 py-2 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="px-5 py-2 text-sm font-medium text-white hover:text-blue-400 transition-colors">
                                    Login
                                </Link>
                                <Link to="/signup" className="px-5 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-full transition-all shadow-lg shadow-blue-500/20">
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;
