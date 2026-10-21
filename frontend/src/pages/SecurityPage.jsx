import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Shield, Lock, Key, Server, Eye, FileText, 
    CheckCircle2, AlertTriangle, ArrowRight, Mail, HardDrive
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const SecurityPage = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('landing-theme') || 'dark');
    const isLight = theme === 'light';

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0a0d14] text-white'}`}>
            <SEO 
                title="Security & Data Privacy | Hire1Percent"
                description="Explore Hire1Percent's data security architecture, sensitive telemetry protection, candidate privacy policies, and encryption standards."
                canonical="https://www.hire1percent.com/security"
            />

            <Navbar theme={theme} onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')} />

            <main className="flex-grow pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-5xl">
                    {/* Header */}
                    <div className="text-center space-y-4 mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase">
                            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Security &amp; Data Governance</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            Platform Security &amp; Candidate Privacy
                        </h1>
                        <p className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Hire1Percent is designed from the ground up to protect candidate privacy while delivering uncompromising technical integrity verification to hiring teams.
                        </p>
                    </div>

                    {/* Core Security Principles Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                        <div className={`p-8 rounded-3xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#101422] border-white/10'}`}>
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Encryption in Transit &amp; at Rest</h2>
                            <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                All traffic between candidates, recruiters, and the Hire1Percent API is encrypted using TLS 1.3 with modern cipher suites. Persistent database storage and telemetry artifacts are encrypted at rest with AES-256 keys.
                            </p>
                        </div>

                        <div className={`p-8 rounded-3xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#101422] border-white/10'}`}>
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-6">
                                <Key className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Signed Invitation Tokens &amp; RBAC</h2>
                            <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                Candidate assessment links use cryptographically signed, single-use invitation tokens that expire upon submission or deadline. Recruiter and administrator dashboards enforce strict role-based access control (RBAC).
                            </p>
                        </div>

                        <div className={`p-8 rounded-3xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#101422] border-white/10'}`}>
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
                                <Eye className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Sensitive Telemetry Protection</h2>
                            <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                Biometric signals (face presence, gaze direction) and keystroke telemetry are captured strictly during the active assessment session. Telemetry is used exclusively to evaluate authorship and is never used for automated bias profiling.
                            </p>
                        </div>

                        <div className={`p-8 rounded-3xl border ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#101422] border-white/10'}`}>
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
                                <HardDrive className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold mb-3">Data Minimization &amp; Retention</h2>
                            <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                We collect only the telemetry strictly required to verify test integrity. Candidate audio, video prompts, and code snapshots adhere to client-configurable retention schedules, after which raw session media is purged.
                            </p>
                        </div>
                    </div>

                    {/* Sensitive Assessment Data Policy Callout */}
                    <div className={`p-8 sm:p-10 rounded-3xl border mb-16 ${
                        isLight ? 'bg-blue-50/60 border-blue-200' : 'bg-blue-950/20 border-blue-500/30'
                    }`}>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                            <Shield className="w-5 h-5" />
                            <span>Candidate Data Governance Standards</span>
                        </h2>
                        <ul className="space-y-3 text-xs sm:text-sm text-gray-300">
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span><strong>Isolated Public Samples:</strong> Public demonstrations and sample scorecards use strictly deterministic, fictional fixtures (such as <code className="text-blue-300 font-mono">backend_events_v5</code>). Real candidate records are never exposed publicly.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span><strong>Candidate Disclosure:</strong> Candidates receive upfront notice regarding recording, keystroke logging, and AI code defense before initiating their assessment session.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                <span><strong>Security Contact:</strong> Dedicated vulnerability disclosure channel for security researchers and enterprise security inquiries.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Security Support & Legal Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className={`p-6 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-2">Legal Governance</h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Review our authoritative legal commitments and user rights:
                            </p>
                            <div className="flex gap-4 text-xs font-semibold">
                                <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy &rarr;</Link>
                                <Link to="/terms" className="text-blue-400 hover:underline">Terms of Service &rarr;</Link>
                                <Link to="/cookies" className="text-blue-400 hover:underline">Cookie Policy &rarr;</Link>
                            </div>
                        </div>

                        <div className={`p-6 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-300 mb-2">Security Inquiries</h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Questions about our security architecture or compliance questionnaires?
                            </p>
                            <Link 
                                to="/contact?topic=security" 
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
                            >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Contact Security &amp; Compliance Team &rarr;</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer theme={theme} />
        </div>
    );
};

export default SecurityPage;
