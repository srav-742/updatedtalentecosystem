import React, { useState, useEffect } from 'react';
import { 
    Zap, CheckCircle2, AlertTriangle, ShieldCheck, 
    FileText, Video, ChevronDown, Sparkles, 
    Code, Award, ArrowRight, Target, Clock, AlertCircle,
    FileSpreadsheet, LayoutDashboard, CreditCard, BotMessageSquare, 
    TrendingDown, Calendar, ChevronRight, X, Check, Minus
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CalibrationModal from '../components/CalibrationModal';

const AssessmentsHome = () => {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'light';
        return localStorage.getItem('landing-theme') || 'light';
    });
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('landing-theme', theme);
    }, [theme]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('book-calibration') === 'true') {
            setIsModalOpen(true);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const isLight = theme === 'light';

    const [activeFaq, setActiveFaq] = useState(null);

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
    };

    const painPoints = [
        {
            icon: FileText,
            color: "orange",
            title: "Resume Noise Overload",
            desc: "Sifting through hundreds of AI-generated resumes for a single engineering opening while top developers drop out of slow, friction-heavy pipelines."
        },
        {
            icon: BotMessageSquare,
            color: "amber",
            title: "Cheating & AI Test Fraud",
            desc: "Unproctored coding assessments allow candidates to use external AI assistants, copy-paste answers, or switch tabs, resulting in artificial screening scores."
        },
        {
            icon: Clock,
            color: "purple",
            title: "Manager Review Bottlenecks",
            desc: "Waiting days for busy engineering leads to join preliminary sync calls just to evaluate basic candidate communication before the real interviews can begin."
        },
        {
            icon: CreditCard,
            color: "rose",
            title: "The Multi-Tool Stack Tax",
            desc: "Paying separate monthly subscriptions for an ATS, coding test platform, video interview software, and verification plugins — with separate logins and zero integration."
        }
    ];

    const colorMap = {
        rose:   { bg: 'bg-rose-500/10',   icon: 'text-rose-400',   border: 'border-rose-500/20'   },
        amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-400',  border: 'border-amber-500/20'  },
        orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20' },
        purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
    };

    const comparisonRows = [
        { feature: "AI Resume Parsing & Scoring",       legacy: { label: "Requires separate ATS",     status: "no"      }, h1p: { label: "Built-in",          status: "yes" } },
        { feature: "Proctored Technical Tests",         legacy: { label: "Expensive point solution",  status: "partial" }, h1p: { label: "Built-in",          status: "yes" } },
        { feature: "Anti-Cheating Proctoring Engine",   legacy: { label: "Third-party plugin needed", status: "no"      }, h1p: { label: "Tab-switch & Focus tracking",  status: "yes" } },
        { feature: "Async Video Mock Interviews",       legacy: { label: "Separate SaaS bill",        status: "no"      }, h1p: { label: "Built-in",          status: "yes" } },
        { feature: "Unified Candidate Dashboard",       legacy: { label: "Fragmented across tools",   status: "partial" }, h1p: { label: "Single Platform",   status: "yes" } },
        { feature: "Workflow Friction",                 legacy: { label: "High (Multiple logins)",    status: "no"      }, h1p: { label: "Zero friction",     status: "yes" } },
    ];

    const StatusIcon = ({ status }) => {
        if (status === 'yes')     return <Check size={15} className="text-emerald-400 shrink-0" />;
        if (status === 'no')      return <X     size={15} className="text-rose-400 shrink-0" />;
        return                           <Minus size={15} className="text-amber-400 shrink-0" />;
    };

    const StatusLabel = ({ status, label }) => {
        const color = status === 'yes' ? (isLight ? 'text-emerald-700' : 'text-emerald-400')
                    : status === 'no'  ? (isLight ? 'text-rose-600'    : 'text-rose-400')
                    :                    (isLight ? 'text-amber-700'   : 'text-amber-400');
        return <span className={`text-[10px] font-semibold ${color}`}>{label}</span>;
    };

    const faqs = [
        { 
            q: "How does the AI validate session integrity?", 
            a: "Our proctoring engine monitors workspace focus (tracking tab switches, window blur, and fullscreen exits) and webcam streams (detecting eye movements, face presence, and phone use). It also checks system telemetry to detect secondary monitors and hardware changes mid-test."
        },
        { 
            q: "Are the assessment questions unique?", 
            a: "Yes. Our AI engine dynamically constructs custom assessments based on your exact job descriptions. This guarantees that assessment questions are unique and fresh, preventing search engine leaks." 
        },
        { 
            q: "Who can view the candidate scores and reports?", 
            a: "The detailed Candidate Insight Report—comprising MCQ scoring, AI interview dialogue transcripts, and session integrity data—is generated exclusively for the recruiter dashboard. Candidates do not see their numeric scores; they are only notified of their final status." 
        },
        { 
            q: "Can candidates take this assessment on mobile?", 
            a: "For general candidate assessments and strict verification checks, candidates are required to use a webcam-equipped laptop or desktop computer." 
        }
    ];

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-white text-gray-900 selection:bg-blue-500/20' : 'bg-[#0c0f16] text-white selection:bg-blue-500/30'}`}>
            <Navbar theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />

            {/* ─── SECTION 1: HERO ─── */}
            <section className="relative pt-32 pb-24 overflow-hidden">
                <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] -z-10 ${isLight ? 'bg-blue-200/40' : 'bg-blue-600/10'}`} />
                <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[110px] -z-10 ${isLight ? 'bg-teal-100/50' : 'bg-teal-500/10'}`} />

                <div className="container mx-auto px-6 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 ${isLight ? 'border-blue-200 bg-blue-50' : 'border-blue-500/30 bg-blue-500/5'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                            Unified AI Technical Screening &amp; Proctored Assessments
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight leading-[1.08] max-w-5xl mx-auto">
                        Filter the Top 1% Tech Talent.<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400">
                            Unified Pipelines.
                        </span>
                        <br />
                        <span className={isLight ? 'text-gray-700' : 'text-gray-200'}>Zero Tool Bloat.</span>
                    </h1>

                    <p className={`max-w-2xl mx-auto text-lg md:text-xl mb-12 leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Replace fragmented recruitment tools with one unified AI driven Pipeline. Automatically rank candidates, run proctored technical assessments with native anti-cheating detection, and conduct async video interviews — all in one place.
                    </p>

                    <div className="flex flex-col items-center gap-5 mb-12">
                        <button
                            id="hero-cta-demo"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all duration-300 shadow-2xl shadow-blue-500/25 transform hover:-translate-y-0.5 text-base"
                        >
                            <Calendar size={18} />
                            Book a 15-Minute Live Demo
                        </button>

                        <div className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            <span className="flex items-center gap-1.5">⏱️ 5-Minute Setup</span>
                            <span className={`w-px h-3 ${isLight ? 'bg-gray-300' : 'bg-white/20'}`} />
                            <span className="flex items-center gap-1.5">🛡️ Anti-Cheating Proctored Assessments</span>
                            <span className={`w-px h-3 ${isLight ? 'bg-gray-300' : 'bg-white/20'}`} />
                            <span className="flex items-center gap-1.5">✅ No Tool Switching</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {[
                            { value: "70%",  label: "Reduction in Time-to-Hire" },
                            { value: "100%", label: "Proctoring Integrity" },
                            { value: "Zero", label: "Tool Bloat" },
                            { value: "10x",  label: "Faster Quality Hires" }
                        ].map((stat, idx) => (
                            <div key={idx} className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 ${isLight ? 'bg-gray-50/70 border-gray-100 hover:bg-white hover:shadow-sm' : 'bg-white/5 border-white/5 hover:bg-white/8'}`}>
                                <p className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400 mb-1">{stat.value}</p>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 2: AGITATION ─── */}
            <section className={`py-24 border-y ${isLight ? 'bg-gray-50/40 border-gray-100' : 'bg-[#0f131c] border-white/5'}`}>
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-rose-500/20 bg-rose-500/8 text-rose-400'}`}>
                            <AlertTriangle size={12} /> The Problem
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                            Modern Tech Hiring is Broken by{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-400">
                                SaaS Bloat and Unverified Skills
                            </span>
                        </h2>
                        <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            The traditional technical recruitment pipeline is leaking time and money at every stage.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                        {painPoints.map((pain, idx) => {
                            const Icon = pain.icon;
                            const c = colorMap[pain.color];
                            return (
                                <div key={idx} className={`p-7 rounded-[1.75rem] border transition-all duration-300 hover:-translate-y-1 ${isLight ? 'bg-white border-gray-200 hover:shadow-md' : 'bg-white/4 border-white/8 hover:bg-white/6'}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${c.bg} border ${c.border}`}>
                                        <Icon className={`w-5 h-5 ${c.icon}`} />
                                    </div>
                                    <h3 className="text-lg font-black mb-2 tracking-tight">{pain.title}</h3>
                                    <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{pain.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 3: UNIQUE MECHANISM ─── */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-blue-500/20 bg-blue-500/8 text-blue-400'}`}>
                            <Zap size={12} /> How It Works
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                            One Unified Pipeline.<br />{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">Total Evaluation Integrity.</span>
                        </h2>
                        <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Hire 1% eliminates tool switching by consolidating resume parsing, technical evaluation, and candidate review into three seamless steps.
                        </p>
                    </div>

                    {/* Pipeline flow */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-16 max-w-4xl mx-auto">
                        {[
                            { n: "01", label: "AI Resume Parse",      color: "blue"   },
                            { n: "02", label: "Proctored Assessment",   color: "teal"   },
                            { n: "03", label: "Async Video Interview", color: "purple" }
                        ].map((s, idx) => (
                            <React.Fragment key={idx}>
                                <div className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border font-bold text-sm whitespace-nowrap ${
                                    s.color === 'blue'   ? (isLight ? 'bg-blue-50   border-blue-200   text-blue-700'   : 'bg-blue-500/10   border-blue-500/25   text-blue-300')   :
                                    s.color === 'teal'   ? (isLight ? 'bg-teal-50   border-teal-200   text-teal-700'   : 'bg-teal-500/10   border-teal-500/25   text-teal-300')   :
                                                           (isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-500/10 border-purple-500/25 text-purple-300')
                                }`}>
                                    <span className="text-[10px] font-black opacity-50">Step {s.n}</span>
                                    <span>{s.label}</span>
                                </div>
                                {idx < 2 && <ChevronRight className={`w-5 h-5 shrink-0 hidden md:block ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* 3 Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            {
                                icon: FileSpreadsheet, color: "blue", step: "01",
                                title: "Automated Resume Parsing & Skill Alignment",
                                desc: "Stop manually reading every PDF. Our AI engine parses candidate resumes, extracts core stack competencies, and automatically ranks applicants against your role requirements — dropping resume noise immediately.",
                                bullets: ["Skill extraction & gap analysis", "Auto-rank against role requirements", "Removes AI-generated resume noise"]
                            },
                            {
                                icon: ShieldCheck, color: "teal", step: "02",
                                title: "Proctored AI Technical Assessments",
                                desc: "Deploy coding evaluations with active session integrity verification. Our engine monitors the candidate workspace to verify honest, native code execution and prevent test manipulation.",
                                bullets: ["Real-time browser focus tracking", "Tab-switch detection validation", "Biometric face verification checks"]
                            },
                            {
                                icon: Video, color: "purple", step: "03",
                                title: "Async Video Interviews & Dashboard Review",
                                desc: "Candidates complete AI-generated mock interview questions at their own pace. Logged-in hiring teams review the complete candidate evaluation — MCQ scores, validation summary, and full video interview — all in one unified recruiter dashboard.",
                                bullets: ["Candidates record on their own schedule", "AI scores answers automatically", "Full picture available in the recruiter dashboard"]
                            }
                        ].map((card, idx) => {
                            const Icon = card.icon;
                            const bgMap   = { blue: 'bg-blue-500/10',   teal: 'bg-teal-500/10',   purple: 'bg-purple-500/10'   };
                            const bdrMap  = { blue: 'border-blue-500/20', teal: 'border-teal-500/20', purple: 'border-purple-500/20' };
                            const icMap   = { blue: 'text-blue-400',    teal: 'text-teal-400',    purple: 'text-purple-400'    };
                            const lblMap  = { blue: 'text-blue-400',    teal: 'text-teal-400',    purple: 'text-purple-400'    };
                            return (
                                <div key={idx} className={`p-8 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 ${isLight ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-white/5 border-white/5 hover:bg-white/8'}`}>
                                    <div className={`w-12 h-12 ${bgMap[card.color]} border ${bdrMap[card.color]} rounded-xl flex items-center justify-center mb-6`}>
                                        <Icon className={`w-5 h-5 ${icMap[card.color]}`} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${lblMap[card.color]}`}>Step {card.step}</span>
                                    <h3 className="text-xl font-black mb-3 tracking-tight">{card.title}</h3>
                                    <p className={`text-sm leading-relaxed mb-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{card.desc}</p>
                                    <ul className="space-y-2.5 text-xs font-semibold">
                                        {card.bullets.map((b, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <CheckCircle2 size={13} className="text-teal-400 shrink-0" />
                                                <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 4: PROOF & INTEGRITY SHOWCASE ─── */}
            <section className={`py-24 border-t ${isLight ? 'bg-gray-50/40 border-gray-100' : 'bg-[#0f131c] border-white/5'}`}>
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400'}`}>
                            <ShieldCheck size={12} /> Proof of Performance
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                            Built for Engineering Teams Who {' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Demand Proof, Not Promises</span>
                        </h2>
                        <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Skip resume sifting and get direct, verified evaluation scores right on your dashboard.
                        </p>
                    </div>

                    {/* Artifact Mockups Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
                        {/* Artifact A: Proctoring Audit Log */}
                        <div className={`rounded-[2rem] border overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/5 border-white/8'}`}>
                            <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={14} className="text-rose-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Live Proctoring Audit Log</span>
                                </div>
                                <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">LIVE MONITORING</span>
                            </div>
                            <div className="p-6 space-y-3">
                                {[
                                    { type: "TAB SWITCH FLAGGED", time: "00:14:22", severity: "HIGH",   penalty: "+6", desc: "Candidate switched browser tabs temporarily" },
                                    { type: "EYE LOOKING AWAY",   time: "00:08:08", severity: "MEDIUM", penalty: "+4", desc: "Rhythmic horizontal eye movement detected" },
                                    { type: "HEAD TURNED",         time: "00:08:26", severity: "MEDIUM", penalty: "+3", desc: "Head turned excessively to the right" }
                                ].map((log, i) => (
                                    <div key={i} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${isLight ? 'bg-rose-50/60 border-rose-100' : 'bg-rose-500/5 border-rose-500/15'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.severity === 'HIGH' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                                <p className="text-[10px] font-black uppercase text-rose-400">{log.type}</p>
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${log.severity === 'HIGH' ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'}`}>{log.severity}</span>
                                            </div>
                                            <p className={`text-[10px] truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{log.desc}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-rose-400 font-extrabold text-sm">{log.penalty}</p>
                                            <p className={`text-[9px] ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{log.time}</p>
                                        </div>
                                    </div>
                                ))}
                                <p className={`text-xs leading-relaxed pt-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Every assessment generates a complete audit trail. Know exactly how candidates performed and whether they stayed focused on the test.
                                </p>
                            </div>
                        </div>                        {/* Artifact B: Recruiter Insights Dashboard */}
                        <div className={`rounded-[2rem] border overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/5 border-white/8'}`}>
                            <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                                <div className="flex items-center gap-2">
                                    <LayoutDashboard size={14} className="text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Recruiter Insights Dashboard</span>
                                </div>
                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">ACTIVE SESSION</span>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {[
                                        { val: "12", label: "Open Pipelines", color: "text-blue-500" },
                                        { val: "85%", label: "Completion Rate", color: "text-teal-400" },
                                        { val: "1,240", label: "Screened Candidates", color: "text-purple-400" }
                                    ].map((stat, idx) => (
                                        <div key={idx} className={`p-3 rounded-2xl border text-center ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-black/10 border-white/5'}`}>
                                            <p className={`text-xl font-extrabold ${stat.color}`}>{stat.val}</p>
                                            <p className="text-[8px] font-black uppercase tracking-wider text-gray-500 mt-1">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <p className={`text-xs font-black uppercase tracking-wider mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>Top Ranked Candidates</p>
                                    {[
                                        { name: "Aarav Sharma", role: "AI/ML Scientist", score: "96/100", tag: "Strongly Recommended" },
                                        { name: "Ananya Sen", role: "Senior Full-Stack Developer", score: "94/100", tag: "Strongly Recommended" },
                                        { name: "Vikram Malhotra", role: "Frontend Architect", score: "92/100", tag: "Recommended" }
                                    ].map((cand, idx) => (
                                        <div key={idx} className={`p-3 rounded-xl border flex items-center justify-between gap-4 ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'}`}>
                                            <div>
                                                <p className="font-bold text-sm">{cand.name}</p>
                                                <p className="text-[10px] text-gray-500">{cand.role}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-emerald-400 text-sm">{cand.score}</p>
                                                <p className="text-[8px] font-bold text-emerald-600/60 uppercase">{cand.tag}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {[
                            { value: "70%", label: "Reduction in overall Time-to-Hire",                 grad: "from-blue-400 to-teal-400"   },
                            { value: "100%",label: "Proctoring Audit Visibility",                      grad: "from-emerald-400 to-teal-400" },
                            { value: "Single",label: "Subscription replacing legacy point solutions",    grad: "from-purple-400 to-blue-400"  }
                        ].map((m, idx) => (
                            <div key={idx} className={`p-8 rounded-[2rem] border text-center transition-all duration-300 hover:-translate-y-1 ${isLight ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-white/5 border-white/5 hover:bg-white/8'}`}>
                                <p className={`text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${m.grad} mb-3`}>{m.value}</p>
                                <p className={`text-sm font-semibold leading-snug ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{m.label}</p>
                            </div>
                        ))}
                    </div>                </div>
            </section>

            {/* ─── SECTION 5: TOOL CONSOLIDATION TABLE ─── */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-amber-500/20 bg-amber-500/8 text-amber-400'}`}>
                            <TrendingDown size={12} /> Cost Comparison
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                            Stop Paying the<br />{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">Fragmented Tool Tax</span>
                        </h2>
                        <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Compare how Hire 1% simplifies your recruiting operations:</p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className={`rounded-[2rem] border overflow-hidden shadow-xl ${isLight ? 'border-gray-200' : 'border-white/8'}`}>
                            <div className={`grid grid-cols-3 ${isLight ? 'bg-gray-50 border-b border-gray-200' : 'bg-white/5 border-b border-white/8'}`}>
                                <div className="px-6 py-4"><p className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Feature / Capability</p></div>
                                <div className={`px-6 py-4 border-x text-center ${isLight ? 'border-gray-200' : 'border-white/8'}`}><p className="text-xs font-black uppercase tracking-wider text-rose-400">Legacy Multi-Tool Stack</p></div>
                                <div className="px-6 py-4 text-center"><p className="text-xs font-black uppercase tracking-wider text-emerald-400">Hire 1% Platform</p></div>
                            </div>
                            {comparisonRows.map((row, idx) => (
                                <div key={idx} className={`grid grid-cols-3 border-b last:border-b-0 transition-colors duration-200 ${isLight ? 'border-gray-100 hover:bg-gray-50/60' : 'border-white/5 hover:bg-white/3'}`}>
                                    <div className="px-6 py-5 flex items-center"><p className={`text-sm font-bold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{row.feature}</p></div>
                                    <div className={`px-6 py-5 border-x flex flex-col items-center justify-center gap-1 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                                        <StatusIcon status={row.legacy.status} />
                                        <StatusLabel status={row.legacy.status} label={row.legacy.label} />
                                    </div>
                                    <div className="px-6 py-5 flex flex-col items-center justify-center gap-1">
                                        <StatusIcon status={row.h1p.status} />
                                        <StatusLabel status={row.h1p.status} label={row.h1p.label} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── SECTION 6: FAQ ─── */}
            <section className={`py-24 border-t ${isLight ? 'bg-gray-50/40 border-gray-100' : 'bg-[#0f131c] border-white/5'}`}>
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Frequently Asked Questions</h2>
                        <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Everything you need to know about the hire1percent assessment platform.</p>
                    </div>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div key={index} className={`rounded-2xl border transition-all duration-300 ${isLight ? 'bg-gray-50/50 border-gray-200 hover:bg-gray-50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                <button onClick={() => toggleFaq(index)} className="w-full text-left px-6 py-5 font-bold flex items-center justify-between gap-4 text-lg">
                                    <span>{faq.q}</span>
                                    <ChevronDown size={20} className={`transition-transform duration-300 shrink-0 ${activeFaq === index ? 'rotate-180 text-blue-500' : 'text-gray-400'}`} />
                                </button>
                                <div className={`overflow-hidden transition-all duration-300 ${activeFaq === index ? 'max-h-48 opacity-100 border-t border-gray-200/50 dark:border-white/10' : 'max-h-0 opacity-0'}`}>
                                    <p className={`px-6 py-5 text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── SECTION 7: FINAL CTA ─── */}
            <section className="relative py-28 overflow-hidden">
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[150px] -z-10 ${isLight ? 'bg-blue-100/60' : 'bg-blue-600/8'}`} />
                <div className={`absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full blur-[120px] -z-10 ${isLight ? 'bg-teal-100/50' : 'bg-teal-500/8'}`} />

                <div className="container mx-auto px-6 text-center max-w-4xl">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-6 ${isLight ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-blue-500/20 bg-blue-500/8 text-blue-400'}`}>
                        <Sparkles size={12} /> Get Started Today
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-none">
                        Ready to Hire the <br/>{' '}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400">True Top 1%?</span>
                    </h2>
                    <p className={`text-base md:text-lg mb-12 max-w-2xl mx-auto leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Join forward-thinking tech teams, scale-ups, and recruitment firms using Hire 1% to automate screening and safeguard assessment integrity.
                    </p>

                    <div className={`max-w-2xl mx-auto rounded-[2rem] border p-10 mb-8 ${isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-white/4 border-white/8'}`}>
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLight ? 'bg-blue-100' : 'bg-blue-500/15'}`}>
                                <Calendar className="w-6 h-6 text-blue-500" />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-lg">Schedule a 15-Minute Demo</p>
                                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Pick a time that works for you</p>
                            </div>
                        </div>
                        <div className={`rounded-2xl border p-6 mb-6 text-center ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/8'}`}>
                            <p className={`text-sm font-semibold mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Calendar Booking Module</p>
                            <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Calendly / booking embed goes here</p>
                        </div>
                        <button id="final-cta-demo"
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all duration-300 shadow-2xl shadow-blue-500/25 transform hover:-translate-y-0.5 text-base w-full justify-center">
                            <Calendar size={18} />
                            Schedule Your 15-Minute Live Demo
                        </button>
                        <p className={`text-xs mt-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                            No credit card required. Experience the proctored assessment engine in action today.
                        </p>
                    </div>
                </div>
            </section>

            <Footer theme={theme} />
            <CalibrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default AssessmentsHome;
