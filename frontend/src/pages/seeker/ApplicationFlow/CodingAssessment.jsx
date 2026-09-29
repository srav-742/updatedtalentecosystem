import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Code2,
    Clock3,
    Terminal,
    Play,
    Loader2,
    CheckCircle2,
    FileLock2,
    RotateCcw,
    ChevronUp,
    ChevronDown,
    Check,
    X,
    ShieldAlert
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../../firebase';
import SecureExamWrapper from '../../../components/exam/SecureExamWrapperEnhanced';
import { calculateDynamicMarks, normalizeDifficulty } from '../../../utils/codingScoreCalculator';

const CodingAssessment = ({
    job,
    user,
    onComplete,
    onBack,
    onSecurityReset,
    sharedStream,
    setSharedStream,
    sharedRecorder,
    setSharedRecorder,
    sharedSessionId,
    setSharedSessionId,
    sharedRecordingSessionId,
    setSharedRecordingSessionId,
    firstQuestionData,
    setFirstQuestionData,
    sharedChunkIndexRef,
    sharedChunkUploadsRef
}) => {
    const [lobbyStarted, setLobbyStarted] = useState(false);
    const [lobbyError, setLobbyError] = useState(null);
    const [started, setStarted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roundConfig, setRoundConfig] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    
    // answers structure: { [questionId]: { code: string, language: string } }
    const [answers, setAnswers] = useState({});
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [securityResetting, setSecurityResetting] = useState(false);

    // Real Code Execution State
    const [runningCode, setRunningCode] = useState(false);
    const [executionResults, setExecutionResults] = useState({}); // { [questionId]: { status, passed, failed, total, publicPassed, publicTotal, hiddenPassed, hiddenTotal, executionTime, results } }
    const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState(0);
    const [consoleOpen, setConsoleOpen] = useState(false);

    const timerRef = useRef(null);

    // Fetch existing coding round configuration
    const fetchCodingRound = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders().catch(() => ({}));
            if (user?.uid || user?._id || user?.id) {
                headers['x-user-id'] = user?.uid || user?._id || user?.id || '';
            }
            const targetJobId = job?._id || job?.id;
            if (!targetJobId) {
                setError('Job reference is missing. Please refresh the page.');
                return;
            }
            const res = await axios.get(`${API_URL}/coding-assessments/round/${targetJobId}`, { headers });
            if (res.data?.success && res.data.codingRound) {
                const round = res.data.codingRound;
                if (!round.questions || round.questions.length === 0) {
                    setError('No coding challenges have been added for this job yet. Please check back shortly.');
                    return;
                }

                // Enrich questions with dynamic marks totaling strictly 100 marks
                const rawQuestions = round.questions || [];
                const dynamicCalcs = calculateDynamicMarks(rawQuestions);
                const calcsMap = new Map(dynamicCalcs.map(c => [c.id ? c.id.toString() : '', c]));
                const enrichedQuestions = rawQuestions.map(q => {
                    const c = calcsMap.get(q._id ? q._id.toString() : '');
                    return {
                        ...q,
                        marks: c?.maximumMarks ?? (q.marks || 10),
                        difficulty: c?.difficulty ?? normalizeDifficulty(q.difficulty),
                        difficultyWeight: c?.difficultyWeight ?? 2
                    };
                });

                setRoundConfig(round);
                setQuestions(enrichedQuestions);
                if (round.timerType === 'individual') {
                    const firstQ = enrichedQuestions[0];
                    const qTimer = firstQ?.timer || Math.floor((round.totalTime || 60) / enrichedQuestions.length);
                    setTimeLeft(qTimer * 60);
                } else {
                    setTimeLeft((round.totalTime || 60) * 60);
                }

                // Initialize answers with starter template
                const initialAnswers = {};
                (round.questions || []).forEach(q => {
                    const defaultLang = q.allowedLanguages?.[0] || round.languages?.[0] || 'Python';
                    initialAnswers[q._id] = {
                        code: getStarterTemplate(q.title, defaultLang),
                        language: defaultLang
                    };
                });
                setAnswers(initialAnswers);
            } else {
                setError(res.data?.message || 'No coding round configured for this job.');
            }
        } catch (err) {
            console.error("Failed to load coding round:", err);
            setError(err.response?.data?.message || 'Failed to load coding assessment data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (job?._id || job?.id) {
            fetchCodingRound();
        }
    }, [job?._id, job?.id]);

    // Timer Countdown
    useEffect(() => {
        if (started && timeLeft > 0 && !securityResetting) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        if (roundConfig?.timerType === 'individual') {
                            if (currentQIndex < questions.length - 1) {
                                setCurrentQIndex(q => q + 1);
                                return 0;
                            } else {
                                handleSubmitSolutions();
                                return 0;
                            }
                        } else {
                            handleSubmitSolutions();
                            return 0;
                        }
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [started, timeLeft, securityResetting, currentQIndex, questions, roundConfig]);

    // Handle individual question timer reset on question switch
    useEffect(() => {
        if (started && roundConfig?.timerType === 'individual' && questions.length > 0) {
            const currentQ = questions[currentQIndex];
            const qTimer = currentQ?.timer || Math.floor((roundConfig?.totalTime || 60) / questions.length);
            setTimeLeft(qTimer * 60);
        }
    }, [currentQIndex, started, roundConfig, questions]);

    const getStarterTemplate = (title, language) => {
        const lang = (language || '').toLowerCase();
        if (lang === 'python') {
            return `def solution():\n    # Write your solution here\n    pass\n`;
        } else if (lang === 'javascript') {
            return `function solution() {\n    // Write your solution here\n    \n}\n`;
        } else if (lang === 'java') {
            return `public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n        \n    }\n}\n`;
        } else if (lang === 'c++') {
            return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
        } else if (lang === 'sql') {
            return `-- Write your SQL query here\nSELECT * FROM users;\n`;
        }
        return `// Write your solution here\n`;
    };

    const enableMedia = async () => {
        try {
            setLobbyError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            setSharedStream(stream);
        } catch (err) {
            console.error("Camera/Mic access denied:", err);
            setLobbyError("Camera and microphone access are required to proceed.");
        }
    };

    // Auto-request webcam on mount so camera is ready immediately
    useEffect(() => {
        if (!sharedStream) {
            enableMedia();
        }
    }, []);

    const handleLobbyBack = () => {
        if (sharedStream) {
            sharedStream.getTracks().forEach(t => t.stop());
            setSharedStream(null);
        }
        setLobbyStarted(false);
    };

    const startCodingAssessment = () => {
        if (!sharedStream) {
            enableMedia();
            return;
        }
        setStarted(true);
    };

    const handleCodeChange = (codeValue) => {
        if (!currentQuestion) return;
        setAnswers(prev => ({
            ...prev,
            [currentQuestion._id]: {
                ...prev[currentQuestion._id],
                code: codeValue
            }
        }));
    };

    const handleLanguageChange = (lang) => {
        if (!currentQuestion) return;
        setAnswers(prev => ({
            ...prev,
            [currentQuestion._id]: {
                code: getStarterTemplate(currentQuestion.title, lang),
                language: lang
            }
        }));
    };

    const handleRunCode = async () => {
        if (!currentQuestion) return;
        const currentAns = answers[currentQuestion._id];
        const code = currentAns?.code || '';
        const language = currentAns?.language || 'python';

        if (!code.trim()) {
            setError('Please write some code before running tests.');
            return;
        }

        setRunningCode(true);
        setConsoleOpen(true);
        setError(null);

        try {
            const headers = await getAuthHeaders().catch(() => ({}));
            if (user?.uid || user?._id || user?.id) {
                headers['x-user-id'] = user?.uid || user?._id || user?.id || '';
            }

            const payload = {
                questionId: currentQuestion._id,
                code,
                language
            };

            const res = await axios.post(`${API_URL}/coding-assessments/run`, payload, { headers });
            if (res.data?.success) {
                setExecutionResults(prev => ({
                    ...prev,
                    [currentQuestion._id]: res.data
                }));
                setSelectedTestCaseIdx(0);
            } else {
                setExecutionResults(prev => ({
                    ...prev,
                    [currentQuestion._id]: {
                        status: res.data?.status || 'EXECUTION_ERROR',
                        passed: 0,
                        failed: 0,
                        total: 0,
                        errorMessage: res.data?.message || 'Execution failed. Please try again.',
                        results: []
                    }
                }));
            }
        } catch (runErr) {
            console.error('Run code error:', runErr);
            setExecutionResults(prev => ({
                ...prev,
                [currentQuestion._id]: {
                    status: 'EXECUTION_ERROR',
                    passed: 0,
                    failed: 0,
                    total: 0,
                    errorMessage: runErr.response?.data?.message || runErr.message || 'Execution service unreachable. Please retry.',
                    results: []
                }
            }));
        } finally {
            setRunningCode(false);
        }
    };

    const handleSubmitSolutions = async () => {
        setSaving(true);
        setError(null);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            // Format solutions array
            const solutions = questions.map(q => ({
                questionId: q._id,
                code: answers[q._id]?.code || '',
                language: answers[q._id]?.language || 'python'
            }));

            const headers = await getAuthHeaders().catch(() => ({}));
            if (user?.uid || user?._id || user?.id) {
                headers['x-user-id'] = user?.uid || user?._id || user?.id || '';
            }
            const res = await axios.post(`${API_URL}/coding-assessments/submit`, {
                jobId: job?._id || job?.id,
                userId: user?.uid || user?._id || user?.id || '',
                answers: solutions
            }, { headers });

            if (res.data?.success) {
                // Success! Complete step
                onComplete(res.data.codingScore);
            }
        } catch (err) {
            console.error("Failed to submit coding assessment:", err);
            setError(err.response?.data?.message || 'Failed to submit solutions. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleCodingSecurityReset = async (violation) => {
        setSecurityResetting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const headers = await getAuthHeaders().catch(() => ({}));
            if (user?.uid || user?._id || user?.id) {
                headers['x-user-id'] = user?.uid || user?._id || user?.id || '';
            }
            await axios.post(`${API_URL}/applications/proctoring-reset`, {
                jobId: job?._id || job?.id,
                userId: user?.uid || user?._id || user?.id || '',
                stage: 'coding',
                reason: 'Security policy violation detected during Coding Assessment.',
                violation
            }, { headers });
        } catch (error) {
            console.error('Failed to reset coding application:', error);
        }

        setAnswers({});
        setSecurityResetting(false);
        onSecurityReset({
            stage: 'coding',
            reason: 'Strict proctoring security violation triggered.',
            violation
        });
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const getFileExtension = (lang) => {
        const l = (lang || '').toLowerCase();
        if (l === 'python') return 'py';
        if (l === 'javascript') return 'js';
        if (l === 'java') return 'java';
        if (l === 'c++' || l === 'cpp') return 'cpp';
        if (l === 'sql') return 'sql';
        return 'code';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const currentVal = e.target.value;
            const newVal = currentVal.substring(0, start) + '    ' + currentVal.substring(end);
            handleCodeChange(newVal);
            setTimeout(() => {
                if (e.target) {
                    e.target.selectionStart = e.target.selectionEnd = start + 4;
                }
            }, 0);
        }
    };

    const handleResetCode = () => {
        const q = questions[currentQIndex];
        if (!q) return;
        const defaultLang = answers[q._id]?.language || q.allowedLanguages?.[0] || roundConfig?.languages?.[0] || 'Python';
        const starter = getStarterTemplate(q.title, defaultLang);
        handleCodeChange(starter);
    };

    const currentQuestion = questions[currentQIndex];
    const currentResult = currentQuestion ? executionResults[currentQuestion._id] : null;
    const progress = questions.length > 0 ? ((currentQIndex + 1) / questions.length) * 100 : 0;

    if (loading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center bg-gray-50/50 rounded-[2.5rem] border border-black/5">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                <p className="text-sm text-gray-500 mt-4 font-semibold">Loading assessment environment...</p>
            </div>
        );
    }

    if (error && !started) {
        return (
            <div className="mx-auto max-w-xl p-8 rounded-[2.5rem] border border-black/10 bg-white shadow-2xl text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Assessment Notice</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <div className="flex items-center justify-center flex-wrap gap-3">
                    <button
                        onClick={fetchCodingRound}
                        className="px-6 py-3 rounded-2xl bg-teal-600 text-white hover:bg-teal-700 transition font-bold"
                    >
                        Retry / Refresh
                    </button>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 transition font-bold"
                    >
                        Go Back
                    </button>
                    {onComplete && (
                        <button
                            onClick={() => onComplete(0)}
                            className="px-6 py-3 rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-bold"
                        >
                            Skip to Next Stage
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Lobby Screen
    if (!started) {
        return (
            <div className="coding-assessment-lobby-card mx-auto max-w-5xl my-6 rounded-3xl md:rounded-[2.5rem] border border-black/10 bg-white p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <Code2 size={200} />
                </div>
                <div className="relative z-10">
                    <div className="mb-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-teal-600">Coding Assessment</p>
                        <h1 className="mt-1.5 text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Coding Assessment</h1>
                        <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                            Welcome to the coding assessment round for <strong>{job?.title || 'this position'}</strong>. You will be evaluated on your programming logic, time complexity, and clean code principles.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                        {/* Left Side: Rules & Structure Instructions */}
                        <div className="rounded-2xl bg-[#faf8f5] p-5 border border-black/5 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3 text-sm md:text-base">
                                    <Clock3 size={18} className="text-teal-600" />
                                    Rules & Structure
                                </h3>
                                <ul className="text-xs md:text-sm text-gray-600 space-y-2.5 list-disc list-inside leading-relaxed">
                                    <li>Total time allotted: <strong>{roundConfig?.totalTime || 60} minutes</strong></li>
                                    <li>Total programming challenges: <strong>{questions.length} questions</strong> • Maximum Score: <strong>100 Marks</strong></li>
                                    <li>Each challenge has dynamic proportional marks based on difficulty totaling exactly 100 marks.</li>
                                    <li>Ensure you choose the correct language from the dropdown menu.</li>
                                    <li>This assessment is strictly proctored. <strong>Tab switching or leaving screen share will result in immediate disqualification.</strong></li>
                                </ul>
                            </div>
                        </div>

                        {/* Right Side: Video Preview & Action */}
                        <div className="flex flex-col justify-center">
                            {!sharedStream ? (
                                <div className="space-y-4 my-auto">
                                    <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 text-xs md:text-sm font-semibold flex items-start gap-2.5">
                                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                        <span>Webcam and microphone access are required to verify identity and maintain test integrity.</span>
                                    </div>
                                    {lobbyError && (
                                        <p className="text-xs text-red-500 font-bold">{lobbyError}</p>
                                    )}
                                    <button
                                        onClick={enableMedia}
                                        className="w-full py-3.5 rounded-2xl bg-gray-600 hover:bg-gray-700 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-gray-500/20"
                                    >
                                        <Play size={18} />
                                        Grant Camera & Mic Access
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className="aspect-video w-full rounded-2xl bg-black border border-black/10 overflow-hidden relative shadow-inner max-h-[220px]">
                                        <video
                                            autoPlay
                                            muted
                                            playsInline
                                            ref={(videoEl) => {
                                                if (videoEl && sharedStream) {
                                                    videoEl.srcObject = sharedStream;
                                                }
                                            }}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-3 left-3 px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow">
                                            Camera Active
                                        </div>
                                    </div>

                                    <button
                                        onClick={startCodingAssessment}
                                        className="w-full py-3.5 rounded-2xl bg-black hover:bg-gray-800 text-white text-base font-bold transition-all shadow-xl hover:scale-[1.01] active:scale-98 cursor-pointer"
                                    >
                                        Start Coding Assessment
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active Coding Test Screen
    return (
        <SecureExamWrapper
            examId={`coding:${job?._id || job?.id || ''}`}
            userId={user?.uid || user?._id || user?.id || ''}
            isActive={started && !securityResetting}
            requireScreenShare={true}
            requireCamera={true}
            cameraStream={sharedStream}
            showWebcamPreview={true}
            isAnswering={started && !securityResetting}
            questionIndex={currentQIndex}
            questionId={questions[currentQIndex]?._id || null}
            warningLimit={3}
            resetLimit={4}
            onSecurityReset={handleCodingSecurityReset}
            enableSnapshots={false}
        >
            <div className="fixed inset-0 z-[100] w-screen h-screen bg-[#0d1117] text-gray-100 flex flex-col overflow-hidden select-none font-sans">
                {/* ── Top Exam Navigation Header ────────────────────────────── */}
                <header className="h-16 px-6 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0 z-10 shadow-sm">
                    {/* Left: Role Title & Questions Switcher */}
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                                <Terminal size={18} />
                            </div>
                            <div className="hidden sm:block">
                                <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight">{job?.title || 'Coding Assessment'}</h1>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400">Coding Assessment</p>
                            </div>
                        </div>

                        {/* Question Switcher Pills */}
                        <div className="flex items-center gap-1.5 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
                            {questions.map((q, idx) => {
                                const hasCode = !!answers[q._id]?.code && answers[q._id]?.code.trim().length > 0;
                                const isCurrent = currentQIndex === idx;
                                return (
                                    <button
                                        key={q._id || idx}
                                        onClick={() => setCurrentQIndex(idx)}
                                        disabled={roundConfig?.timerType === 'individual'}
                                        title={`Jump to Challenge ${idx + 1}`}
                                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isCurrent
                                                ? 'bg-teal-500 text-black shadow-md shadow-teal-500/20'
                                                : hasCode
                                                    ? 'text-teal-400 hover:bg-[#161b22]'
                                                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#161b22]'
                                        }`}
                                    >
                                        <span>Q{idx + 1}</span>
                                        {hasCode && !isCurrent && <span className="text-[10px] text-teal-400">✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Center: Countdown Timer */}
                    <div className="flex items-center">
                        <div className={`px-4 py-1.5 rounded-xl border font-mono text-sm font-extrabold flex items-center gap-2 transition-all ${
                            timeLeft <= 120
                                ? 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse'
                                : timeLeft <= 300
                                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                                    : 'bg-[#0d1117] border-[#30363d] text-emerald-400'
                        }`}>
                            <Clock3 size={15} className={timeLeft <= 120 ? 'text-red-400' : timeLeft <= 300 ? 'text-amber-400' : 'text-emerald-400'} />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    </div>

                    {/* Right: Submit Button & Marks */}
                    <div className="flex items-center gap-3">
                        <span className="hidden md:inline-block text-xs font-semibold text-gray-400">
                            Challenge {currentQIndex + 1} of {questions.length} • {currentQuestion?.marks || 10} Marks
                        </span>

                        {currentQIndex === questions.length - 1 ? (
                            <button
                                onClick={handleSubmitSolutions}
                                disabled={saving}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={14} />
                                        <span>Submit Final Solutions</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to finish the test early? This will submit all your current answers.')) {
                                        handleSubmitSolutions();
                                    }
                                }}
                                disabled={saving}
                                className="px-5 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white font-bold text-xs transition-all border border-[#30363d] flex items-center gap-2 cursor-pointer"
                            >
                                {saving ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                <span>Finish Test Early</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* ── Main Full-Screen Split Workspace ──────────────────────── */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left Pane: Question Details (45% width) */}
                    <div className="w-full lg:w-[45%] h-full flex flex-col bg-[#0d1117] border-r border-[#30363d] overflow-hidden">
                        {/* Question Header */}
                        <div className="p-5 border-b border-[#30363d] bg-[#161b22]/50 shrink-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-md">
                                    Challenge {currentQIndex + 1}
                                </span>
                                <span className="text-xs font-extrabold text-gray-400">
                                    {currentQuestion?.marks || 10} Marks
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">{currentQuestion?.title}</h2>
                            <span className={`inline-block mt-2 px-2.5 py-0.5 text-[10px] font-black rounded uppercase tracking-wider ${
                                normalizeDifficulty(currentQuestion?.difficulty) === 'LOW'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : normalizeDifficulty(currentQuestion?.difficulty) === 'HIGH'
                                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                                {normalizeDifficulty(currentQuestion?.difficulty)}
                            </span>
                        </div>

                        {/* Question Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-300">
                            {/* Problem Description */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Problem Description</h3>
                                <p className="whitespace-pre-line text-gray-200 leading-relaxed font-sans">{currentQuestion?.description}</p>
                            </div>

                            {/* Input Format */}
                            {currentQuestion?.inputFormat && (
                                <div className="space-y-1.5 bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl">
                                    <h4 className="font-extrabold text-xs text-gray-300 uppercase tracking-wider">Input Format</h4>
                                    <p className="text-xs text-gray-400">{currentQuestion.inputFormat}</p>
                                </div>
                            )}

                            {/* Output Format */}
                            {currentQuestion?.outputFormat && (
                                <div className="space-y-1.5 bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl">
                                    <h4 className="font-extrabold text-xs text-gray-300 uppercase tracking-wider">Output Format</h4>
                                    <p className="text-xs text-gray-400">{currentQuestion.outputFormat}</p>
                                </div>
                            )}

                            {/* Constraints */}
                            {currentQuestion?.constraints && (
                                <div className="space-y-1.5 bg-[#161b22] border border-[#30363d] p-3.5 rounded-xl">
                                    <h4 className="font-extrabold text-xs text-gray-300 uppercase tracking-wider">Constraints</h4>
                                    <p className="text-xs text-gray-300 font-mono">{currentQuestion.constraints}</p>
                                </div>
                            )}

                            {/* Examples */}
                            {currentQuestion?.examples && currentQuestion.examples.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-extrabold text-xs text-gray-400 uppercase tracking-widest">Examples</h4>
                                    {currentQuestion.examples.map((ex, idx) => (
                                        <div key={idx} className="p-4 bg-[#161b22] rounded-xl border border-[#30363d] text-xs font-mono space-y-1.5">
                                            <div className="text-emerald-400"><strong className="text-gray-400">Input:</strong> {ex.input}</div>
                                            <div className="text-teal-300"><strong className="text-gray-400">Output:</strong> {ex.output}</div>
                                            {ex.explanation && (
                                                <div className="text-gray-400 pt-1 border-t border-[#30363d]/60 font-sans text-[11px]">
                                                    <strong>Explanation:</strong> {ex.explanation}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Question Footer Navigation */}
                        <div className="p-4 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between shrink-0">
                            <button
                                onClick={() => setCurrentQIndex(prev => Math.max(prev - 1, 0))}
                                disabled={currentQIndex === 0 || roundConfig?.timerType === 'individual'}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    currentQIndex === 0 || roundConfig?.timerType === 'individual'
                                        ? 'text-gray-600 bg-[#0d1117] border border-[#21262d] cursor-not-allowed'
                                        : 'text-gray-200 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] cursor-pointer'
                                }`}
                            >
                                <ArrowLeft size={14} />
                                <span>Previous</span>
                            </button>

                            <span className="text-xs font-semibold text-gray-400">
                                Question {currentQIndex + 1} of {questions.length}
                            </span>

                            <button
                                onClick={() => setCurrentQIndex(prev => Math.min(prev + 1, questions.length - 1))}
                                disabled={currentQIndex === questions.length - 1 || roundConfig?.timerType === 'individual'}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    currentQIndex === questions.length - 1 || roundConfig?.timerType === 'individual'
                                        ? 'text-gray-600 bg-[#0d1117] border border-[#21262d] cursor-not-allowed'
                                        : 'text-gray-200 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] cursor-pointer'
                                }`}
                            >
                                <span>Next</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Right Pane: Code Editor / Notepad (55% width) */}
                    <div className="w-full lg:w-[55%] h-full flex flex-col bg-[#05080f] overflow-hidden">
                        {/* Editor Header Bar */}
                        <div className="px-5 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Code2 size={16} className="text-teal-400" />
                                <span className="font-mono text-xs text-gray-300">
                                    solution.{getFileExtension(answers[currentQuestion?._id]?.language)}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleResetCode}
                                    title="Reset to starter template"
                                    className="px-2.5 py-1 text-xs text-gray-400 hover:text-white bg-[#0d1117] border border-[#30363d] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                    <RotateCcw size={12} />
                                    <span>Reset</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs text-gray-400">Language:</label>
                                    <select
                                        value={answers[currentQuestion?._id]?.language || 'Python'}
                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                        className="bg-[#0d1117] text-white border border-[#30363d] rounded-lg px-2.5 py-1 text-xs outline-none focus:border-teal-500 transition-colors"
                                    >
                                        {(currentQuestion?.allowedLanguages?.length > 0
                                            ? currentQuestion.allowedLanguages
                                            : roundConfig?.languages?.length > 0
                                                ? roundConfig.languages
                                                : ['Python', 'JavaScript', 'Java', 'C++', 'SQL']
                                        ).map(lang => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Editor Textarea / Notepad Area */}
                        <div className="flex-1 relative flex flex-col bg-[#05080f] overflow-hidden min-h-[220px]">
                            <textarea
                                className="flex-1 w-full h-full bg-[#05080f] text-emerald-300 p-6 font-mono text-sm leading-6 outline-none resize-none border-none overflow-y-auto focus:ring-0 selection:bg-teal-500/30 selection:text-white"
                                value={answers[currentQuestion?._id]?.code || ''}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Write your code solution here..."
                                spellCheck={false}
                            />
                        </div>

                        {/* Execution Console Panel */}
                        {consoleOpen && (
                            <div className="h-64 border-t border-[#30363d] bg-[#0d1117] flex flex-col shrink-0 overflow-hidden shadow-2xl">
                                {/* Console Header Bar */}
                                <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                                            <Terminal size={14} className="text-teal-400" />
                                            Execution Results
                                        </span>

                                        {runningCode ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] font-semibold">
                                                <Loader2 size={12} className="animate-spin" />
                                                <span>Running in container sandbox...</span>
                                            </div>
                                        ) : currentResult ? (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                                                    currentResult.status === 'ALL_PASSED'
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                        : currentResult.status === 'PARTIALLY_PASSED'
                                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                                                }`}>
                                                    {currentResult.status === 'ALL_PASSED' ? 'All Passed' :
                                                     currentResult.status === 'PARTIALLY_PASSED' ? `${currentResult.passed}/${currentResult.total} Passed` :
                                                     currentResult.status === 'COMPILATION_ERROR' ? 'Compilation Error' :
                                                     currentResult.status === 'RUNTIME_ERROR' ? 'Runtime Error' :
                                                     currentResult.status === 'TIME_LIMIT_EXCEEDED' ? 'Time Limit Exceeded' :
                                                     'Failed'}
                                                </span>

                                                {currentResult.publicTotal > 0 && (
                                                    <span className="text-[11px] text-gray-400 font-mono">
                                                        Public: <strong className="text-gray-200">{currentResult.publicPassed}/{currentResult.publicTotal}</strong>
                                                    </span>
                                                )}
                                                {currentResult.hiddenTotal > 0 && (
                                                    <span className="text-[11px] text-gray-400 font-mono">
                                                        Hidden: <strong className="text-gray-200">{currentResult.hiddenPassed}/{currentResult.hiddenTotal}</strong>
                                                    </span>
                                                )}
                                                {currentResult.executionTime !== undefined && (
                                                    <span className="text-[11px] text-gray-500 font-mono">
                                                        • {currentResult.executionTime}s
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setConsoleOpen(false)}
                                            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
                                            title="Minimize Console"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Console Body */}
                                <div className="flex-1 overflow-hidden flex">
                                    {runningCode ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400 gap-2">
                                            <Loader2 size={24} className="animate-spin text-teal-400" />
                                            <span className="text-xs font-medium">Executing code against test cases in isolated sandbox...</span>
                                        </div>
                                    ) : currentResult?.status === 'COMPILATION_ERROR' || currentResult?.errorMessage ? (
                                        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs bg-red-950/20 text-red-300 space-y-1">
                                            <div className="flex items-center gap-1.5 text-red-400 font-bold mb-2">
                                                <AlertCircle size={14} />
                                                <span>Compilation / Syntax Output</span>
                                            </div>
                                            <pre className="whitespace-pre-wrap">{currentResult.errorMessage || currentResult.results?.[0]?.errorMessage || 'Error executing program.'}</pre>
                                        </div>
                                    ) : currentResult?.results?.length > 0 ? (
                                        <div className="flex-1 flex overflow-hidden">
                                            {/* Test Case Pills (left column) */}
                                            <div className="w-44 border-r border-[#30363d] overflow-y-auto p-2 space-y-1 bg-[#0d1117] shrink-0">
                                                {currentResult.results.map((tc, idx) => {
                                                    const isSelected = selectedTestCaseIdx === idx;
                                                    return (
                                                        <button
                                                            key={tc.id || idx}
                                                            type="button"
                                                            onClick={() => setSelectedTestCaseIdx(idx)}
                                                            className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                                                                isSelected
                                                                    ? 'bg-[#21262d] text-white border border-[#30363d]'
                                                                    : 'hover:bg-[#161b22] text-gray-400'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                {tc.passed ? (
                                                                    <Check size={13} className="text-emerald-400 shrink-0" />
                                                                ) : (
                                                                    <X size={13} className="text-red-400 shrink-0" />
                                                                )}
                                                                <span className="truncate">
                                                                    {tc.isHidden ? `Hidden ${idx + 1}` : `Case ${idx + 1}`}
                                                                </span>
                                                            </div>
                                                            <span className={`text-[10px] font-bold ${tc.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {tc.passed ? 'Pass' : 'Fail'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Selected Test Case Details (right column) */}
                                            <div className="flex-1 overflow-y-auto p-4 bg-[#05080f] font-mono text-xs">
                                                {(() => {
                                                    const tc = currentResult.results[selectedTestCaseIdx] || currentResult.results[0];
                                                    if (!tc) return null;
                                                    if (tc.isHidden) {
                                                        return (
                                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                                                                <div className="p-3 rounded-full bg-white/5 border border-white/10">
                                                                    <FileLock2 size={24} className="text-teal-400" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-gray-200">Hidden Test Case</div>
                                                                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                                                        Test inputs and expected outputs are confidential to ensure assessment fairness and integrity.
                                                                    </p>
                                                                </div>
                                                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                    tc.passed
                                                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                                                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                                                }`}>
                                                                    Result: {tc.passed ? 'Passed ✓' : 'Failed ✗'}
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                                                                    Test Case {selectedTestCaseIdx + 1} ({tc.category || 'NORMAL'})
                                                                </span>
                                                                <span className={`text-[11px] font-bold ${tc.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {tc.status} {tc.executionTime ? `• ${tc.executionTime}s` : ''}
                                                                </span>
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Input</label>
                                                                <pre className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-200 whitespace-pre-wrap">{tc.input || '(empty)'}</pre>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Expected Output</label>
                                                                    <pre className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-emerald-400 whitespace-pre-wrap">{tc.expectedOutput || '(empty)'}</pre>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Actual Output</label>
                                                                    <pre className={`p-2.5 rounded-lg bg-[#0d1117] border ${tc.passed ? 'border-emerald-500/30 text-emerald-300' : 'border-red-500/30 text-red-300'} whitespace-pre-wrap`}>
                                                                        {tc.actualOutput || (tc.errorMessage ? `Error: ${tc.errorMessage}` : '(no output)')}
                                                                    </pre>
                                                                </div>
                                                            </div>

                                                            {tc.errorMessage && (
                                                                <div className="p-2 rounded-lg bg-red-950/20 border border-red-500/30 text-red-300">
                                                                    <span className="font-bold text-[10px] uppercase block text-red-400 mb-0.5">Error details:</span>
                                                                    <pre className="whitespace-pre-wrap text-[11px]">{tc.errorMessage}</pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-500 text-xs">
                                            <Terminal size={20} className="mb-2 text-gray-600" />
                                            <span>Click "Run Code" below to test your solution against test cases.</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Editor Action Footer */}
                        <div className="px-6 py-3 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>Auto-saved locally</span>
                                </div>
                                {currentResult && !consoleOpen && (
                                    <button
                                        type="button"
                                        onClick={() => setConsoleOpen(true)}
                                        className="text-[11px] text-teal-400 hover:text-teal-300 underline cursor-pointer"
                                    >
                                        View results ({currentResult.passed}/{currentResult.total} passed)
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                {/* NEW: Run Code Button */}
                                <button
                                    type="button"
                                    onClick={handleRunCode}
                                    disabled={runningCode}
                                    className="px-5 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] active:scale-95 text-teal-300 font-extrabold text-xs transition-all border border-teal-500/30 hover:border-teal-500 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {runningCode ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin text-teal-400" />
                                            <span>Executing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play size={13} className="text-teal-400 fill-teal-400" />
                                            <span>Run Code</span>
                                        </>
                                    )}
                                </button>

                                {currentQIndex < questions.length - 1 ? (
                                    <button
                                        onClick={() => setCurrentQIndex(prev => prev + 1)}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-extrabold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Submit & Next Challenge</span>
                                        <ArrowRight size={13} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmitSolutions}
                                        disabled={saving}
                                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-black font-extrabold text-xs transition-all shadow-md shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={14} />
                                                <span>Submit Final Solutions</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Banner if any */}
                {error && (
                    <div className="p-3 bg-red-500/20 border-t border-red-500/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse shrink-0">
                        <AlertCircle size={15} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </SecureExamWrapper>
    );
};

export default CodingAssessment;
