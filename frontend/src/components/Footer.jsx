import React from 'react';
import { Link } from 'react-router-dom';
import { SOCIAL_LINKS } from '../config';

const Footer = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';
    const linkColor = isLight ? 'text-gray-600 hover:text-blue-600' : 'text-gray-400 hover:text-white';
    const headingColor = isLight ? 'text-gray-900' : 'text-white';
    const borderColor = isLight ? 'border-gray-200' : 'border-white/10';

    const handleOpenCookieSettings = (e) => {
        e.preventDefault();
        window.dispatchEvent(new Event('open-cookie-settings'));
    };

    return (
        <footer 
            className={`py-16 transition-colors ${isLight ? 'border-t border-gray-200 bg-gray-50/80' : 'border-t border-white/10 bg-[#0a0d14]'}`}
            aria-label="Site Footer"
        >
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
                    {/* Brand & Descriptor Column */}
                    <div className="lg:col-span-2 space-y-4">
                        <Link to="/" className="flex items-center space-x-2 group w-fit" aria-label="Hire1Percent Home">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0c0f16] flex items-center justify-center shadow-lg border border-white/10 shrink-0">
                                <img 
                                    src="/logo-icon.webp" 
                                    alt="Hire1Percent icon" 
                                    width="32"
                                    height="32"
                                    onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                                    className="w-full h-full object-cover object-top scale-110" 
                                />
                            </div>
                            <span className={`font-extrabold text-base tracking-widest uppercase ${headingColor}`}>Hire1Percent</span>
                        </Link>
                        <p className={`text-sm leading-relaxed max-w-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Technical assessment platform with 4-layer anti-cheat. Assess how candidates code, adapt to live requirement changes, and defend their decisions through AI code defense—before you book the interview.
                        </p>
                        <div className="pt-2">
                            <Link 
                                to="/book-demo?placement=footer" 
                                className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
                                aria-label="Book a Live Demo from Footer"
                            >
                                Schedule a 15-Minute Live Demo &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* Product & Assessment Column */}
                    <nav aria-label="Assessment & Platform" className="space-y-3">
                        <p className={`text-xs font-black uppercase tracking-wider ${headingColor}`}>Assessment Platform</p>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link to="/#how-it-works" className={`${linkColor} transition-colors block`}>How It Works</Link></li>
                            <li><Link to="/#anti-cheat" className={`${linkColor} transition-colors block`}>4-Layer Anti-Cheat</Link></li>
                            <li><Link to="/sample-scorecard" className={`${linkColor} transition-colors block font-medium`}>Sample Report</Link></li>
                            <li><Link to="/#api-webhooks" className={`${linkColor} transition-colors block`}>API &amp; Webhooks</Link></li>
                            <li><Link to="/for-engineers" className={`${linkColor} transition-colors block`}>For Engineers</Link></li>
                            <li><Link to="/pricing" className={`${linkColor} transition-colors block`}>Pricing &amp; Plans</Link></li>
                        </ul>
                    </nav>

                    {/* Candidates & Trust Column */}
                    <nav aria-label="Candidates & Security" className="space-y-3">
                        <p className={`text-xs font-black uppercase tracking-wider ${headingColor}`}>Candidates &amp; Security</p>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link to="/for-engineers" className={`${linkColor} transition-colors block`}>Candidate Prep Guide</Link></li>
                            <li><Link to="/security" className={`${linkColor} transition-colors block`}>Security &amp; Privacy</Link></li>
                            <li><Link to="/contact?topic=assessment-support" className={`${linkColor} transition-colors block`}>Assessment Support</Link></li>
                            <li><Link to="/career-hub" className={`${linkColor} transition-colors block`}>Career Hub</Link></li>
                            <li><Link to="/blog" className={`${linkColor} transition-colors block`}>Engineering Blog</Link></li>
                        </ul>
                    </nav>

                    {/* Legal & Governance Column */}
                    <nav aria-label="Legal & Privacy" className="space-y-3">
                        <p className={`text-xs font-black uppercase tracking-wider ${headingColor}`}>Legal &amp; Preferences</p>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link to="/privacy" className={`${linkColor} transition-colors block`}>Privacy Policy</Link></li>
                            <li><Link to="/terms" className={`${linkColor} transition-colors block`}>Terms of Service</Link></li>
                            <li><Link to="/cookies" className={`${linkColor} transition-colors block`}>Cookie Policy</Link></li>
                            <li>
                                <button 
                                    onClick={handleOpenCookieSettings} 
                                    className={`${linkColor} transition-colors text-left text-sm cursor-pointer p-0 bg-transparent border-0`}
                                    aria-label="Open cookie preferences dialog"
                                >
                                    Cookie settings
                                </button>
                            </li>
                            <li><Link to="/contact" className={`${linkColor} transition-colors block`}>Contact Us</Link></li>
                        </ul>
                    </nav>
                </div>

                {/* Bottom row */}
                <div className={`pt-8 border-t ${borderColor} flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                    <p>&copy; 2026 Hire1Percent. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        {SOCIAL_LINKS.twitter && (
                            <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Twitter</a>
                        )}
                        {SOCIAL_LINKS.linkedin && (
                            <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">LinkedIn</a>
                        )}
                        {SOCIAL_LINKS.github && (
                            <a href={SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">GitHub</a>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
