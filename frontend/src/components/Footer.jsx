import React from 'react';
import { Link } from 'react-router-dom';

const Footer = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';
    const linkColor = isLight ? 'text-gray-600 hover:text-blue-600' : 'text-gray-400 hover:text-white';
    const headingColor = isLight ? 'text-gray-900' : 'text-white';
    const borderColor = isLight ? 'border-gray-200' : 'border-white/10';

    return (
        <footer className={`py-16 ${isLight ? 'border-t border-gray-200 bg-gray-50/70' : 'border-t border-white/10 bg-[#0a0d14]'}`}>
            <div className="container mx-auto px-6 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
                    {/* Brand Column */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center space-x-2">
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
                        </div>
                        <p className={`text-sm leading-relaxed max-w-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Enterprise AI recruitment and technical assessment platform. Unifying proctored coding exams, asynchronous AI video interviews, and semantic resume intelligence into a single streamlined pipeline.
                        </p>
                        <div className="pt-2">
                            <Link 
                                to="/?book-calibration=true" 
                                className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
                            >
                                Schedule a 15-Minute Live Demo &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* Solutions Column */}
                    <nav aria-label="Solutions Links" className="space-y-3">
                        <p className={`text-xs font-black uppercase tracking-wider ${headingColor}`}>Platform Solutions</p>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/ai-interview-platform" className={`${linkColor} transition-colors block`}>AI Interview Platform</Link></li>
                            <li><Link to="/ai-recruitment-software" className={`${linkColor} transition-colors block`}>AI Recruitment Software</Link></li>
                            <li><Link to="/candidate-screening" className={`${linkColor} transition-colors block`}>Candidate Screening</Link></li>
                            <li><Link to="/resume-analysis" className={`${linkColor} transition-colors block`}>Resume Intelligence</Link></li>
                            <li><Link to="/automated-hiring" className={`${linkColor} transition-colors block`}>Automated Hiring</Link></li>
                        </ul>
                    </nav>

                    {/* Company Column */}
                    <nav aria-label="Company Links" className="space-y-3">
                        <p className={`text-xs font-black uppercase tracking-wider ${headingColor}`}>Company &amp; Resources</p>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/about" className={`${linkColor} transition-colors block`}>About Hire1Percent</Link></li>
                            <li><Link to="/pricing" className={`${linkColor} transition-colors block`}>Pricing &amp; Plans</Link></li>
                            <li><Link to="/blog" className={`${linkColor} transition-colors block`}>Technical Blog</Link></li>
                            <li><Link to="/career-hub" className={`${linkColor} transition-colors block`}>Candidate Career Hub</Link></li>
                            <li><Link to="/contact" className={`${linkColor} transition-colors block`}>Contact &amp; Support</Link></li>
                        </ul>
                    </nav>

                    {/* Legal Column */}
                    <nav aria-label="Legal Links" className="space-y-3">
                        <p className={`text-xs font-black uppercase tracking-wider ${headingColor}`}>Trust &amp; Legal</p>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/privacy" className={`${linkColor} transition-colors block`}>Privacy Policy</Link></li>
                            <li><Link to="/terms" className={`${linkColor} transition-colors block`}>Terms of Service</Link></li>
                            <li><Link to="/cookies" className={`${linkColor} transition-colors block`}>Cookie Policy</Link></li>
                        </ul>
                    </nav>
                </div>

                {/* Bottom row */}
                <div className={`pt-8 border-t ${borderColor} flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                    <p>&copy; 2026 Hire1Percent. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <a href="https://twitter.com/hire1percent" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Twitter</a>
                        <a href="https://linkedin.com/company/hire1percent" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">LinkedIn</a>
                        <a href="https://github.com/hire1percent" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">GitHub</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
