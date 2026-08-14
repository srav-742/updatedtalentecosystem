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
    FileLock2
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../../firebase';
import SecureExamWrapper from '../../../components/exam/SecureExamWrapperEnhanced';

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
    useEffect(() => {
        const fetchCodingRound = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`${API_URL}/coding-assessments/round/${job._id}`);
                if (res.data?.success && res.data.codingRound) {
                    const round = res.data.codingRound;
                    setRoundConfig(round);
                    setQuestions(round.questions || []);
                    if (round.timerType === 'individual') {
                        const firstQ = (round.questions || [])[0];
                        const qTimer = firstQ?.timer || (firstQ?.difficulty === 'Easy' ? 15 : firstQ?.difficulty === 'Hard' ? 45 : 30);
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
                    setError('No coding round configured for this job.');
                }
            } catch (err) {
                console.error("Failed to load coding round:", err);
                setError(err.response?.data?.message || 'Failed to load coding assessment data.');
            } finally {
                setLoading(false);
            }
        };

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
                <button
                    onClick={onBack}
                    className="px-6 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 transition font-bold"
                >
                    Go Back
                </button>
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
                            <li>Total programming challenges: <strong>{questions.length} questions</strong></li>
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
            {/* Floating Sticky Timer */}
            <div className="fixed top-20 right-8 z-50 pointer-events-none">
                <div className="pointer-events-auto rounded-full border border-red-500/35 bg-[#0c0f16]/95 px-5 py-2.5 shadow-[0_12px_40px_rgba(239,68,68,0.25)] backdrop-blur-md text-xs font-black tracking-wider text-red-400 flex items-center gap-2 animate-pulse">
                    <Clock3 size={14} className="text-red-500" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>

            <div className="flex flex-col gap-6 max-w-6xl mx-auto">
                {/* Header info */}
                <div className="rounded-[2.25rem] border border-black/10 bg-white px-8 py-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-teal-600">Coding challenge in progress</p>
                        <h1 className="mt-2 text-2xl font-black text-gray-900 tracking-tight">{job.title}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-xs font-bold text-gray-700">
                            Challenge {currentQIndex + 1} of {questions.length}
                        </div>
                        <div className="rounded-full border border-red-500/20 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 flex items-center gap-1.5 animate-pulse">
                            <Clock3 size={14} />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>

                {/* Main Split Interface */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Left: Question Description Panel (5 cols) */}
                    <div className="lg:col-span-5 rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] flex flex-col justify-between max-h-[700px] overflow-y-auto">
                        {currentQuestion && (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-500 bg-teal-500/10 px-2.5 py-1 rounded-lg">Challenge {currentQIndex + 1}</span>
                                        <span className="text-xs font-extrabold text-gray-500">{currentQuestion.marks || 10} Marks</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900">{currentQuestion.title}</h2>
                                    <span className={`inline-block mt-2 px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider ${currentQuestion.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-600' : currentQuestion.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}>{currentQuestion.difficulty || 'Medium'}</span>
                                </div>

                                <div className="space-y-4 text-sm text-gray-700 leading-relaxed border-t border-black/5 pt-4">
                                    <p className="whitespace-pre-line">{currentQuestion.description}</p>
                                    
                                    {currentQuestion.inputFormat && (
                                        <div className="space-y-1">
                                            <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest">Input Format:</h4>
                                            <p className="text-xs text-gray-500">{currentQuestion.inputFormat}</p>
                                        </div>
                                    )}

                                    {currentQuestion.outputFormat && (
                                        <div className="space-y-1">
                                            <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest">Output Format:</h4>
                                            <p className="text-xs text-gray-500">{currentQuestion.outputFormat}</p>
                                        </div>
                                    )}

                                    {currentQuestion.constraints && (
                                        <div className="space-y-1">
                                            <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest">Constraints:</h4>
                                            <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded-lg">{currentQuestion.constraints}</p>
                                        </div>
                                    )}

                                    {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-extrabold text-xs text-gray-800 uppercase tracking-widest">Examples:</h4>
                                            {currentQuestion.examples.map((ex, idx) => (
                                                <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-black/5 text-xs font-mono space-y-1">
                                                    <p><strong>Input:</strong> {ex.input}</p>
                                                    <p><strong>Output:</strong> {ex.output}</p>
                                                    {ex.explanation && <p className="text-gray-500 mt-1 font-sans"><strong>Explanation:</strong> {ex.explanation}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Navigation switches at bottom */}
                        <div className="flex justify-between items-center border-t border-black/5 pt-6 mt-8">
                            <button
                                onClick={() => setCurrentQIndex(prev => Math.max(prev - 1, 0))}
                                disabled={currentQIndex === 0 || roundConfig?.timerType === 'individual'}
                                className={`p-3 rounded-xl border transition-all ${(currentQIndex === 0 || roundConfig?.timerType === 'individual') ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 cursor-pointer'}`}
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <span className="text-xs font-semibold text-gray-500">Question {currentQIndex + 1} of {questions.length}</span>
                            <button
                                onClick={() => setCurrentQIndex(prev => Math.min(prev + 1, questions.length - 1))}
                                disabled={currentQIndex === questions.length - 1 || roundConfig?.timerType === 'individual'}
                                className={`p-3 rounded-xl border transition-all ${(currentQIndex === questions.length - 1 || roundConfig?.timerType === 'individual') ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 cursor-pointer'}`}
                            >
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Code Editor Panel (7 cols) */}
                    <div className="lg:col-span-7 rounded-[2.5rem] border border-black/10 bg-[#0c0f16] p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] flex flex-col justify-between max-h-[700px]">
                        <div className="space-y-4 flex-1 flex flex-col justify-between">
                            {/* Editor Header controls */}
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3 text-white font-bold text-sm">
                                    <div className="flex items-center gap-2">
                                        <Terminal size={16} className="text-teal-400" />
                                        <span>Code Editor</span>
                                    </div>
                                    <span className="text-[10px] font-mono bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded text-red-400 flex items-center gap-1 animate-pulse">
                                        <Clock3 size={10} /> {formatTime(timeLeft)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500">Language:</label>
                                    <select
                                        value={answers[currentQuestion?._id]?.language || 'python'}
                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                        className="bg-[#181d29] text-white border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-teal-500/50"
                                    >
                                        {(currentQuestion?.allowedLanguages?.length > 0 ? currentQuestion.allowedLanguages : roundConfig?.languages?.length > 0 ? roundConfig.languages : ['Python', 'JavaScript', 'Java', 'C++', 'SQL']).map(lang => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Textarea Editor Area */}
                            <div className="flex-1 min-h-[400px] rounded-2xl border border-white/10 overflow-hidden relative bg-[#080b11] flex flex-col">
                                <div className="flex items-center px-4 py-2 border-b border-white/5 bg-[#121622] text-[10px] text-gray-500 font-mono">
                                    <span>solution.{answers[currentQuestion?._id]?.language?.toLowerCase() === 'python' ? 'py' : answers[currentQuestion?._id]?.language?.toLowerCase() === 'javascript' ? 'js' : 'code'}</span>
                                </div>
                                <textarea
                                    className="flex-1 w-full bg-[#080b11] text-gray-200 p-5 font-mono text-sm leading-7 outline-none resize-none border-none overflow-y-auto"
                                    value={answers[currentQuestion?._id]?.code || ''}
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    placeholder="Write your code solution here..."
                                />
                            </div>
                        </div>

                        {/* Submission footer */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6">
                            <span className="text-xs text-gray-500">Auto-saves locally</span>
                            
                            <div className="flex items-center gap-4">
                                {currentQIndex < questions.length - 1 ? (
                                    <button
                                        onClick={() => setCurrentQIndex(prev => prev + 1)}
                                        className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-teal-500/10"
                                    >
                                        Next Question
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmitSolutions}
                                        disabled={saving}
                                        className="px-8 py-4 rounded-3xl bg-teal-500 hover:bg-teal-400 disabled:bg-gray-700 text-black font-extrabold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-500/20"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Submitting and Grading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                <span>Submit Coding Solutions</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-center gap-3 animate-pulse">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </SecureExamWrapper>
    );
};

export default CodingAssessment;
