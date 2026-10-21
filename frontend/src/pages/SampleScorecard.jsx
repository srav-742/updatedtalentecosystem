import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    Shield, CheckCircle2, XCircle, AlertTriangle, 
    Code, Terminal, HelpCircle, FileCheck, ArrowRight,
    Eye, Activity, Bot, Clock, ChevronDown, ChevronRight,
    Copy, Check, ExternalLink, Lock, UserX
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { 
    FIXTURE_ID, 
    FIXTURE_ROLE, 
    FIXTURE_TASK_TITLE, 
    FIXTURE_RESULT,
    ORIGINAL_CODE,
    ORIGINAL_CODE_LINES,
    CORRECTED_CODE,
    CORRECTED_CODE_LINES,
    TEST_CASES,
    RECRUITER_SUMMARY,
    INTERVIEW_QUESTIONS,
    CODE_DEFENSE_PROMPT,
    CODE_DEFENSE_TRANSCRIPT,
    SESSION_EVIDENCE,
    SESSION_TIMELINE,
    runFixtureTests
} from '../utils/backendEventsV5';

const SampleScorecard = () => {
    const [theme, setTheme] = useState(() => localStorage.getItem('landing-theme') || 'dark');
    const [activeTab, setActiveTab] = useState('results'); // 'results' | 'code' | 'defense' | 'evidence'
    const [highlightedLines, setHighlightedLines] = useState([]);
    const [highlightContext, setHighlightContext] = useState(null);
    const [showCorrected, setShowCorrected] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const codeContainerRef = useRef(null);

    const isLight = theme === 'light';
    const testResults = runFixtureTests();

    // Trigger line highlighting from test case interaction
    const handleInspectTest = (testCase) => {
        setActiveTab('code');
        if (testCase.highlight_lines) {
            setHighlightedLines(testCase.highlight_lines);
            setHighlightContext({
                testId: testCase.id,
                name: testCase.name,
                description: testCase.highlight_description,
                explanation: testCase.failure_explanation
            });

            // Smooth scroll to the first highlighted line inside the code container
            setTimeout(() => {
                const targetLineEl = document.getElementById(`code-line-${testCase.highlight_lines[0]}`);
                if (targetLineEl) {
                    targetLineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetLineEl.focus();
                }
            }, 150);
        } else {
            setHighlightedLines([]);
            setHighlightContext(null);
        }
    };

    const handleCopyOriginalCode = () => {
        navigator.clipboard.writeText(ORIGINAL_CODE);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0a0d14] text-white'}`}>
            <SEO 
                title="Sample Candidate Scorecard | Hire1Percent backend_events_v5"
                description="Interactive sample assessment report for backend_events_v5. Review unit test results, interactive line highlighting for T09/T10, AI code defense transcript, and 4-layer session evidence."
                canonical="https://www.hire1percent.com/sample-scorecard"
            />

            <Navbar theme={theme} onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')} />

            <main className="flex-grow pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-6xl">
                    {/* Fictional Candidate Disclosure Alert */}
                    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <UserX className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
                            <span>
                                <strong>Illustrative Assessment Report:</strong> This scorecard displays deterministic fixture{' '}
                                <code className="px-1.5 py-0.5 rounded bg-black/40 font-mono text-amber-200">{FIXTURE_ID}</code>{' '}
                                with fictional candidate data. No actual candidate information is shown.
                            </span>
                        </div>
                        <span className="hidden sm:inline-block font-mono text-[11px] opacity-70">
                            SPEC: 2026-10-17-v5
                        </span>
                    </div>

                    {/* Report Header Card */}
                    <div className={`rounded-3xl border p-6 sm:p-8 mb-8 shadow-xl ${
                        isLight ? 'bg-white border-gray-200 shadow-blue-500/5' : 'bg-[#101422] border-white/10'
                    }`}>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        Candidate Scorecard
                                    </span>
                                    <span className="text-xs font-mono text-gray-400">Fixture: {FIXTURE_ID}</span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                    {FIXTURE_ROLE} Assessment
                                </h1>
                                <p className={`text-sm mt-1 max-w-2xl ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                    <strong>Task:</strong> {FIXTURE_TASK_TITLE}
                                </p>
                            </div>

                            {/* Overall Result Badge */}
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-black/20 border border-white/10 text-right">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Test Suite</span>
                                    <div className="text-2xl font-black text-amber-400">
                                        {FIXTURE_RESULT.passed} / {FIXTURE_RESULT.total} Passed
                                    </div>
                                    <span className="text-[11px] text-amber-400/80">T09, T10 Failed</span>
                                </div>
                                <Link 
                                    to="/book-demo?placement=sample_scorecard_header"
                                    className="px-5 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg transition-all"
                                >
                                    Book Live Demo
                                </Link>
                            </div>
                        </div>

                        {/* Recruiter Plain-English Summary & Next Interview Focus */}
                        <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className={`md:col-span-2 p-5 rounded-2xl border ${isLight ? 'bg-blue-50/70 border-blue-200' : 'bg-blue-950/20 border-blue-500/20'}`}>
                                <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                                    <FileCheck className="w-4 h-4" aria-hidden="true" />
                                    <span>Plain-English Recruiter Summary</span>
                                </div>
                                <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                                    {RECRUITER_SUMMARY}
                                </p>
                            </div>

                            <div className={`p-5 rounded-2xl border ${isLight ? 'bg-teal-50/70 border-teal-200' : 'bg-teal-950/20 border-teal-500/20'}`}>
                                <div className="flex items-center gap-2 mb-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                                    <Bot className="w-4 h-4" aria-hidden="true" />
                                    <span>Recommended Interview Focus</span>
                                </div>
                                <p className={`text-xs leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                    Probe out-of-order event streams and distributed state deduplication. The candidate understands core Python and standard dictionaries, but needs coaching on distributed event edge cases.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Tabbed Interface */}
                    <div className="space-y-6">
                        {/* Tab Headers */}
                        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-1" role="tablist">
                            {[
                                { id: 'results', label: '10-Case Test Suite', icon: Terminal },
                                { id: 'code', label: 'Submitted Code & AST Checkpoints', icon: Code },
                                { id: 'defense', label: 'AI Code Defense Transcript', icon: Bot },
                                { id: 'evidence', label: '4-Layer Session Evidence & Timeline', icon: Shield }
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : isLight 
                                                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' 
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" aria-hidden="true" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ─── TAB 1: RESULTS ────────────────────────────────────────────── */}
                        {activeTab === 'results' && (
                            <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
                                isLight ? 'bg-white border-gray-200' : 'bg-[#101422] border-white/10'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold">Ten-Case Unit Test Suite Results</h2>
                                        <p className="text-xs text-gray-400">
                                            Click any failing test case to jump to the exact lines in the submitted code.
                                        </p>
                                    </div>
                                    <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-gray-300">
                                        Pass Rate: 80% (8 / 10)
                                    </div>
                                </div>

                                <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                    {TEST_CASES.map((tc) => {
                                        const passes = tc.original_passes;
                                        return (
                                            <div 
                                                key={tc.id}
                                                className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                                                    !passes 
                                                        ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                                                        : isLight ? 'bg-white hover:bg-gray-50' : 'bg-transparent hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/40 text-gray-300">
                                                            {tc.id}
                                                        </span>
                                                        <span className="text-sm font-semibold">{tc.name}</span>
                                                    </div>
                                                    {!passes && tc.failure_explanation && (
                                                        <p className="text-xs text-amber-300/90 pl-1">
                                                            <strong>Root Cause:</strong> {tc.failure_explanation}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    {passes ? (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>PASSED</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg">
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                <span>FAILED</span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleInspectTest(tc)}
                                                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1"
                                                                aria-label={`Inspect line numbers for ${tc.id}`}
                                                            >
                                                                <span>Inspect Code</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ─── TAB 2: SUBMITTED CODE & AST CHECKPOINTS ─────────────────────── */}
                        {activeTab === 'code' && (
                            <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
                                isLight ? 'bg-white border-gray-200' : 'bg-[#101422] border-white/10'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold">Submitted Solution &amp; Line Analysis</h2>
                                        <p className="text-xs text-gray-400">
                                            Interactive line highlighting reveals specific design choices and edge-case oversights.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCopyOriginalCode}
                                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5 border border-white/10"
                                            aria-label="Copy candidate submitted code"
                                        >
                                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                                        </button>
                                        <button
                                            onClick={() => setShowCorrected(!showCorrected)}
                                            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 transition-all"
                                        >
                                            {showCorrected ? 'Hide Corrected Reference' : 'Show Corrected Reference'}
                                        </button>
                                    </div>
                                </div>

                                {/* Active Highlight Notice Banner */}
                                {highlightContext && (
                                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold uppercase tracking-wider text-amber-400">
                                                Active Highlight: {highlightContext.testId} — {highlightContext.name}
                                            </span>
                                            <button 
                                                onClick={() => { setHighlightedLines([]); setHighlightContext(null); }}
                                                className="text-amber-400 hover:text-white underline text-[11px]"
                                            >
                                                Clear Highlight
                                            </button>
                                        </div>
                                        <p>{highlightContext.description}</p>
                                    </div>
                                )}

                                {/* Interactive Code Block with Preserved Line Numbers */}
                                <div 
                                    ref={codeContainerRef}
                                    className="rounded-2xl bg-[#07090f] border border-white/15 overflow-hidden font-mono text-xs sm:text-sm text-gray-200"
                                    role="region"
                                    aria-label="Candidate Submitted Python Code"
                                >
                                    <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between text-xs text-gray-400 font-sans">
                                        <span>candidate_submission.py (Python 3.11)</span>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                                            <span>8/10 Passed</span>
                                        </div>
                                    </div>
                                    <div className="p-4 overflow-x-auto leading-relaxed">
                                        {ORIGINAL_CODE_LINES.map((lineText, idx) => {
                                            const lineNum = idx + 1;
                                            const isHighlighted = highlightedLines.includes(lineNum);
                                            return (
                                                <div 
                                                    key={lineNum}
                                                    id={`code-line-${lineNum}`}
                                                    tabIndex={isHighlighted ? 0 : -1}
                                                    className={`flex items-start rounded px-2 py-0.5 transition-colors ${
                                                        isHighlighted 
                                                            ? 'bg-amber-500/25 border-l-4 border-amber-400 text-amber-100 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400' 
                                                            : 'hover:bg-white/5'
                                                    }`}
                                                >
                                                    <span className={`w-8 select-none text-right pr-4 shrink-0 text-xs ${
                                                        isHighlighted ? 'text-amber-300 font-bold' : 'text-gray-600'
                                                    }`}>
                                                        {lineNum}
                                                    </span>
                                                    <span className="whitespace-pre flex-1">{lineText}</span>
                                                    {isHighlighted && (
                                                        <span className="ml-3 text-[11px] font-sans px-2 py-0.5 rounded bg-amber-400 text-black font-bold shrink-0">
                                                            Issue Here
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Expandable Corrected Reference Solution */}
                                {showCorrected && (
                                    <div className="rounded-2xl bg-[#09111c] border border-teal-500/30 overflow-hidden font-mono text-xs sm:text-sm text-gray-200 mt-4">
                                        <div className="px-4 py-2 border-b border-teal-500/20 bg-teal-500/10 flex items-center justify-between text-xs text-teal-300 font-sans font-semibold">
                                            <span>corrected_reference_solution.py (Batch-wide set + max timestamp)</span>
                                            <span className="text-emerald-400 font-bold">10/10 Passed</span>
                                        </div>
                                        <div className="p-4 overflow-x-auto leading-relaxed">
                                            {CORRECTED_CODE_LINES.map((lineText, idx) => (
                                                <div key={idx} className="flex items-start px-2 py-0.5">
                                                    <span className="w-8 select-none text-right pr-4 shrink-0 text-xs text-gray-600">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="whitespace-pre">{lineText}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── TAB 3: AI CODE DEFENSE ────────────────────────────────────── */}
                        {activeTab === 'defense' && (
                            <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
                                isLight ? 'bg-white border-gray-200' : 'bg-[#101422] border-white/10'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold">Layer 3: AI Conversational Code Defense</h2>
                                        <p className="text-xs text-gray-400">
                                            Recorded 3-minute post-submission interview verifying original authorship and design decisions.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-bold">
                                            Authorship Confidence: {SESSION_EVIDENCE.layer3.authorship_confidence}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {CODE_DEFENSE_TRANSCRIPT.map((entry, idx) => {
                                        const isSystem = entry.speaker === 'System';
                                        return (
                                            <div 
                                                key={idx}
                                                className={`p-5 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                                                    isSystem 
                                                        ? 'bg-blue-950/20 border-blue-500/30 text-blue-100' 
                                                        : isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-xs">
                                                    {isSystem ? (
                                                        <>
                                                            <Bot className="w-4 h-4 text-blue-400" />
                                                            <span className="text-blue-400">AI Technical Interviewer</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                            <span className="text-emerald-400">Candidate (Recorded Video Prompt)</span>
                                                        </>
                                                    )}
                                                </div>
                                                <p>{entry.text}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ─── TAB 4: 4-LAYER EVIDENCE & TIMELINE ────────────────────────── */}
                        {activeTab === 'evidence' && (
                            <div className={`p-6 sm:p-8 rounded-3xl border space-y-8 ${
                                isLight ? 'bg-white border-gray-200' : 'bg-[#101422] border-white/10'
                            }`}>
                                <div>
                                    <h2 className="text-lg font-bold">Four-Layer Session Evidence</h2>
                                    <p className="text-xs text-gray-400">
                                        Complete multi-modal integrity signals captured throughout the candidate's session.
                                    </p>
                                </div>

                                {/* 4 Populated Evidence Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Layer 1 */}
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                            <span className="font-bold text-xs uppercase tracking-wider text-blue-400">Layer 1: Biometric &amp; Environment</span>
                                            <span className="text-xs font-bold text-emerald-400">{SESSION_EVIDENCE.layer1.status}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Face Present</span>
                                                <span className="font-bold text-emerald-400">{SESSION_EVIDENCE.layer1.face_present_pct}%</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Gaze On-Screen</span>
                                                <span className="font-bold text-emerald-400">{SESSION_EVIDENCE.layer1.gaze_on_screen_pct}%</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Tab Switches</span>
                                                <span className="font-bold text-emerald-400">{SESSION_EVIDENCE.layer1.tab_switches}</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Clipboard Pastes</span>
                                                <span className="font-bold text-emerald-400">{SESSION_EVIDENCE.layer1.clipboard_pastes_external}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Layer 2 */}
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                            <span className="font-bold text-xs uppercase tracking-wider text-blue-400">Layer 2: Keystroke Telemetry</span>
                                            <span className="text-xs font-bold text-emerald-400">{SESSION_EVIDENCE.layer2.status}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Total Keystrokes</span>
                                                <span className="font-bold">{SESSION_EVIDENCE.layer2.total_keystrokes}</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Typing Speed</span>
                                                <span className="font-bold">{SESSION_EVIDENCE.layer2.typing_speed_wpm} WPM</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">AST Snapshots</span>
                                                <span className="font-bold text-blue-400">{SESSION_EVIDENCE.layer2.ast_checkpoints} Checkpoints</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Incremental Ratio</span>
                                                <span className="font-bold text-emerald-400">{SESSION_EVIDENCE.layer2.incremental_ratio * 100}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Layer 3 */}
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                            <span className="font-bold text-xs uppercase tracking-wider text-blue-400">Layer 3: AI Code Defense</span>
                                            <span className="text-xs font-bold text-teal-400">{SESSION_EVIDENCE.layer3.status}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Authorship Confidence</span>
                                                <span className="font-bold text-teal-400">{SESSION_EVIDENCE.layer3.authorship_confidence}</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Defense Duration</span>
                                                <span className="font-bold">{SESSION_EVIDENCE.layer3.defense_duration_seconds}s</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Questions Answered</span>
                                                <span className="font-bold">{SESSION_EVIDENCE.layer3.questions_answered}</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Response Latency</span>
                                                <span className="font-bold">{SESSION_EVIDENCE.layer3.response_latency_avg_ms}ms</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Layer 4 */}
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                            <span className="font-bold text-xs uppercase tracking-wider text-blue-400">Layer 4: Constraint Update &amp; LLM Signature</span>
                                            <span className="text-xs font-bold text-amber-400">{SESSION_EVIDENCE.layer4.status}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Update Disclosed</span>
                                                <span className="font-bold">{SESSION_EVIDENCE.layer4.update_disclosed_at}</span>
                                            </div>
                                            <div className="p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">LLM Signature</span>
                                                <span className="font-bold text-emerald-400">{SESSION_EVIDENCE.layer4.llm_probability_score} (Clean)</span>
                                            </div>
                                            <div className="col-span-2 p-2 rounded bg-black/20">
                                                <span className="text-gray-400 block text-[10px]">Adaptation Summary</span>
                                                <span className="text-amber-300 font-medium">{SESSION_EVIDENCE.layer4.adaptation_status}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Eight-Row Chronological Timeline */}
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <h3 className="text-base font-bold">Eight-Row Chronological Event Timeline</h3>
                                    <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                        {SESSION_TIMELINE.map((entry, idx) => (
                                            <div key={idx} className="p-3.5 sm:p-4 flex items-center justify-between gap-4 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10">
                                                        {entry.time}
                                                    </span>
                                                    <span>{entry.event}</span>
                                                </div>
                                                <span className="text-gray-400 text-[11px] font-mono shrink-0">
                                                    {entry.layer}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom CTA Banner */}
                    <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-blue-900/30 via-[#101422] to-teal-900/20 border border-blue-500/20 text-center space-y-4">
                        <h3 className="text-xl sm:text-2xl font-bold">
                            Evaluate engineering candidates with verified code defense
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
                            Eliminate candidate fraud and save engineering hours by validating authorship before scheduling interviews.
                        </p>
                        <div className="pt-2 flex justify-center gap-4">
                            <Link 
                                to="/book-demo?placement=sample_scorecard_footer"
                                className="px-6 py-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg transition-all"
                            >
                                Schedule a 15-Minute Live Walkthrough &rarr;
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer theme={theme} />
        </div>
    );
};

export default SampleScorecard;
