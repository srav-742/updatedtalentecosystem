import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { 
    Zap, CheckCircle2, AlertTriangle, ShieldCheck, 
    FileText, Video, ChevronDown, Sparkles, 
    Code, Award, ArrowRight, Target, Clock, AlertCircle,
    FileSpreadsheet, LayoutDashboard, CreditCard, BotMessageSquare, 
    TrendingDown, Calendar, ChevronRight, X, Check, Minus, BookOpen, Layers
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { HOMEPAGE_FAQS, HOMEPAGE_DEFINITIONS } from '../utils/aeoContent';
import { 
    generateOrganizationSchema, 
    generateWebSiteSchema, 
    generateSoftwareApplicationSchema, 
    generateFAQPageSchema 
} from '../utils/schemas';

// Lazy-load CalibrationModal — it imports react-international-phone (~50 KB)
// which is only needed when the user clicks the demo booking button
const CalibrationModal = lazy(() => import('../components/CalibrationModal'));

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

    const painPoints = [
        {
            icon: FileText,
            color: "orange",
            title: "Resume Noise Overload",
            desc: "First, teams sift through hundreds of AI-generated resumes. Meanwhile, top developers drop out of slow, friction-heavy pipelines."
        },
        {
            icon: BotMessageSquare,
            color: "amber",
            title: "Cheating & AI Test Fraud",
            desc: "Unproctored assessments allow external AI assistants and tab switching. As a result, candidate scores are artificially inflated."
        },
        {
            icon: Clock,
            color: "purple",
            title: "Manager Review Bottlenecks",
            desc: "Engineering leads wait days to join preliminary sync calls. Therefore, technical interview schedules stall unnecessarily."
        },
        {
            icon: CreditCard,
            color: "rose",
            title: "The Multi-Tool Stack Tax",
            desc: "Companies pay separate monthly subscriptions for four different tools. Consequently, recruiters suffer fragmented logins and disconnected data."
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
        if (status === 'yes')     return <Check size={15} className={`${isLight ? 'text-emerald-700' : 'text-emerald-400'} shrink-0`} />;
        if (status === 'no')      return <X     size={15} className={`${isLight ? 'text-rose-700' : 'text-rose-400'} shrink-0`} />;
        return                           <Minus size={15} className={`${isLight ? 'text-amber-800' : 'text-amber-400'} shrink-0`} />;
    };

    const StatusLabel = ({ status, label }) => {
        const color = status === 'yes' ? (isLight ? 'text-emerald-800' : 'text-emerald-400')
                    : status === 'no'  ? (isLight ? 'text-rose-700'    : 'text-rose-400')
                    :                    (isLight ? 'text-amber-800'   : 'text-amber-400');
        return <span className={`text-[10px] font-bold ${color}`}>{label}</span>;
    };

    // Prepare JSON-LD Schemas for Homepage
    const schemas = [
        generateOrganizationSchema(),
        generateWebSiteSchema(),
        generateSoftwareApplicationSchema(),
        generateFAQPageSchema(HOMEPAGE_FAQS)
    ];

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isLight ? 'bg-white text-gray-900 selection:bg-blue-500/20' : 'bg-[#0c0f16] text-white selection:bg-blue-500/30'}`}>
            <SEO 
                title="Hire1Percent - AI Technical Recruitment, Coding Assessment & Video Interview Platform" 
                description="Hire1Percent is the all-in-one AI recruitment platform for engineering teams. Automate coding assessments across 20+ languages, asynchronous AI video interviews, real-time proctoring, and semantic resume intelligence." 
                canonicalUrl="/"
                schema={schemas}
            />
            <Navbar theme={theme} onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />

            <main id="main-content">
                {/* ─── SECTION 1: HERO ─── */}
                <section aria-label="Hero Introduction" className="relative pt-32 pb-24 overflow-hidden">
                    <div className={`absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[140px] -z-10 ${isLight ? 'bg-blue-200/40' : 'bg-blue-600/10'}`} />
                    <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[110px] -z-10 ${isLight ? 'bg-teal-100/50' : 'bg-teal-500/10'}`} />

                    <div className="container mx-auto px-6 text-center">
                        <header className="max-w-5xl mx-auto">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 ${isLight ? 'border-blue-200 bg-blue-50' : 'border-blue-500/30 bg-blue-500/5'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                                    Unified AI Technical Screening &amp; Proctored Assessments
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight leading-[1.08]">
                                Filter Top 1% Tech Talent.<br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400">
                                    Unified Pipelines.
                                </span>
                            </h1>

                            <p className={`max-w-3xl mx-auto text-lg md:text-xl mb-10 leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Replace fragmented recruitment tools with one unified platform. First, rank applicants instantly with <Link to="/resume-analysis" className="underline decoration-blue-500 underline-offset-4 hover:text-blue-500">resume intelligence</Link>. Next, conduct <Link to="/candidate-screening" className="underline decoration-teal-500 underline-offset-4 hover:text-teal-500">proctored technical assessments</Link> and run <Link to="/ai-interview-platform" className="underline decoration-purple-500 underline-offset-4 hover:text-purple-500">asynchronous video interviews</Link> without tool switching.
                            </p>
                        </header>

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

                {/* ─── SECTION 2: AGITATION (QUESTION HEADING) ─── */}
                <section aria-labelledby="problem-heading" className={`py-24 border-y ${isLight ? 'bg-gray-50/40 border-gray-100' : 'bg-[#0f131c] border-white/5'}`}>
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-rose-500/20 bg-rose-500/8 text-rose-400'}`}>
                                <AlertTriangle size={12} /> The Problem
                            </div>
                            <h2 id="problem-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                Why Is Modern Tech Hiring Broken by{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-400">
                                    SaaS Bloat and Test Fraud?
                                </span>
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Traditional hiring leaks time and money at every stage. For example, disconnected tools and unverified claims slow down recruiter decisions.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                            {painPoints.map((pain, idx) => {
                                const Icon = pain.icon;
                                const c = colorMap[pain.color];
                                return (
                                    <article key={idx} className={`p-7 rounded-[1.75rem] border transition-all duration-300 hover:-translate-y-1 ${isLight ? 'bg-white border-gray-200 hover:shadow-md' : 'bg-white/4 border-white/8 hover:bg-white/6'}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${c.bg} border ${c.border}`}>
                                            <Icon className={`w-5 h-5 ${c.icon}`} />
                                        </div>
                                        <h3 className="text-lg font-black mb-2 tracking-tight">{pain.title}</h3>
                                        <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{pain.desc}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 3: UNIQUE MECHANISM (QUESTION HEADING) ─── */}
                <section aria-labelledby="pipeline-heading" className="py-24">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-blue-500/20 bg-blue-500/8 text-blue-400'}`}>
                                <Zap size={12} /> How It Works
                            </div>
                            <h2 id="pipeline-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                How Does Hire1Percent Unify Technical Screening into{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-teal-400">One Automated Pipeline?</span>
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                First, Hire1Percent consolidates resume parsing, technical evaluation, and candidate review into three seamless steps.
                            </p>
                        </div>

                        {/* Pipeline flow */}
                        <nav aria-label="Recruitment Stages" className="flex flex-col md:flex-row items-center justify-center gap-3 mb-16 max-w-4xl mx-auto">
                            {[
                                { n: "01", label: "AI Resume Parse", link: "/resume-analysis", color: "blue" },
                                { n: "02", label: "Proctored Assessment", link: "/candidate-screening", color: "teal" },
                                { n: "03", label: "Async Video Interview", link: "/ai-interview-platform", color: "purple" }
                            ].map((s, idx) => (
                                <React.Fragment key={idx}>
                                    <Link to={s.link} className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border font-bold text-sm whitespace-nowrap transition-transform hover:scale-105 ${
                                        s.color === 'blue'   ? (isLight ? 'bg-blue-50   border-blue-200   text-blue-700'   : 'bg-blue-500/10   border-blue-500/25   text-blue-300')   :
                                        s.color === 'teal'   ? (isLight ? 'bg-teal-50   border-teal-200   text-teal-700'   : 'bg-teal-500/10   border-teal-500/25   text-teal-300')   :
                                                               (isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-500/10 border-purple-500/25 text-purple-300')
                                    }`}>
                                        <span className={`text-[10px] font-black ${isLight ? 'opacity-80' : 'opacity-70'}`}>Step {s.n}</span>
                                        <span>{s.label}</span>
                                    </Link>
                                    {idx < 2 && <ChevronRight className={`w-5 h-5 shrink-0 hidden md:block ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />}
                                </React.Fragment>
                            ))}
                        </nav>

                        {/* 3 Cards */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {[
                                {
                                    icon: FileSpreadsheet, color: "blue", step: "01",
                                    title: "Automated Resume Parsing & Skill Alignment",
                                    link: "/resume-analysis",
                                    desc: "Stop manually reading every PDF. Our AI engine parses candidate resumes, extracts core stack competencies, and automatically ranks applicants against role requirements.",
                                    bullets: ["Skill extraction & gap analysis", "Auto-rank against role requirements", "Removes AI-generated resume noise"]
                                },
                                {
                                    icon: ShieldCheck, color: "teal", step: "02",
                                    title: "Proctored AI Technical Assessments",
                                    link: "/candidate-screening",
                                    desc: "Deploy coding evaluations with active session integrity verification. Our engine monitors candidate workspaces to verify honest, native code execution.",
                                    bullets: ["Real-time browser focus tracking", "Tab-switch detection validation", "Biometric face verification checks"]
                                },
                                {
                                    icon: Video, color: "purple", step: "03",
                                    title: "Async Video Interviews & Dashboard Review",
                                    link: "/ai-interview-platform",
                                    desc: "Candidates complete AI-generated mock interview questions at their own pace. Logged-in hiring teams review complete candidate evaluations on a single dashboard.",
                                    bullets: ["Candidates record on their own schedule", "AI scores answers automatically", "Full picture available in recruiter dashboard"]
                                }
                            ].map((card, idx) => {
                                const Icon = card.icon;
                                const bgMap   = { blue: isLight ? 'bg-blue-50' : 'bg-blue-500/10',     teal: isLight ? 'bg-teal-50' : 'bg-teal-500/10',     purple: isLight ? 'bg-purple-50' : 'bg-purple-500/10'   };
                                const bdrMap  = { blue: isLight ? 'border-blue-200' : 'border-blue-500/20', teal: isLight ? 'border-teal-200' : 'border-teal-500/20', purple: isLight ? 'border-purple-200' : 'border-purple-500/20' };
                                const icMap   = { blue: isLight ? 'text-blue-700' : 'text-blue-400',   teal: isLight ? 'text-teal-700' : 'text-teal-400',   purple: isLight ? 'text-purple-700' : 'text-purple-400'    };
                                const lblMap  = { blue: isLight ? 'text-blue-700' : 'text-blue-400',   teal: isLight ? 'text-teal-700' : 'text-teal-400',   purple: isLight ? 'text-purple-700' : 'text-purple-400'    };
                                return (
                                    <article key={idx} className={`p-8 rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 ${isLight ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-white/5 border-white/5 hover:bg-white/8'}`}>
                                        <div className={`w-12 h-12 ${bgMap[card.color]} border ${bdrMap[card.color]} rounded-xl flex items-center justify-center mb-6`}>
                                            <Icon className={`w-5 h-5 ${icMap[card.color]}`} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${lblMap[card.color]}`}>Step {card.step}</span>
                                        <h3 className="text-xl font-black mb-3 tracking-tight">
                                            <Link to={card.link} className="hover:text-blue-500 transition-colors">{card.title}</Link>
                                        </h3>
                                        <p className={`text-sm leading-relaxed mb-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{card.desc}</p>
                                        <ul className="space-y-2.5 text-xs font-semibold mb-6">
                                            {card.bullets.map((b, i) => (
                                                <li key={i} className="flex items-center gap-2">
                                                    <CheckCircle2 size={13} className="text-teal-400 shrink-0" />
                                                    <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>{b}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link to={card.link} className={`inline-flex items-center gap-1.5 text-xs font-bold ${lblMap[card.color]} hover:underline`}>
                                            Explore {card.title.split(' ')[0]} Solution <ArrowRight size={12} />
                                        </Link>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 4: PROOF & INTEGRITY (QUESTION HEADING) ─── */}
                <section aria-labelledby="integrity-heading" className={`py-24 border-t ${isLight ? 'bg-gray-50/40 border-gray-100' : 'bg-[#0f131c] border-white/5'}`}>
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-400'}`}>
                                <ShieldCheck size={12} /> Proof of Performance
                            </div>
                            <h2 id="integrity-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                How Does Anti-Cheat Proctoring Guarantee{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">Technical Test Integrity?</span>
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Consequently, teams skip resume exaggeration and receive verified evaluation scores on their recruiter dashboard.
                            </p>
                        </div>

                        {/* Artifact Mockups Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
                            {/* Artifact A: Proctoring Audit Log */}
                            <div className={`rounded-[2rem] border overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/5 border-white/8'}`}>
                                <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className={isLight ? "text-rose-600" : "text-rose-400"} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Live Proctoring Audit Log</span>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isLight ? 'text-rose-700 bg-rose-100 border border-rose-200' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>LIVE MONITORING</span>
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
                                                    <p className={`text-[10px] font-black uppercase ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{log.type}</p>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${log.severity === 'HIGH' ? (isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/15 text-rose-400') : (isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/15 text-amber-400')}`}>{log.severity}</span>
                                                </div>
                                                <p className={`text-[10px] truncate ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{log.desc}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`font-extrabold text-sm ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{log.penalty}</p>
                                                <p className={`text-[9px] ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>{log.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <p className={`text-xs leading-relaxed pt-2 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        In addition, every assessment generates a complete audit trail. Teams know exactly how candidates performed throughout the test.
                                    </p>
                                </div>
                            </div>

                            {/* Artifact B: Recruiter Insights Dashboard */}
                            <div className={`rounded-[2rem] border overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/5 border-white/8'}`}>
                                <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                                    <div className="flex items-center gap-2">
                                        <LayoutDashboard size={14} className={isLight ? "text-blue-600" : "text-blue-400"} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>Recruiter Insights Dashboard</span>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isLight ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'}`}>ACTIVE SESSION</span>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        {[
                                            { val: "12", label: "Open Pipelines", color: isLight ? "text-blue-700" : "text-blue-500" },
                                            { val: "85%", label: "Completion Rate", color: isLight ? "text-teal-700" : "text-teal-400" },
                                            { val: "1,240", label: "Screened Candidates", color: isLight ? "text-purple-700" : "text-purple-400" }
                                        ].map((stat, idx) => (
                                            <div key={idx} className={`p-3 rounded-2xl border text-center ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-black/10 border-white/5'}`}>
                                                <p className={`text-xl font-extrabold ${stat.color}`}>{stat.val}</p>
                                                <p className={`text-[8px] font-black uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-gray-400'} mt-1`}>{stat.label}</p>
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
                                                    <p className={`font-black text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>{cand.score}</p>
                                                    <p className={`text-[8px] font-bold uppercase ${isLight ? 'text-emerald-700' : 'text-emerald-600/60'}`}>{cand.tag}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Metrics Row with Authority Citations */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            {[
                                { value: "70%", label: "Reduction in overall Time-to-Hire", source: "SHRM 2026 Talent Acquisition Benchmark", grad: "from-blue-400 to-teal-400" },
                                { value: "100%", label: "Proctoring Audit Visibility", source: "Hire1Percent Test Telemetry Standard", grad: "from-emerald-400 to-teal-400" },
                                { value: "Single", label: "Subscription replacing legacy point solutions", source: "Enterprise SaaS Consolidation Analysis", grad: "from-purple-400 to-blue-400" }
                            ].map((m, idx) => (
                                <div key={idx} className={`p-8 rounded-[2rem] border text-center transition-all duration-300 hover:-translate-y-1 ${isLight ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-white/5 border-white/5 hover:bg-white/8'}`}>
                                    <p className={`text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${m.grad} mb-3`}>{m.value}</p>
                                    <p className={`text-sm font-semibold leading-snug ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-2`}>{m.label}</p>
                                    <cite className={`text-[10px] block not-italic ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Source: {m.source}</cite>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 5: TOOL CONSOLIDATION TABLE (QUESTION HEADING) ─── */}
                <section aria-labelledby="comparison-heading" className="py-24">
                    <div className="container mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-14">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-amber-500/20 bg-amber-500/8 text-amber-400'}`}>
                                <TrendingDown size={12} /> Cost Comparison
                            </div>
                            <h2 id="comparison-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                How Does Hire1Percent Compare to<br />{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">Legacy Multi-Tool Stacks?</span>
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Compare how Hire1Percent simplifies your recruiting operations while lowering costs:
                            </p>
                        </div>

                        <div className="max-w-4xl mx-auto mb-8">
                            <div className={`rounded-[2rem] border overflow-hidden shadow-xl ${isLight ? 'border-gray-200' : 'border-white/8'}`}>
                                <table className="w-full text-left border-collapse">
                                    <caption className="sr-only">Hire1Percent vs Legacy Multi-Tool Stacks Comparison Table</caption>
                                    <thead>
                                        <tr className={`grid grid-cols-3 ${isLight ? 'bg-gray-50 border-b border-gray-200' : 'bg-white/5 border-b border-white/8'}`}>
                                            <th scope="col" className="px-6 py-4 font-normal"><span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Feature / Capability</span></th>
                                            <th scope="col" className={`px-6 py-4 border-x text-center font-normal ${isLight ? 'border-gray-200' : 'border-white/8'}`}><span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Legacy Multi-Tool Stack</span></th>
                                            <th scope="col" className="px-6 py-4 text-center font-normal"><span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Hire1Percent Platform</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonRows.map((row, idx) => (
                                            <tr key={idx} className={`grid grid-cols-3 border-b last:border-b-0 transition-colors duration-200 ${isLight ? 'border-gray-100 hover:bg-gray-50/60' : 'border-white/5 hover:bg-white/3'}`}>
                                                <th scope="row" className="px-6 py-5 flex items-center font-normal"><span className={`text-sm font-bold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{row.feature}</span></th>
                                                <td className={`px-6 py-5 border-x flex flex-col items-center justify-center gap-1 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
                                                    <StatusIcon status={row.legacy.status} />
                                                    <StatusLabel status={row.legacy.status} label={row.legacy.label} />
                                                </td>
                                                <td className="px-6 py-5 flex flex-col items-center justify-center gap-1">
                                                    <StatusIcon status={row.h1p.status} />
                                                    <StatusLabel status={row.h1p.status} label={row.h1p.label} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="text-center">
                            <Link to="/pricing" className={`inline-flex items-center gap-2 text-sm font-bold text-blue-500 hover:underline`}>
                                View detailed pricing and feature breakdowns <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 6: PLATFORM OVERVIEW & DEFINITION LIST (AEO ESSENTIAL) ─── */}
                <section aria-labelledby="glance-heading" className={`py-20 border-t ${isLight ? 'bg-white border-gray-100' : 'bg-[#0a0d14] border-white/5'}`}>
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-center mb-12">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-purple-200 bg-purple-50 text-purple-600' : 'border-purple-500/20 bg-purple-500/8 text-purple-400'}`}>
                                <BookOpen size={12} /> Platform Overview
                            </div>
                            <h2 id="glance-heading" className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
                                Hire1Percent at a glance
                            </h2>
                            <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                                Verified summary of Hire1Percent capabilities, evaluation workflows, and platform architecture.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Definition List (<dl>) */}
                            <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-gray-50/70 border-gray-200' : 'bg-white/4 border-white/8'}`}>
                                <h3 className="text-lg font-bold mb-5 text-blue-500">Core Platform Definitions</h3>
                                <dl className="space-y-4">
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Platform</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>AI-powered technical recruitment platform</dd>
                                    </div>
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Primary users</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Recruiters and technical candidates</dd>
                                    </div>
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Technical evaluation</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Technical assessments and coding evaluations</dd>
                                    </div>
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Interview</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>AI-powered or asynchronous technical interviews</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Integrity monitoring</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Proctoring and assessment integrity signals</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Quick Facts (Key-Value List) */}
                            <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-gray-50/70 border-gray-200' : 'bg-white/4 border-white/8'}`}>
                                <h3 id="quick-facts-heading" className="text-lg font-bold mb-5 text-teal-500">Quick facts about Hire1Percent</h3>
                                <ul className="space-y-4">
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>Platform:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>AI-powered technical recruitment platform</span>
                                    </li>
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>Primary users:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Recruiters and technical candidates</span>
                                    </li>
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>Core focus:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Technical recruitment and candidate evaluation</span>
                                    </li>
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>Assessment:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Technical and coding assessments</span>
                                    </li>
                                    <li className="text-sm md:text-base">
                                        <strong>Interview:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>AI-powered technical interviews</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Last Updated Timestamp */}
                        <div className="text-center pt-4 border-t border-gray-200/40 dark:border-white/5">
                            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                <strong>Last updated:</strong>{' '}
                                <time dateTime="2026-09-07">September 7, 2026</time>
                            </p>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 6.5: DEVELOPER API & CODE BLOCK (AEO CRITICAL) ─── */}
                <section aria-labelledby="api-heading" className={`py-20 border-t ${isLight ? 'bg-gray-50/60 border-gray-100' : 'bg-[#0b0e15] border-white/5'}`}>
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-10">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${isLight ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-blue-500/20 bg-blue-500/8 text-blue-400'}`}>
                                <Code size={12} /> REST API &amp; Webhooks
                            </div>
                            <h2 id="api-heading" className="text-3xl md:text-4xl font-black mb-3 tracking-tight">
                                How to Integrate Hire1Percent Assessments via API?
                            </h2>
                            <p className={`text-sm leading-relaxed max-w-2xl mx-auto ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                For example, teams dispatch assessments, stream proctoring flags, and receive candidate evaluation webhooks programmatically.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl overflow-hidden text-left">
                            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10 text-xs text-gray-400 font-mono">
                                <span>dispatch-assessment.js</span>
                                <span className="text-emerald-400 font-bold">Node.js / REST API</span>
                            </div>
                            <pre className="text-xs md:text-sm font-mono text-gray-200 leading-relaxed overflow-x-auto">
                                <code>{`// Trigger an automated, proctored coding assessment via Hire1Percent REST API
const response = await fetch("https://api.hire1percent.com/v1/assessments/dispatch", {
  method: "POST",
  headers: {
    "Authorization": "Bearer h1p_live_secret_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    candidateEmail: "alex.engineer@example.com",
    roleTitle: "Staff Software Engineer",
    skills: ["React", "TypeScript", "Node.js", "System Design"],
    proctoring: { enforceFullscreen: true, tabSwitchLimit: 2, audioScan: true }
  })
});
const { inviteUrl, assessmentId } = await response.json();
console.log("Assessment successfully generated:", inviteUrl);`}</code>
                            </pre>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 7: CRAWLABLE ACCESSIBLE FAQ (AEO CRITICAL) ─── */}
                <section aria-labelledby="faq-heading" className={`py-24 border-t ${isLight ? 'bg-gray-50/40 border-gray-100' : 'bg-[#0f131c] border-white/5'}`}>
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="text-center mb-16">
                            <h2 id="faq-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                Frequently Asked Questions About Hire1Percent
                            </h2>
                            <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                                First, explore direct answers to common questions about our coding assessments and AI interview workflows.
                            </p>
                        </div>

                        {/* Semantic details/summary: 100% crawlable, accessible, no hidden content traps */}
                        <div className="space-y-4">
                            {HOMEPAGE_FAQS.map((faq, index) => (
                                <details 
                                    key={index} 
                                    open={index === 0}
                                    className={`group rounded-2xl border transition-all duration-200 ${isLight ? 'bg-white border-gray-200 hover:border-gray-300 shadow-sm' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                                >
                                    <summary className="w-full text-left px-6 py-5 font-bold flex items-center justify-between gap-4 text-base md:text-lg cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                                        <span className="flex-1">{faq.question}</span>
                                        <ChevronDown size={20} className={`text-blue-500 transition-transform duration-200 group-open:rotate-180 shrink-0`} />
                                    </summary>
                                    <div className={`px-6 pb-6 pt-2 text-sm leading-relaxed border-t ${isLight ? 'border-gray-100 text-gray-700' : 'border-white/5 text-gray-300'}`}>
                                        <p>{faq.answer}</p>
                                    </div>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 8: FINAL CTA ─── */}
                <section aria-label="Schedule a Demo" className="relative py-28 overflow-hidden">
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
                            Also, join forward-thinking tech teams and recruitment firms using Hire1Percent to automate screening and safeguard test integrity.
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
                                <p className={`text-sm font-semibold mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Calendar Booking Module</p>
                                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Book a customized walkthrough of our assessment &amp; interview engine</p>
                            </div>
                            <button id="final-cta-demo"
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all duration-300 shadow-2xl shadow-blue-500/25 transform hover:-translate-y-0.5 text-base w-full justify-center">
                                <Calendar size={18} />
                                Schedule Your 15-Minute Live Demo
                            </button>
                            <p className={`text-xs mt-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                In addition, no credit card is required. Experience the proctored assessment engine in action today.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer theme={theme} />
            {isModalOpen && (
                <Suspense fallback={null}>
                    <CalibrationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
                </Suspense>
            )}
        </div>
    );
};

export default AssessmentsHome;
