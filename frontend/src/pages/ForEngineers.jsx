import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    CheckCircle2, AlertTriangle, ShieldCheck, 
    Code, Terminal, Clock, Camera, HelpCircle, 
    ArrowRight, Lock, Laptop, Check, Info
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { V5_CANDIDATE_PREP } from '../utils/v5Content';

const ForEngineers = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('landing-theme') || 'dark');
    const isLight = theme === 'light';

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0a0d14] text-white'}`}>
            <SEO 
                title="Candidate Preparation Guide | Hire1Percent"
                description="Everything you need to know before your Hire1Percent technical assessment. Review the 5-step process, permitted tools, live requirement update, and 3-minute code defense."
                canonical="https://www.hire1percent.com/for-engineers"
            />

            <Navbar theme={theme} onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')} />

            <main className="flex-grow pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-4xl">
                    {/* Header */}
                    <div className="text-center space-y-4 mb-14">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-bold tracking-widest uppercase">
                            <Code className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Candidate Resource</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            {V5_CANDIDATE_PREP.heading}
                        </h1>
                        <p className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            {V5_CANDIDATE_PREP.subheading}
                        </p>
                    </div>

                    {/* Critical Warning Callout */}
                    <div className="mb-12 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-start gap-3 leading-relaxed">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                            <strong className="block font-semibold mb-1 text-amber-200">Security Warning:</strong>
                            {V5_CANDIDATE_PREP.warning}
                        </div>
                    </div>

                    {/* 5-Step Process Sequence */}
                    <div className="space-y-6 mb-16">
                        {V5_CANDIDATE_PREP.steps.map((step) => (
                            <div 
                                key={step.number}
                                className={`p-6 sm:p-8 rounded-3xl border transition-all flex flex-col sm:flex-row items-start gap-6 ${
                                    isLight 
                                        ? 'bg-white border-gray-200 shadow-sm' 
                                        : 'bg-[#101422] border-white/10'
                                }`}
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg font-mono shrink-0 shadow-lg shadow-blue-500/20">
                                    {step.number}
                                </div>
                                <div className="space-y-2 flex-1">
                                    <h2 className="text-lg sm:text-xl font-bold">
                                        {step.title}
                                    </h2>
                                    <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Key Assessment Details & Permitted Tools */}
                    <div className={`p-8 rounded-3xl border mb-12 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Laptop className="w-5 h-5 text-blue-400" />
                            <span>Permitted Tools &amp; Environment Guidelines</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                            <div className="space-y-3">
                                <h3 className="font-bold text-emerald-400 uppercase tracking-wider text-xs">Permitted Resources</h3>
                                <ul className="space-y-2 text-gray-300">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Standard language documentation &amp; manual pages</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Built-in browser code editor autocomplete &amp; diagnostics</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Scratchpad paper and pens for notes</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-rose-400 uppercase tracking-wider text-xs">Restricted Activities</h3>
                                <ul className="space-y-2 text-gray-300">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                        <span>External generative AI assistants (ChatGPT, Claude, Copilot)</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                        <span>Bulk pasting code from outside the assessment environment</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                        <span>Secondary monitors or unauthorized third-party presence</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Support & Accommodations */}
                    <div className="text-center p-8 rounded-3xl bg-blue-500/10 border border-blue-500/20 space-y-4">
                        <HelpCircle className="w-8 h-8 text-blue-400 mx-auto" aria-hidden="true" />
                        <h2 className="text-xl font-bold">Need Accommodations or Technical Assistance?</h2>
                        <p className={`text-xs sm:text-sm max-w-xl mx-auto leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                            {V5_CANDIDATE_PREP.support_text} Our candidate support team is available to ensure an accessible and fair assessment process.
                        </p>
                        <div className="pt-2">
                            <Link 
                                to={V5_CANDIDATE_PREP.support_link}
                                className="px-6 py-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all inline-flex items-center gap-2"
                            >
                                <span>Contact Assessment Support</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer theme={theme} />
        </div>
    );
};

export default ForEngineers;
