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
    RotateCcw
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

    const timerRef = useRef(null);

    // Fetch existing coding round configuration
    const fetchCodingRound = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const res = await axios.get(`${API_URL}/coding-assessments/round/${job._id}`, { headers });
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
                    const qTimer = firstQ?.timer || (firstQ?.difficulty === 'LOW' ? 15 : firstQ?.difficulty === 'HIGH' ? 45 : 30);
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
        if (job._id) {
            fetchCodingRound();
        }
    }, [job._id]);

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
            const qTimer = currentQ?.timer || (currentQ?.difficulty === 'Easy' ? 15 : currentQ?.difficulty === 'Hard' ? 45 : 30);
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

            const headers = await getAuthHeaders();
            const res = await axios.post(`${API_URL}/coding-assessments/submit`, {
                jobId: job._id,
                userId: user.uid || user._id || user.id,
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
            const headers = await getAuthHeaders();
            await axios.post(`${API_URL}/applications/proctoring-reset`, {
                jobId: job._id,
                userId: user.uid || user._id || user.id,
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">Assessment Unavailable</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <div className="flex items-center justify-center gap-3">
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
                </div>
            </div>
        );
    }

    // Lobby Screen
    if (!started) {
        return (
            <div className="mx-auto max-w-2xl rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-2xl md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <Code2 size={200} />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-teal-600">Step 4 of 5</p>
                    <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900">Coding Assessment</h1>
                    <p className="mt-4 text-base text-gray-500 leading-relaxed">
                        Welcome to the coding assessment round for <strong>{job.title}</strong>. You will be evaluated on your programming logic, time complexity, and clean code principles.
                    </p>

                    <div className="my-8 space-y-4 rounded-2xl bg-[#faf8f5] p-6 border border-black/5">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock3 size={18} className="text-teal-600" />
                            Rules & Structure
                        </h3>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                            <li>Total time allotted: <strong>{roundConfig?.totalTime || 60} minutes</strong></li>
                            <li>Total programming challenges: <strong>{questions.length} questions</strong> • Maximum Score: <strong>100 Marks</strong></li>
                            <li>Each challenge has dynamic proportional marks based on difficulty totaling exactly 100 marks.</li>
                            <li>Ensure you choose the correct language from the dropdown menu.</li>
                            <li>This assessment is strictly proctored. <strong>Tab switching or leaving screen share will result in immediate disqualification.</strong></li>
                        </ul>
                    </div>

                    {!sharedStream ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 text-sm font-semibold flex items-start gap-3">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>Webcam and microphone access are required to verify identity and maintain test integrity.</span>
                            </div>
                            {lobbyError && (
                                <p className="text-xs text-red-500 font-bold">{lobbyError}</p>
                            )}
                            <button
                                onClick={enableMedia}
                                className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20"
                            >
                                <Play size={18} />
                                Grant Camera & Mic Access
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="aspect-video w-full rounded-2xl bg-black border border-black/10 overflow-hidden relative shadow-inner">
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
                                <div className="absolute top-4 left-4 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow">
                                    Camera Active
                                </div>
                            </div>

                            <button
                                onClick={startCodingAssessment}
                                className="w-full py-5 rounded-3xl bg-black hover:bg-gray-800 text-white text-lg font-bold transition-all shadow-xl hover:scale-[1.01] active:scale-98 cursor-pointer"
                            >
                                Start Coding Assessment
                              </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Active Coding Test Screen
    return (
        <SecureExamWrapper
            examId={`coding:${job._id}`}
            userId={user.uid || user._id || user.id}
            isActive={started && !securityResetting}
            requireScreenShare={true}
            requireCamera={true}
            cameraStream={sharedStream}
            isAnswering={started && !securityResetting}
            warningLimit={3}
            resetLimit={4}
            onSecurityReset={handleCodingSecurityReset}
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
                                <h1 className="text-sm font-extrabold text-white tracking-tight leading-tight">{job.title}</h1>
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
                        <div className="flex-1 relative flex flex-col bg-[#05080f] overflow-hidden">
                            <textarea
                                className="flex-1 w-full h-full bg-[#05080f] text-emerald-300 p-6 font-mono text-sm leading-6 outline-none resize-none border-none overflow-y-auto focus:ring-0 selection:bg-teal-500/30 selection:text-white"
                                value={answers[currentQuestion?._id]?.code || ''}
                                onChange={(e) => handleCodeChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Write your code solution here..."
                                spellCheck={false}
                            />
                        </div>

                        {/* Editor Action Footer */}
                        <div className="px-6 py-3 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Auto-saved locally</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {currentQIndex < questions.length - 1 ? (
                                    <button
                                        onClick={() => setCurrentQIndex(prev => prev + 1)}
                                        className="px-5 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>Next Challenge</span>
                                        <ArrowRight size={13} />
                                    </button>
                                ) : null}

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
                                            <span>Submit Coding Solutions</span>
                                        </>
                                    )}
                                </button>
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
