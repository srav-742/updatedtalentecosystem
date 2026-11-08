import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = ({ theme = 'dark', onToggleTheme }) => {
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

    const themeToggle = onToggleTheme ? (
        <button
            onClick={onToggleTheme}
            className={`inline-flex items-center justify-center rounded-full border w-10 h-10 transition-all ${isLight ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}`}
            aria-label="Toggle Theme"
        >
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
        </button>
    ) : null;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md ${isLight ? 'border-b border-gray-200 bg-white/95' : 'border-b border-white/10 bg-[#0c0f16]/90'}`}
        >
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2 group">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#20263A] flex items-center justify-center shadow-md border border-white/10 group-hover:scale-105 transition-transform shrink-0">
                        <img 
                            src="/logo-icon.png" 
                            alt="Hire1Percent logo" 
                            width="40"
                            height="40"
                            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                            className="w-full h-full object-cover object-top" 
                        />
                    </div>
                    <span className={`text-xl font-extrabold tracking-tight transition-all ${isLight ? 'text-[#20263A]' : 'text-white'}`}>
                        Hire<span className="text-[#C99A45]">1Percent</span>
                    </span>
                </Link>
                <div className="hidden xl:flex items-center space-x-4">
                    <a href="/#how-it-works" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>How it works</a>
                    <a href="/#anti-cheat" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>4-Layer Anti-Cheat</a>
                    <a href="/#elite-talent" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>Elite Talent</a>
                    <a href="/#operations" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>Operations</a>
                    <a href="/#safety" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>Safety</a>
                    <Link to="/sample-report" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>Sample Report</Link>
                    <Link to="/pricing" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>Pricing</Link>
                    <Link to="/blog" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>Blog</Link>
                    <Link to="/contact" className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>Contact</Link>

                    <div className="flex items-center space-x-2 pl-2">
                        {themeToggle}
                        {user ? (
                            <Link to={user.role === 'recruiter' ? '/recruiter' : '/seeker'} className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className={`px-2 py-2 text-sm font-medium transition-colors ${isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>
                                    Sign In
                                </Link>
                                <Link to="/signup" className={`px-2 py-2 text-sm font-medium transition-colors ${isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}>
                                    Sign Up
                                </Link>
                                <Link to="/?book-demo=true" className="px-4 py-2 text-xs font-bold rounded-xl bg-[#20263A] text-[#E6BC6B] hover:bg-[#2c344e] border border-[#E6BC6B]/30 shadow-sm transition-all duration-200">
                                    Book Demo ↗
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Hamburger for Mobile */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`xl:hidden p-2 transition-colors ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}`}
                    aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={isMenuOpen}
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
            <div
                style={{ maxHeight: isMenuOpen ? '80vh' : 0 }}
                className={`xl:hidden overflow-y-auto transition-all duration-300 ease-in-out ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${isLight ? 'border-t border-gray-200 bg-white' : 'border-t border-white/10 bg-[#0c0f16]'}`}
            >
                <div className="flex flex-col p-6 space-y-4">
                    <a href="/#how-it-works" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>How it works</a>
                    <a href="/#anti-cheat" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>4-Layer Anti-Cheat</a>
                    <a href="/#elite-talent" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Elite Talent</a>
                    <a href="/#operations" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Operations</a>
                    <a href="/#safety" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Safety</a>
                    <Link to="/sample-report" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Sample Report</Link>
                    <Link to="/pricing" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Pricing</Link>
                    <Link to="/blog" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Blog</Link>
                    <Link to="/contact" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Contact</Link>
                    {onToggleTheme && (
                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    onToggleTheme();
                                    setIsMenuOpen(false);
                                }}
                                className={`inline-flex items-center justify-center rounded-full border w-10 h-10 transition-all ${isLight ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}`}
                                aria-label="Toggle Theme"
                            >
                                {isLight ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                        </div>
                    )}
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
                                <Link to="/login" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Sign In</Link>
                                <Link to="/signup" onClick={() => setIsMenuOpen(false)} className={isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'}>Sign Up</Link>
                                <Link to="/?book-demo=true" onClick={() => setIsMenuOpen(false)} className="py-2.5 text-center text-xs font-bold rounded-xl bg-[#20263A] text-[#E6BC6B] border border-[#E6BC6B]/30">Book Demo ↗</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
