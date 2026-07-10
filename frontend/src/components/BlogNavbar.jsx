import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const BlogNavbar = ({ onToggleTheme }) => {
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchParams] = useSearchParams();
    const activeCategory = searchParams.get('category') || '';

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

        window.addEventListener('storage', updateAuth);
        return () => window.removeEventListener('storage', updateAuth);
    }, []);

    const navItems = [
        { name: 'Latest', slug: '' },
        { name: 'Technical Assessments', slug: 'technical-assessments' },
        { name: 'AI Hiring', slug: 'ai-hiring' },
        { name: 'Interview Intelligence', slug: 'interview-intelligence' },
        { name: 'Engineering Hiring', slug: 'engineering-hiring' },
        { name: 'Recruiting Strategy', slug: 'recruiting-strategy' },
        { name: 'Product Updates', slug: 'product-updates' },
        { name: 'All Posts', slug: 'all' }
    ];

    const isItemActive = (slug) => {
        return activeCategory === slug;
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/10 bg-[#0c0f16]/90"
        >
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center space-x-2 group shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                        <span className="text-white font-bold text-xl">H</span>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 group-hover:from-blue-400 group-hover:to-teal-400 transition-all">
                        hire1percent
                    </span>
                </Link>

                {/* Desktop Navigation Items */}
                <div className="hidden xl:flex items-center space-x-5 mx-6 overflow-x-auto no-scrollbar">
                    {navItems.map((item) => {
                        const active = isItemActive(item.slug);
                        return (
                            <Link
                                key={item.name}
                                to={item.slug ? `/blog?category=${item.slug}` : '/blog'}
                                className={`text-xs font-bold uppercase tracking-wider transition-all duration-200 relative py-2 px-1 ${
                                    active 
                                        ? 'text-blue-400' 
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {item.name}
                                {active && (
                                    <motion.div 
                                        layoutId="activeBlogTab"
                                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Right Actions */}
                <div className="hidden xl:flex items-center space-x-4 shrink-0">
                    {onToggleTheme && (
                        <button
                            onClick={onToggleTheme}
                            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white w-10 h-10 transition-all"
                            aria-label="Toggle Theme"
                        >
                            <Sun size={18} />
                        </button>
                    )}
                    {user ? (
                        <Link 
                            to={user.role === 'recruiter' ? '/recruiter' : '/seeker'} 
                            className="text-xs font-black uppercase tracking-wider text-gray-300 hover:text-white transition-colors"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link 
                                to="/login" 
                                className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:text-blue-400 transition-colors"
                            >
                                Login
                            </Link>
                            <Link 
                                to="/signup" 
                                className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-full transition-all shadow-lg shadow-blue-500/20"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>

                {/* Hamburger for Mobile & smaller screens */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="xl:hidden p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile / Tablet Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="xl:hidden border-t border-white/10 bg-[#0c0f16]"
                    >
                        <div className="flex flex-col p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5 pb-2">Blog Categories</span>
                            {navItems.map((item) => {
                                const active = isItemActive(item.slug);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.slug ? `/blog?category=${item.slug}` : '/blog'}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`text-sm font-bold uppercase tracking-wider transition-colors py-1 ${
                                            active ? 'text-blue-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        {item.name}
                                    </Link>
                                );
                            })}
                            
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5 pb-2 pt-2">Account</span>
                            {user ? (
                                <Link
                                    to={user.role === 'recruiter' ? '/recruiter' : '/seeker'}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-white"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <div className="flex flex-col space-y-3 pt-1">
                                    <Link 
                                        to="/login" 
                                        onClick={() => setIsMenuOpen(false)} 
                                        className="text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-white"
                                    >
                                        Login
                                    </Link>
                                    <Link 
                                        to="/signup" 
                                        onClick={() => setIsMenuOpen(false)} 
                                        className="w-full py-3 text-center text-xs font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default BlogNavbar;
