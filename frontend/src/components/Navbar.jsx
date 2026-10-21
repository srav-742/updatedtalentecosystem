import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ theme = 'dark', onToggleTheme }) => {
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
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
        window.addEventListener('storage', updateAuth);
        return () => window.removeEventListener('storage', updateAuth);
    }, []);

    // Handle hash scrolling for on-page anchor navigation (resilient to lazy load delays)
    useEffect(() => {
        if (!location.hash) return;
        const id = location.hash.replace('#', '');
        let attempts = 0;
        const maxAttempts = 20; // 20 * 50ms = 1 second window
        const interval = setInterval(() => {
            attempts++;
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                clearInterval(interval);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 50);
        return () => clearInterval(interval);
    }, [location]);

    const themeToggle = onToggleTheme ? (
        <button
            onClick={onToggleTheme}
            className={`inline-flex items-center justify-center rounded-full border w-10 h-10 transition-all ${isLight ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'}`}
            aria-label="Toggle Theme"
        >
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
        </button>
    ) : null;

    const navLinkClass = `text-sm font-medium transition-colors ${
        isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'
    }`;

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-colors ${isLight ? 'border-b border-gray-200 bg-white/90' : 'border-b border-white/10 bg-[#0c0f16]/90'}`}
            aria-label="Main Navigation"
        >
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2 group" aria-label="Hire1Percent Home">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0c0f16] flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/10 group-hover:scale-105 transition-transform shrink-0">
                        <img 
                            src="/logo-icon.webp" 
                            alt="Hire1Percent icon" 
                            width="40"
                            height="40"
                            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                            className="w-full h-full object-cover object-top scale-110" 
                        />
                    </div>
                    <span className={`text-xl font-bold bg-clip-text text-transparent transition-all ${isLight ? 'bg-gradient-to-r from-gray-900 to-gray-500 group-hover:from-blue-600 group-hover:to-teal-500' : 'bg-gradient-to-r from-white to-white/70 group-hover:from-blue-400 group-hover:to-teal-400'}`}>
                        hire1percent
                    </span>
                </Link>

                {/* V5 Desktop Navigation */}
                <div className="hidden lg:flex items-center space-x-7">
                    <Link to="/#how-it-works" className={navLinkClass}>How It Works</Link>
                    <Link to="/#anti-cheat" className={navLinkClass}>4-Layer Anti-Cheat</Link>
                    <Link to="/sample-scorecard" className={navLinkClass}>Sample Report</Link>
                    <Link to="/#candidate-experience" className={navLinkClass}>Candidate Experience</Link>
                    <Link to="/pricing" className={navLinkClass}>Pricing</Link>

                    <div className="flex items-center space-x-4 pl-2">
                        {themeToggle}
                        {user ? (
                            <Link 
                                to={user.role === 'recruiter' ? '/recruiter' : '/candidate'} 
                                className={`text-sm font-medium transition-colors ${isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link 
                                to="/login" 
                                className={`px-4 py-2 text-sm font-medium transition-colors ${isLight ? 'text-gray-700 hover:text-blue-600' : 'text-gray-300 hover:text-white'}`}
                            >
                                Log in
                            </Link>
                        )}
                        <Link 
                            to="/book-demo?placement=header" 
                            className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            aria-label="Book a Live Demo"
                        >
                            Book a Demo
                        </Link>
                    </div>
                </div>

                {/* Mobile Menu Hamburger */}
                <div className="flex items-center space-x-2 lg:hidden">
                    {themeToggle}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`p-2 rounded-lg transition-colors ${isLight ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-white/10'}`}
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
            </div>

            {/* Mobile Menu Dropdown */}
            <div
                className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'} ${isLight ? 'border-t border-gray-200 bg-white' : 'border-t border-white/10 bg-[#0c0f16]'}`}
            >
                <div className="flex flex-col p-6 space-y-4">
                    <Link 
                        to="/#how-it-works" 
                        onClick={() => setIsMenuOpen(false)} 
                        className={navLinkClass}
                    >
                        How It Works
                    </Link>
                    <Link 
                        to="/#anti-cheat" 
                        onClick={() => setIsMenuOpen(false)} 
                        className={navLinkClass}
                    >
                        4-Layer Anti-Cheat
                    </Link>
                    <Link 
                        to="/sample-scorecard" 
                        onClick={() => setIsMenuOpen(false)} 
                        className={navLinkClass}
                    >
                        Sample Report
                    </Link>
                    <Link 
                        to="/#candidate-experience" 
                        onClick={() => setIsMenuOpen(false)} 
                        className={navLinkClass}
                    >
                        Candidate Experience
                    </Link>
                    <Link 
                        to="/pricing" 
                        onClick={() => setIsMenuOpen(false)} 
                        className={navLinkClass}
                    >
                        Pricing
                    </Link>

                    <div className="pt-3 border-t border-white/10 flex flex-col space-y-3">
                        {user ? (
                            <Link
                                to={user.role === 'recruiter' ? '/recruiter' : '/candidate'}
                                onClick={() => setIsMenuOpen(false)}
                                className={navLinkClass}
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <Link 
                                to="/login" 
                                onClick={() => setIsMenuOpen(false)} 
                                className={navLinkClass}
                            >
                                Log in
                            </Link>
                        )}
                        <Link 
                            to="/book-demo?placement=header" 
                            onClick={() => setIsMenuOpen(false)} 
                            className="w-full py-3 text-center text-sm font-semibold bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-xl shadow-lg shadow-blue-500/20"
                            aria-label="Book a Live Demo"
                        >
                            Book a Live Demo
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
