import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { 
    Shield, CheckCircle2, AlertTriangle, Lock, 
    Code, Terminal, Sparkles, Check, ChevronDown, 
    ArrowRight, Clock, HelpCircle, Copy, Eye,
    Activity, FileCheck, Layers, Bot, UserCheck,
    FileText, FileSpreadsheet, LayoutDashboard, CreditCard,
    BotMessageSquare, TrendingDown, Calendar, ChevronRight,
    X, Minus, BookOpen, Zap, ShieldCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { 
    V5_HERO, 
    V5_WORKFLOW, 
    V5_ANTI_CHEAT, 
    V5_CANDIDATE_EXPERIENCE, 
    V5_HOMEPAGE_FAQS 
} from '../utils/v5Content';
import { 
    PLANS, 
    formatCents, 
    formatEffectiveRate, 
    getPlanCtaUrl 
} from '../utils/pricingCatalog';
import { 
    FIXTURE_ID, 
    FIXTURE_ROLE, 
    FIXTURE_TASK_TITLE, 
    FIXTURE_RESULT,
    RECRUITER_SUMMARY,
    INTERVIEW_QUESTIONS,
    CODE_DEFENSE_PROMPT,
    SESSION_EVIDENCE,
    WEBHOOK_EXAMPLE_PAYLOAD
} from '../utils/backendEventsV5';
import { 
    generateOrganizationSchema, 
    generateWebSiteSchema, 
    generateSoftwareApplicationSchema, 
    generateFAQPageSchema 
} from '../utils/schemas';

// Lazy-load CalibrationModal
const CalibrationModal = lazy(() => import('../components/CalibrationModal'));

const AssessmentsHome = () => {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark';
        return localStorage.getItem('landing-theme') || 'dark';
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const [copiedJson, setCopiedJson] = useState(false);

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

    const handleCopyPayload = () => {
        navigator.clipboard.writeText(JSON.stringify(WEBHOOK_EXAMPLE_PAYLOAD, null, 2));
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
    };

    const toggleFaq = (idx) => {
        setOpenFaqIndex(openFaqIndex === idx ? null : idx);
    };

    const painPoints = [
        {
            icon: FileText,
            color: 'orange',
            title: 'Resume Noise Overload',
            desc: 'Sifting through hundreds of AI-generated resumes for a single engineering opening while top developers drop out of slow, friction-heavy pipelines.'
        },
        {
            icon: BotMessageSquare,
            color: 'amber',
            title: 'Cheating & AI Test Fraud',
            desc: 'Unproctored coding assessments allow candidates to use external AI assistants, copy-paste answers, or switch tabs, resulting in artificial screening scores.'
        },
        {
            icon: Clock,
            color: 'purple',
            title: 'Manager Review Bottlenecks',
            desc: 'Waiting days for busy engineering leads to join preliminary sync calls just to evaluate basic candidate communication before the real interviews can begin.'
        },
        {
            icon: CreditCard,
            color: 'rose',
            title: 'The Multi-Tool Stack Tax',
            desc: 'Paying separate monthly subscriptions for an ATS, coding test platform, video interview software, and verification plugins — with separate logins and zero integration.'
        }
    ];

    const colorMap = {
        rose:   { bg: 'bg-rose-500/10',   icon: 'text-rose-400',   border: 'border-rose-500/20'   },
        amber:  { bg: 'bg-amber-500/10',  icon: 'text-amber-400',  border: 'border-amber-500/20'  },
        orange: { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20' },
        purple: { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20' },
    };

    const comparisonRows = [
        { feature: 'AI Resume Parsing & Scoring',      legacy: { label: 'Requires separate ATS',     status: 'no'      }, h1p: { label: 'Built-in',          status: 'yes' } },
        { feature: 'Proctored Technical Tests',        legacy: { label: 'Expensive point solution',  status: 'partial' }, h1p: { label: 'Built-in',          status: 'yes' } },
        { feature: '4-Layer Anti-Cheat & Telemetry',   legacy: { label: 'Third-party plugin needed', status: 'no'      }, h1p: { label: 'Environment & Keystroke Lock', status: 'yes' } },
        { feature: 'Conversational AI Code Defense',   legacy: { label: 'Not available (Manual)',    status: 'no'      }, h1p: { label: '3-Min Dynamic Defense', status: 'yes' } },
        { feature: 'Live Requirement Adaptation',     legacy: { label: 'Static questions only',     status: 'no'      }, h1p: { label: 'Built-in (Layer 4)', status: 'yes' } },
        { feature: 'Unified Candidate Scorecard',      legacy: { label: 'Fragmented across tools',   status: 'partial' }, h1p: { label: 'Single Platform',   status: 'yes' } },
        { feature: 'Workflow Friction',                legacy: { label: 'High (Multiple logins)',    status: 'no'      }, h1p: { label: 'Zero friction',     status: 'yes' } },
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

    const jsonLdSchemas = [
        generateOrganizationSchema(),
        generateWebSiteSchema(),
        generateSoftwareApplicationSchema(),
        generateFAQPageSchema(V5_HOMEPAGE_FAQS)
    ];

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0a0d14] text-white'}`}>
            <SEO 
                title="Hire1Percent | Technical Assessment Platform with 4-Layer Anti-Cheat"
                description="Assess how candidates code, adapt, and defend their decisions before you book the interview. Proctored technical coding assessments with AI code defense."
                canonical="https://www.hire1percent.com"
                schemas={jsonLdSchemas}
            />

            <Navbar theme={theme} onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')} />

            <main className="flex-grow pt-24">
                {/* ─── SECTION 1: HERO ──────────────────────────────────────────────── */}
                <section id="hero" className="relative pt-12 pb-20 overflow-hidden">
                    {/* Background glow effects */}
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-600/20 to-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

                    <div className="container mx-auto px-6 max-w-7xl relative z-10">
                        <div className="max-w-4xl mx-auto text-center space-y-6">
                            {/* Eyebrow */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span>{V5_HERO.eyebrow}</span>
                            </div>

                            {/* H1 */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                                {V5_HERO.h1_line1}{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-teal-300 to-teal-500">
                                    {V5_HERO.h1_line2}
                                </span>
                            </h1>

                            {/* Body */}
                            <p className={`text-lg sm:text-xl leading-relaxed max-w-3xl mx-auto ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                {V5_HERO.body}
                            </p>

                            {/* Primary CTAs */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <Link 
                                    to="/book-demo?placement=hero"
                                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-xl shadow-blue-500/25 transition-all transform active:scale-95 text-center flex items-center justify-center gap-2"
                                    aria-label="Book a Live Demo from Hero"
                                >
                                    <span>{V5_HERO.demo_cta}</span>
                                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                </Link>

                                <Link 
                                    to="/sample-scorecard"
                                    className={`w-full sm:w-auto px-8 py-4 rounded-xl text-base font-semibold border transition-all text-center flex items-center justify-center gap-2 ${
                                        isLight 
                                            ? 'border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-800' 
                                            : 'border-white/15 bg-white/5 hover:bg-white/10 text-white'
                                    }`}
                                >
                                    <span>{V5_HERO.sample_cta}</span>
                                </Link>
                            </div>

                            {/* Ungated example disclosure */}
                            <p className={`text-xs max-w-xl mx-auto italic ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                {V5_HERO.sample_cta_note}
                            </p>

                            {/* 4-Layer Protocol Strip */}
                            <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-semibold">
                                <span className={`uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Protocol:</span>
                                {V5_HERO.protocol_strip.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4 Hero Stat Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mt-14">
                            {[
                                { value: '70%', label: 'Reduction in Time-to-Hire', grad: 'from-blue-400 to-teal-400' },
                                { value: '100%', label: 'Proctoring Integrity', grad: 'from-teal-400 to-emerald-400' },
                                { value: 'Zero', label: 'Tool Bloat', grad: 'from-blue-400 to-indigo-400' },
                                { value: '10x', label: 'Faster Quality Hires', grad: 'from-emerald-400 to-teal-400' }
                            ].map((stat, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p-6 rounded-2xl border text-center transition-all duration-300 hover:-translate-y-1 ${
                                        isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/5 border-white/10 hover:border-blue-500/30'
                                    }`}
                                >
                                    <p className={`text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${stat.grad} mb-1`}>
                                        {stat.value}
                                    </p>
                                    <p className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Illustrative Assessment Fixture Preview (Deterministic backend_events_v5) */}
                        <div className="mt-14 max-w-5xl mx-auto">
                            <div className={`rounded-3xl border shadow-2xl overflow-hidden transition-all ${
                                isLight 
                                    ? 'bg-white border-gray-200 shadow-blue-500/5' 
                                    : 'bg-[#0f1422]/95 border-white/15 backdrop-blur-xl shadow-black/80'
                            }`}>
                                {/* Header Bar */}
                                <div className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/5'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                            Illustrative Assessment Report (Fictional Candidate Fixture)
                                        </span>
                                        <span className="text-xs font-mono opacity-70">ID: {FIXTURE_ID}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-md">
                                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                                        <span>Result: {FIXTURE_RESULT.passed} of {FIXTURE_RESULT.total} unit tests passed</span>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-8 space-y-6">
                                    {/* Role & Task */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-white/10 text-sm">
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Target Role</span>
                                            <span className="font-semibold">{FIXTURE_ROLE}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">Challenge Task</span>
                                            <span className="font-medium text-gray-300">{FIXTURE_TASK_TITLE}</span>
                                        </div>
                                    </div>

                                    {/* Recruiter Summary */}
                                    <div className={`p-5 rounded-2xl border ${isLight ? 'bg-blue-50/70 border-blue-200' : 'bg-blue-950/20 border-blue-500/30'}`}>
                                        <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-sm">
                                            <FileCheck className="w-4 h-4" aria-hidden="true" />
                                            <span>Plain-English Recruiter Summary</span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                                            {RECRUITER_SUMMARY}
                                        </p>
                                    </div>

                                    {/* 2-Column: T09/T10 Questions & 3-Minute Defense Excerpt */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                                            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
                                                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                                                <span>T09 &amp; T10 Interview Questions</span>
                                            </h2>
                                            <ul className="space-y-3 text-xs leading-relaxed">
                                                {INTERVIEW_QUESTIONS.map((q) => (
                                                    <li key={q.id} className="p-3 rounded-xl bg-black/20 border border-white/5">
                                                        <span className="font-mono font-bold text-amber-300 mr-2">[{q.id}]</span>
                                                        <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>{q.question}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                                            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2 mb-3">
                                                <Bot className="w-4 h-4" aria-hidden="true" />
                                                <span>3-Minute AI Defense Excerpt</span>
                                            </h2>
                                            <div className="space-y-2 text-xs leading-relaxed">
                                                <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-200">
                                                    <span className="font-bold block text-[11px] text-teal-400 mb-0.5">AI Interviewer Prompt:</span>
                                                    {CODE_DEFENSE_PROMPT}
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-black/20 border border-white/5 text-gray-300">
                                                    <span className="font-bold block text-[11px] text-gray-400 mb-0.5">Candidate Response:</span>
                                                    "I assumed events would always arrive in order. For out-of-order streams, I should compare with existing maximum timestamps on Line 11..."
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4-Layer Telemetry Snapshot */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                            <span className="text-[11px] uppercase tracking-wider text-gray-400 block mb-1">Layer 1: Biometric</span>
                                            <span className="text-sm font-bold text-emerald-400">{SESSION_EVIDENCE.layer1.face_present_pct}% Face Present</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                            <span className="text-[11px] uppercase tracking-wider text-gray-400 block mb-1">Layer 2: Telemetry</span>
                                            <span className="text-sm font-bold text-blue-400">{SESSION_EVIDENCE.layer2.total_keystrokes} Keystrokes</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                            <span className="text-[11px] uppercase tracking-wider text-gray-400 block mb-1">Layer 3: Defense</span>
                                            <span className="text-sm font-bold text-teal-400">{SESSION_EVIDENCE.layer3.authorship_confidence} Authorship</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                                            <span className="text-[11px] uppercase tracking-wider text-gray-400 block mb-1">Layer 4: Adaptation</span>
                                            <span className="text-sm font-bold text-amber-400">Partial (Edge Cases)</span>
                                        </div>
                                    </div>

                                    {/* Link to Full Interactive Scorecard */}
                                    <div className="text-center pt-2">
                                        <Link 
                                            to="/sample-scorecard" 
                                            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            <span>Explore Full Interactive Scorecard with Code Highlighting &amp; Timeline</span>
                                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 2: AGITATION / THE PROBLEM ────────────────────────────── */}
                <section aria-labelledby="problem-heading" className={`py-24 border-y ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-[#0f131c] border-white/5'}`}>
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${
                                isLight ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                            }`}>
                                <AlertTriangle size={12} /> The Problem
                            </div>
                            <h2 id="problem-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                Modern Tech Hiring is Broken by{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-400">
                                    SaaS Bloat and Test Fraud
                                </span>
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                The traditional technical recruitment pipeline is leaking time and money at every stage. Fragmented tools and unverified claims slow down hiring decisions.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                            {painPoints.map((pain, idx) => {
                                const Icon = pain.icon;
                                const c = colorMap[pain.color];
                                return (
                                    <article 
                                        key={idx} 
                                        className={`p-7 rounded-[1.75rem] border transition-all duration-300 hover:-translate-y-1 ${
                                            isLight ? 'bg-white border-gray-200 hover:shadow-md' : 'bg-white/5 border-white/8 hover:bg-white/8'
                                        }`}
                                    >
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

                {/* ─── SECTION 3: HOW IT WORKS ──────────────────────────────────────── */}
                <section id="how-it-works" className={`py-24 ${isLight ? 'bg-white' : 'bg-[#0a0d14]'}`}>
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-wider mb-2">
                                <Zap size={12} /> Workflow
                            </div>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                                {V5_WORKFLOW.heading}
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                A unified three-stage evaluation that reveals real-world coding ability, live adaptability, and true authorship.
                            </p>
                        </div>

                        {/* Pipeline Stage Nav Badges */}
                        <nav aria-label="Recruitment Stages" className="flex flex-col md:flex-row items-center justify-center gap-3 mb-16 max-w-4xl mx-auto">
                            {[
                                { n: "01", label: "AI Resume Parse", link: "/resume-analysis", color: "blue" },
                                { n: "02", label: "Proctored Assessment", link: "/candidate-screening", color: "teal" },
                                { n: "03", label: "Async Video Interview", link: "/ai-interview-platform", color: "purple" }
                            ].map((s, idx) => (
                                <React.Fragment key={idx}>
                                    <Link to={s.link} className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border font-bold text-sm whitespace-nowrap transition-transform hover:scale-105 ${
                                        s.color === 'blue'   ? (isLight ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-500/10 border-blue-500/25 text-blue-300') :
                                        s.color === 'teal'   ? (isLight ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-teal-500/10 border-teal-500/25 text-teal-300') :
                                                               (isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-purple-500/10 border-purple-500/25 text-purple-300')
                                    }`}>
                                        <span className={`text-[10px] font-black ${isLight ? 'opacity-80' : 'opacity-70'}`}>Step {s.n}</span>
                                        <span>{s.label}</span>
                                    </Link>
                                    {idx < 2 && <ChevronRight className={`w-5 h-5 shrink-0 hidden md:block ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />}
                                </React.Fragment>
                            ))}
                        </nav>

                        {/* 3 Stages */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                            {V5_WORKFLOW.stages.map((stage) => (
                                <div 
                                    key={stage.number} 
                                    className={`p-8 rounded-3xl border relative transition-all duration-300 hover:-translate-y-1 ${
                                        isLight 
                                            ? 'bg-white border-gray-200 shadow-lg shadow-gray-100' 
                                            : 'bg-[#121624] border-white/10 hover:border-blue-500/30'
                                    }`}
                                >
                                    <span className="text-4xl font-extrabold text-blue-500/40 font-mono block mb-4">
                                        {stage.number}
                                    </span>
                                    <h3 className="text-lg font-bold mb-3">
                                        {stage.title}
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                        {stage.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Scorecard Evidence Checklist */}
                        <div className={`p-8 sm:p-10 rounded-3xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                            <div className="max-w-2xl mb-6">
                                <h3 className="text-xl font-bold mb-2">Complete Scorecard Evidence</h3>
                                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                    Every completed assessment generates an authoritative evidence deck ready for hiring managers and recruiters:
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {V5_WORKFLOW.evidence_items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-medium">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                    No engineering review required prior to the candidate's initial conversation.
                                </span>
                                <Link 
                                    to="/sample-scorecard" 
                                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shrink-0"
                                >
                                    See a Live Example Scorecard &rarr;
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 4: 4-LAYER ANTI-CHEAT ───────────────────────────────── */}
                <section id="anti-cheat" className={`py-24 border-t ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-[#0f131c] border-white/5'}`}>
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Integrity Architecture</span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                {V5_ANTI_CHEAT.heading}
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Traditional proctoring only watches video feeds. Hire1Percent combines environment locking, millisecond keystroke telemetry, conversational AI code defense, and dynamic mid-task requirements.
                            </p>
                        </div>

                        {/* 4 Numbered Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                            {V5_ANTI_CHEAT.cards.map((card) => (
                                <div 
                                    key={card.number} 
                                    className={`p-8 rounded-3xl border relative transition-all ${
                                        isLight 
                                            ? 'bg-white border-gray-200 shadow-md' 
                                            : 'bg-[#101422] border-white/10 hover:border-blue-500/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold font-mono text-base">
                                            0{card.number}
                                        </div>
                                        <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
                                            Layer {card.number}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-3">
                                        {card.title}
                                    </h3>

                                    <p className={`text-sm leading-relaxed mb-5 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {card.body}
                                    </p>

                                    {/* AST Explanation for Layer 2 */}
                                    {card.ast_explanation && (
                                        <div className={`p-4 rounded-2xl mb-4 text-xs leading-relaxed border ${
                                            isLight ? 'bg-blue-50/50 border-blue-100 text-gray-700' : 'bg-blue-950/20 border-blue-500/20 text-blue-200'
                                        }`}>
                                            <span className="font-bold block mb-1">How AST Checkpoints Work:</span>
                                            {card.ast_explanation}
                                        </div>
                                    )}

                                    {/* Example Prompt for Layer 3 */}
                                    {card.example_prompt && (
                                        <div className={`p-4 rounded-2xl mb-4 text-xs leading-relaxed border ${
                                            isLight ? 'bg-teal-50/50 border-teal-100 text-gray-700' : 'bg-teal-950/20 border-teal-500/20 text-teal-200'
                                        }`}>
                                            <span className="font-bold block mb-1">Example Code Defense Prompt:</span>
                                            "{card.example_prompt}"
                                        </div>
                                    )}

                                    {/* Example Requirement Change for Layer 4 */}
                                    {card.example_change && (
                                        <div className={`p-4 rounded-2xl mb-4 text-xs leading-relaxed border ${
                                            isLight ? 'bg-amber-50/50 border-amber-100 text-gray-700' : 'bg-amber-950/20 border-amber-500/20 text-amber-200'
                                        }`}>
                                            <span className="font-bold block mb-1">Example Live Requirement Change:</span>
                                            "{card.example_change}"
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-white/10 space-y-2 text-xs">
                                        <div>
                                            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block">Captured Evidence:</span>
                                            <span className="text-gray-300">{card.evidence}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block">Reviewer Value:</span>
                                            <span className="text-blue-400">{card.reviewer_value}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Runtime Chronology Strip */}
                        <div className={`p-6 sm:p-8 rounded-3xl border ${isLight ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div>
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-blue-400 mb-1">Runtime Execution Chronology</h3>
                                    <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                        Layer numbers denote functional purpose; execution follows candidate journey:
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10">
                                        <span className="text-emerald-400 font-mono font-bold mr-2">00:00</span>
                                        <span>Layers 1 &amp; 2 active</span>
                                    </div>
                                    <span className="text-gray-500">&rarr;</span>
                                    <div className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10">
                                        <span className="text-amber-400 font-mono font-bold mr-2">07:00</span>
                                        <span>Layer 4 requirement update</span>
                                    </div>
                                    <span className="text-gray-500">&rarr;</span>
                                    <div className="px-3.5 py-2 rounded-xl bg-black/30 border border-white/10">
                                        <span className="text-teal-400 font-mono font-bold mr-2">17:45</span>
                                        <span>Layer 3 code defense begins</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 5: CANDIDATE EXPERIENCE ─────────────────────────────── */}
                <section id="candidate-experience" className={`py-24 border-t ${isLight ? 'bg-white' : 'bg-[#0a0d14]'}`}>
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                            <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Candidate Experience</span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                {V5_CANDIDATE_EXPERIENCE.heading}
                            </h2>
                            <p className={`text-xs font-semibold px-4 py-1.5 rounded-full inline-block border ${
                                isLight ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                            }`}>
                                {V5_CANDIDATE_EXPERIENCE.recruiter_caption}
                            </p>
                        </div>

                        {/* 3 Candidate Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                            {V5_CANDIDATE_EXPERIENCE.cards.map((card, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p-8 rounded-3xl border transition-all ${
                                        isLight 
                                            ? 'bg-white border-gray-200 shadow-md' 
                                            : 'bg-[#121624] border-white/10'
                                    }`}
                                >
                                    <h3 className="text-lg font-bold mb-3">
                                        {card.title}
                                    </h3>
                                    <p className={`text-sm leading-relaxed mb-4 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {card.body}
                                    </p>
                                    <p className={`text-xs leading-relaxed italic pt-3 border-t border-white/10 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {card.detail}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Candidate Links & Accommodations */}
                        <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-6 ${
                            isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
                        }`}>
                            <div className="text-xs sm:text-sm text-gray-300">
                                <span>{V5_CANDIDATE_EXPERIENCE.accommodation} </span>
                                <Link to={V5_CANDIDATE_EXPERIENCE.accommodation_link} className="text-blue-400 font-semibold underline hover:text-blue-300">
                                    Assessment Support
                                </Link>
                                <span>.</span>
                            </div>

                            <Link 
                                to={V5_CANDIDATE_EXPERIENCE.prep_guide_link}
                                className="px-6 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg transition-all shrink-0"
                            >
                                {V5_CANDIDATE_EXPERIENCE.prep_guide_label} &rarr;
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 6: LIVE TELEMETRY SHOWCASE & RECRUITER INSIGHTS ─────── */}
                <section aria-labelledby="showcase-heading" className={`py-24 border-t ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-[#0f131c] border-white/5'}`}>
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${
                                isLight ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-teal-500/20 bg-teal-500/10 text-teal-400'
                            }`}>
                                <Activity size={12} /> Live Integrity Engine
                            </div>
                            <h2 id="showcase-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                Complete Evaluation Visibility and{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">
                                    Audit Telemetry
                                </span>
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Real-time monitoring verifies workspace honesty while giving hiring managers instant, objective ranking evidence.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 max-w-6xl mx-auto">
                            {/* Artifact A: Proctoring Telemetry Log */}
                            <div className={`rounded-[2rem] border overflow-hidden ${isLight ? 'bg-white border-gray-200 shadow-sm' : 'bg-white/5 border-white/8'}`}>
                                <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={14} className={isLight ? "text-teal-600" : "text-teal-400"} />
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-teal-700' : 'text-teal-400'}`}>Real-Time Proctoring Audit Log</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className={`text-[9px] font-black ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>MONITORING ACTIVE</span>
                                    </div>
                                </div>
                                <div className="p-6 space-y-3">
                                    {[
                                        { type: "TAB SWITCH DETECTED",      time: "00:04:12", severity: "HIGH",   penalty: "+15", desc: "Switched away from assessment tab to external window" },
                                        { type: "MULTIPLE FACES DETECTED", time: "00:06:45", severity: "HIGH",   penalty: "+25", desc: "Second person entered camera frame during coding task" },
                                        { type: "HEAD TURNED",             time: "00:08:26", severity: "MEDIUM", penalty: "+3",  desc: "Head turned excessively away from monitor" }
                                    ].map((log, i) => (
                                        <div key={i} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                                            isLight ? 'bg-rose-50/60 border-rose-100' : 'bg-rose-500/5 border-rose-500/15'
                                        }`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.severity === 'HIGH' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                                    <p className={`text-[10px] font-black uppercase ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>{log.type}</p>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                                        log.severity === 'HIGH' 
                                                            ? (isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/15 text-rose-400') 
                                                            : (isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/15 text-amber-400')
                                                    }`}>{log.severity}</span>
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
                                        Every assessment generates an audit trail. Hiring teams know exactly how candidates performed throughout the test.
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
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                        isLight ? 'text-emerald-800 bg-emerald-100 border border-emerald-300' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                    }`}>ACTIVE SESSION</span>
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
                                <div key={idx} className={`p-8 rounded-[2rem] border text-center transition-all duration-300 hover:-translate-y-1 ${
                                    isLight ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-white/5 border-white/5 hover:bg-white/8'
                                }`}>
                                    <p className={`text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${m.grad} mb-3`}>{m.value}</p>
                                    <p className={`text-sm font-semibold leading-snug ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-2`}>{m.label}</p>
                                    <cite className={`text-[10px] block not-italic ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>Source: {m.source}</cite>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 7: COMPARISON TABLE ──────────────────────────────────── */}
                <section aria-labelledby="comparison-heading" className={`py-24 border-t ${isLight ? 'bg-white' : 'bg-[#0a0d14]'}`}>
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="text-center max-w-3xl mx-auto mb-14">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${
                                isLight ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                            }`}>
                                <TrendingDown size={12} /> Tool Comparison
                            </div>
                            <h2 id="comparison-heading" className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                                How Does Hire1Percent Compare to<br />{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">
                                    Legacy Multi-Tool Stacks?
                                </span>
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Compare how Hire1Percent simplifies your recruiting operations while lowering point-solution subscription costs:
                            </p>
                        </div>

                        <div className="max-w-4xl mx-auto mb-8">
                            <div className={`rounded-[2rem] border overflow-hidden shadow-xl ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-[#0f131c]'}`}>
                                <table className="w-full text-left border-collapse">
                                    <caption className="sr-only">Hire1Percent vs Legacy Multi-Tool Stacks Comparison Table</caption>
                                    <thead>
                                        <tr className={`grid grid-cols-3 ${isLight ? 'bg-gray-50 border-b border-gray-200' : 'bg-white/5 border-b border-white/8'}`}>
                                            <th scope="col" className="px-6 py-4 font-normal">
                                                <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Feature / Capability</span>
                                            </th>
                                            <th scope="col" className={`px-6 py-4 border-x text-center font-normal ${isLight ? 'border-gray-200' : 'border-white/8'}`}>
                                                <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>Legacy Multi-Tool Stack</span>
                                            </th>
                                            <th scope="col" className="px-6 py-4 text-center font-normal">
                                                <span className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Hire1Percent Platform</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonRows.map((row, idx) => (
                                            <tr key={idx} className={`grid grid-cols-3 border-b last:border-b-0 transition-colors duration-200 ${isLight ? 'border-gray-100 hover:bg-gray-50/60' : 'border-white/5 hover:bg-white/3'}`}>
                                                <th scope="row" className="px-6 py-5 flex items-center font-normal">
                                                    <span className={`text-sm font-bold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>{row.feature}</span>
                                                </th>
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
                            <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-bold text-blue-500 hover:underline">
                                View detailed pricing and feature breakdowns <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 8: PLATFORM OVERVIEW & DEFINITIONS ──────────────────── */}
                <section aria-labelledby="glance-heading" className={`py-20 border-t ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-[#0f131c] border-white/5'}`}>
                    <div className="container mx-auto px-6 max-w-5xl">
                        <div className="text-center mb-12">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider mb-4 ${
                                isLight ? 'border-purple-200 bg-purple-50 text-purple-600' : 'border-purple-500/20 bg-purple-500/8 text-purple-400'
                            }`}>
                                <BookOpen size={12} /> Platform Overview
                            </div>
                            <h2 id="glance-heading" className="text-3xl md:text-4xl font-black mb-4 tracking-tight">
                                Hire1Percent at a Glance
                            </h2>
                            <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>
                                Verified summary of Hire1Percent capabilities, evaluation workflows, and platform architecture.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Definition List (<dl>) */}
                            <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-white border-gray-200' : 'bg-white/4 border-white/8'}`}>
                                <h3 className="text-lg font-bold mb-5 text-blue-500">Core Platform Architecture</h3>
                                <dl className="space-y-4">
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Platform Model</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>AI-powered technical recruitment &amp; proctored assessment engine</dd>
                                    </div>
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Primary Users</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Engineering recruiters, hiring managers, and software candidates</dd>
                                    </div>
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Technical Evaluation</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Multi-case coding challenges with dynamic mid-task requirement changes</dd>
                                    </div>
                                    <div className="border-b border-gray-200/50 dark:border-white/5 pb-3">
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Anti-Cheat Defense</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>4-Layer verification: Environment, Keystrokes, AI Defense, Adaptation</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Scorecard Delivery</dt>
                                        <dd className={`text-sm md:text-base font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>Automated ATS webhook dispatch with plain-English summary &amp; code diffs</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Quick Facts List */}
                            <div className={`p-8 rounded-[2rem] border ${isLight ? 'bg-white border-gray-200' : 'bg-white/4 border-white/8'}`}>
                                <h3 id="quick-facts-heading" className="text-lg font-bold mb-5 text-teal-500">Quick Facts About Hire1Percent</h3>
                                <ul className="space-y-4">
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>Platform:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Technical assessment platform with 4-layer anti-cheat</span>
                                    </li>
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>Coding Languages:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Python, JavaScript, TypeScript, Go, Java, C++, and 20+ stacks</span>
                                    </li>
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>AI Code Defense:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>3-minute voice conversation defending architecture &amp; trade-offs</span>
                                    </li>
                                    <li className="border-b border-gray-200/50 dark:border-white/5 pb-3 text-sm md:text-base">
                                        <strong>Pricing Model:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Assessment credits starting at $7.50 PAYG, with unused credit rollover</span>
                                    </li>
                                    <li className="text-sm md:text-base">
                                        <strong>Deterministic Fixture:</strong> <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Reproducible backend_events_v5 benchmark with 10 unit test cases</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── SECTION 9: PRICING AND DEMO ──────────────────────────────────── */}
                <section id="pricing-and-demo" className={`py-24 border-t ${isLight ? 'bg-white' : 'bg-[#0a0d14]'}`}>
                    <div className="container mx-auto px-6 max-w-7xl">
                        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Pricing &amp; Plans</span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                                Simple, Transparent Assessment Pricing
                            </h2>
                            <p className={`text-base leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                Pay only for completed assessment scorecards. No hidden setup fees or surprise platform charges. Unused credits roll over automatically.
                            </p>
                        </div>

                        {/* 4 Pricing Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                            {PLANS.map((plan) => {
                                const isPopular = plan.popular;
                                return (
                                    <div 
                                        key={plan.plan_id}
                                        className={`rounded-3xl p-6 sm:p-7 border relative flex flex-col justify-between transition-all ${
                                            isPopular 
                                                ? 'bg-gradient-to-b from-blue-900/30 to-[#0c101d] border-blue-500/50 shadow-2xl shadow-blue-500/10' 
                                                : isLight 
                                                    ? 'bg-white border-gray-200 shadow-md' 
                                                    : 'bg-[#101422] border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        {isPopular && (
                                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                                                Most Popular
                                            </div>
                                        )}

                                        <div>
                                            <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                                            <p className={`text-xs mb-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {plan.description}
                                            </p>

                                            {/* Price Display */}
                                            <div className="mb-4">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl sm:text-4xl font-extrabold">
                                                        {formatCents(plan.amount_cents, { showCents: false })}
                                                    </span>
                                                    {plan.is_monthly && !plan.is_custom && (
                                                        <span className="text-xs text-gray-400">/month</span>
                                                    )}
                                                </div>

                                                {/* Credit Breakdown */}
                                                {!plan.is_custom && (
                                                    <div className="mt-2 text-xs font-semibold text-blue-400">
                                                        {plan.is_monthly ? (
                                                            <span>{plan.base_credits} base + {plan.bonus_credits} bonus = {plan.total_credits} credits</span>
                                                        ) : (
                                                            <span>1 assessment credit</span>
                                                        )}
                                                    </div>
                                                )}

                                                {plan.is_custom && (
                                                    <div className="mt-2 text-xs font-semibold text-teal-400">
                                                        100+ assessments / month
                                                    </div>
                                                )}

                                                {/* Effective Rate */}
                                                <div className="mt-1 text-[11px] text-gray-400">
                                                    Effective: {formatEffectiveRate(plan)} per assessment
                                                </div>
                                            </div>

                                            {/* Feature List */}
                                            <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-gray-300 mb-6">
                                                {plan.features.map((f, fIdx) => (
                                                    <li key={fIdx} className="flex items-center gap-2">
                                                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                        <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <Link 
                                            to={getPlanCtaUrl(plan.plan_id)}
                                            className={`w-full py-3 rounded-xl text-xs font-bold text-center block transition-all shadow-md active:scale-95 ${
                                                isPopular 
                                                    ? 'bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white' 
                                                    : isLight
                                                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                                        : 'bg-white/10 hover:bg-white/15 text-white'
                                            }`}
                                        >
                                            {plan.is_custom ? 'Talk to Sales' : 'Select Plan'} &rarr;
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>

                        {/* View Full Pricing Page Link */}
                        <div className="text-center mb-16">
                            <Link 
                                to="/pricing" 
                                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <span>Compare all plan features &amp; credit rollover rules on our dedicated Pricing page</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* ─── SUBSECTION: API & WEBHOOKS (#api-webhooks) ────────────── */}
                        <div id="api-webhooks" className={`p-8 sm:p-10 rounded-3xl border mb-20 ${
                            isLight ? 'bg-gray-900 text-white border-gray-800' : 'bg-[#0b0e18] border-white/10'
                        }`}>
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-teal-500/20 text-teal-300 text-xs font-mono mb-2">
                                        <Terminal className="w-3.5 h-3.5" />
                                        <span>API &amp; Webhook Integration</span>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold">
                                        Automated Webhook Delivery: <span className="font-mono text-blue-400 text-lg">assessment.report.ready</span>
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
                                        Receive completed assessment scorecards, anti-cheat signals, and code defense evaluations directly into your ATS or backend pipeline.
                                    </p>
                                </div>

                                <button
                                    onClick={handleCopyPayload}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-2 shrink-0 border border-white/10 cursor-pointer"
                                    aria-label="Copy JSON payload"
                                >
                                    {copiedJson ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Copied to Clipboard</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy Example JSON</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Valid JSON Display */}
                            <pre className="p-4 sm:p-6 rounded-2xl bg-black/60 border border-white/10 text-xs font-mono text-gray-200 overflow-x-auto leading-relaxed">
                                <code>{JSON.stringify(WEBHOOK_EXAMPLE_PAYLOAD, null, 2)}</code>
                            </pre>
                            <p className="text-[11px] text-gray-400 mt-3 italic">
                                Note: This illustrative payload displays deterministic fixture <span className="font-mono text-gray-300">{FIXTURE_ID}</span> with all 4 captured anti-cheat layers.
                            </p>
                        </div>

                        {/* ─── 6 HOMEPAGE FAQS ──────────────────────────────────────── */}
                        <div className="max-w-3xl mx-auto mb-20">
                            <div className="text-center space-y-3 mb-10">
                                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Frequently Asked Questions</span>
                                <h3 className="text-2xl sm:text-3xl font-extrabold">
                                    Everything You Need to Know
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {V5_HOMEPAGE_FAQS.map((faq, idx) => {
                                    const isOpen = openFaqIndex === idx;
                                    return (
                                        <div 
                                            key={idx} 
                                            className={`rounded-2xl border transition-all ${
                                                isLight 
                                                    ? 'bg-white border-gray-200' 
                                                    : 'bg-[#101422] border-white/10'
                                            }`}
                                        >
                                            <button
                                                onClick={() => toggleFaq(idx)}
                                                className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base focus:outline-none cursor-pointer"
                                                aria-expanded={isOpen}
                                            >
                                                <span>{faq.question}</span>
                                                <ChevronDown 
                                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} 
                                                />
                                            </button>
                                            {isOpen && (
                                                <div className={`px-5 pb-5 pt-1 text-sm leading-relaxed border-t border-white/5 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                                                    {faq.answer}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ─── SECTION 12: FINAL CONVERSION CTA ─────────────────────── */}
                        <div className="rounded-3xl p-8 sm:p-12 relative overflow-hidden bg-gradient-to-r from-blue-900/40 via-blue-950/60 to-teal-900/30 border border-blue-500/30 text-center shadow-2xl">
                            <div className="max-w-2xl mx-auto space-y-6 relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs font-bold uppercase tracking-wider">
                                    <Sparkles size={12} /> Schedule Your Walkthrough
                                </div>
                                <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                                    Ready to Assess Candidates with Verified Code Defense?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                                    Schedule a 15-minute walkthrough of the 4-layer anti-cheat platform and sample scorecard. See how engineering teams eliminate candidate fraud before booking live interviews.
                                </p>

                                <div className={`max-w-xl mx-auto rounded-2xl border p-6 text-center ${
                                    isLight ? 'bg-white/90 border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                                }`}>
                                    <div className="flex items-center justify-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-sm">Calendar Booking Module</p>
                                            <p className="text-xs text-gray-400">Pick a time that works for your engineering hiring team</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <button 
                                            id="final-cta-demo"
                                            onClick={() => setIsModalOpen(true)}
                                            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-xl shadow-blue-500/25 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <Calendar size={15} />
                                            <span>Schedule 15-Minute Live Demo</span>
                                        </button>
                                        <Link 
                                            to="/sample-scorecard"
                                            className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all text-center"
                                        >
                                            View Sample Scorecard
                                        </Link>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-3">
                                        No credit card required. Experience live telemetry and AI code defense in action.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer theme={theme} />

            {/* Calibration Modal */}
            <Suspense fallback={null}>
                {isModalOpen && (
                    <CalibrationModal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                    />
                )}
            </Suspense>
        </div>
    );
};

export default AssessmentsHome;
