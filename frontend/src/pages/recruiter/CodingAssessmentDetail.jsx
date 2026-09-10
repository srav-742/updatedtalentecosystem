import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Code2,
    Award,
    Clock,
    CheckCircle,
    AlertCircle,
    User,
    Mail,
    Terminal,
    ChevronRight,
    Play,
    RefreshCw,
    XCircle,
    AlertTriangle,
    Sparkles,
    Loader2,
    Copy,
    Check
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase';

// Module-level in-memory cache for instant zero-delay reopening
const codingCache = new Map();

export const prefetchCodingDetails = async (applicationId) => {
    if (!applicationId || codingCache.has(applicationId)) return;
    try {
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_URL}/coding-assessments/details/${applicationId}`, { headers });
        if (res.data) codingCache.set(applicationId, res.data);
    } catch (e) {}
};

const CodingAssessmentDetail = ({ applicationId, onClose, onScoreUpdate }) => {
    const cachedData = applicationId ? codingCache.get(applicationId) : null;
    const [loading, setLoading] = useState(!cachedData);
    const [data, setData] = useState(cachedData);
    const [error, setError] = useState(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [reEvaluating, setReEvaluating] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null); // 'submitted' | 'suggested' | null
    const [showSuggestedCode, setShowSuggestedCode] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchCodingDetails = async () => {
            if (!cachedData) setLoading(true);
            setError(null);
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get(`${API_URL}/coding-assessments/details/${applicationId}`, { headers });
                if (isMounted) {
                    setData(res.data);
                    codingCache.set(applicationId, res.data);
                    if (onScoreUpdate && typeof res.data?.codingScore === 'number') {
                        onScoreUpdate(res.data.codingScore);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch coding details:", err);
                if (isMounted && !cachedData) {
                    setError(err.response?.data?.message || 'Failed to load coding details');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (applicationId) {
            fetchCodingDetails();
        }
        return () => { isMounted = false; };
    }, [applicationId]);

    // Keep showSuggestedCode true by default when switching questions
    useEffect(() => {
        setShowSuggestedCode(true);
        setCopiedCode(null);
    }, [activeQuestionIndex]);

    const handleReEvaluate = async (questionIndex) => {
        setReEvaluating(true);
        try {
            const headers = await getAuthHeaders();
            const res = await axios.post(`${API_URL}/coding-assessments/re-evaluate/${applicationId}/${questionIndex}`, {}, { headers });
            if (res.data?.success) {
                if (onScoreUpdate && typeof res.data.codingScore === 'number') {
                    onScoreUpdate(res.data.codingScore);
                }
                const updatedAns = res.data.updatedAnswer;
                if (updatedAns) {
                    setData(prev => {
                        if (!prev) return prev;
                        const prevList = prev.codingAnswers || prev.answers || [];
                        const nextList = [...prevList];
                        nextList[questionIndex] = { ...nextList[questionIndex], ...updatedAns };
                        const nextData = {
                            ...prev,
                            codingScore: res.data.codingScore !== undefined ? res.data.codingScore : prev.codingScore,
                            codingDetails: res.data.codingDetails || prev.codingDetails,
                            codingAnswers: nextList,
                            answers: nextList
                        };
                        codingCache.set(applicationId, nextData);
                        return nextData;
                    });
                }
                setShowSuggestedCode(true);

                // Background refetch to sync all server calculated values
                try {
                    const detailsRes = await axios.get(`${API_URL}/coding-assessments/details/${applicationId}`, { headers });
                    if (detailsRes.data) {
                        setData(detailsRes.data);
                        codingCache.set(applicationId, detailsRes.data);
                    }
                } catch (_) {}
            }
        } catch (err) {
            console.error("Re-evaluation failed:", err);
            alert("AI Re-evaluation failed: " + (err.response?.data?.message || err.message));
        } finally {
            setReEvaluating(false);
        }
    };

    const handleCopyCode = async (code, type) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(type);
            setTimeout(() => setCopiedCode(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const getVerdictConfig = (verdict) => {
        switch (verdict) {
            case 'Correct':
                return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Correct' };
            case 'Partially Correct':
                return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Partially Correct' };
            case 'Incorrect':
                return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Incorrect' };
            default:
                return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', label: 'Not Evaluated' };
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'success':
                return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'AI Evaluated' };
            case 'failed':
                return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'AI Failed' };
            default:
                return { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', label: 'Pending' };
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] border border-white/5 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-500 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-white">Loading Coding Solutions</h3>
                    <p className="text-gray-400 mt-2 text-sm">Fetching code submissions & AI reviews...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        const isUpgradeError = error?.includes('unlock required') || error?.includes('Forbidden');
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] text-white border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    {isUpgradeError ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/10">
                                <Award className="w-8 h-8 text-black" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 text-white">Unlock Required</h3>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                Detailed candidate assessments are locked. Please unlock the candidate's assessment details in the applicant panel to view full solutions.
                            </p>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">Error Loading Coding Solutions</h3>
                            <p className="text-gray-400 mb-6">{error || 'Coding assessment data not found'}</p>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl border border-white/10 transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const { codingScore, codingAnswers, answers = codingAnswers || [] } = data;
    const currentQuestion = answers[activeQuestionIndex];
    const verdictConfig = currentQuestion ? getVerdictConfig(currentQuestion.correctnessVerdict) : null;
    const statusConfig = currentQuestion ? getStatusConfig(currentQuestion.aiEvaluationStatus) : null;
    const VerdictIcon = verdictConfig?.icon || AlertCircle;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                className="w-full bg-[#0c0f16] border-l border-white/10 h-full flex flex-col shadow-2xl relative"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/20">
                            <Code2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white">Coding Assessment</h2>
                            <p className="text-xs text-gray-500">View code submissions and AI evaluations</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 font-extrabold text-sm flex items-center gap-2">
                            <span>Score: {codingScore}/100</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {answers.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
                        <Terminal size={48} className="mb-4 text-gray-600" />
                        <p className="text-lg font-bold text-gray-400">No coding questions submitted</p>
                        <p className="text-sm text-gray-600 mt-1">The candidate did not submit responses to this coding round.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar Question List */}
                        <div className="w-80 border-r border-white/10 overflow-y-auto p-4 space-y-2 bg-[#080b11]">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-4">Questions</p>
                            {answers.map((ans, idx) => {
                                const isActive = idx === activeQuestionIndex;
                                const maxM = ans.maximumMarks !== undefined && ans.maximumMarks !== null ? ans.maximumMarks : 10;
                                const obtM = ans.obtainedMarks !== undefined && ans.obtainedMarks !== null ? ans.obtainedMarks : (ans.score || 0);
                                const qVerdict = getVerdictConfig(ans.correctnessVerdict);
                                const QVerdictIcon = qVerdict.icon;
                                return (
                                    <button
                                        key={ans.questionId || idx}
                                        onClick={() => setActiveQuestionIndex(idx)}
                                        className={`w-full text-left p-4 rounded-2xl transition-all border flex flex-col gap-2 ${isActive ? 'bg-teal-500/10 border-teal-500/35 text-white shadow-lg shadow-teal-500/5' : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] text-gray-400'}`}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Question {idx + 1}</span>
                                            <span className="text-xs font-extrabold text-gray-400">{obtM}/{maxM} marks</span>
                                        </div>
                                        <span className="text-sm font-semibold truncate w-full text-white">{ans.questionTitle}</span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {ans.difficulty && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 w-fit">
                                                    {ans.difficulty}
                                                </span>
                                            )}
                                            {ans.correctnessVerdict && ans.correctnessVerdict !== 'Not Evaluated' && (
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${qVerdict.bg} ${qVerdict.border} ${qVerdict.color} border w-fit flex items-center gap-1`}>
                                                    <QVerdictIcon size={10} />
                                                    {qVerdict.label}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0c0f16]">
                            {currentQuestion && (
                                <div className="space-y-6">
                                    {/* Question Card */}
                                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div>
                                            <h3 className="text-lg font-extrabold text-white mb-2">{currentQuestion.questionTitle}</h3>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Terminal size={14} className="text-teal-400" />
                                                    <span className="capitalize">{currentQuestion.language || 'Plaintext'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Award size={14} className="text-yellow-400" />
                                                    <span className="font-bold text-gray-300">
                                                        Marks: {currentQuestion.obtainedMarks !== undefined ? currentQuestion.obtainedMarks : (currentQuestion.score || 0)} / {currentQuestion.maximumMarks !== undefined ? currentQuestion.maximumMarks : 10}
                                                    </span>
                                                </div>
                                                {currentQuestion.difficulty && (
                                                    <div className="flex items-center gap-1.5 text-gray-400 font-semibold">
                                                        <span>Difficulty: <strong className="text-white uppercase">{currentQuestion.difficulty}</strong></span>
                                                    </div>
                                                )}
                                                {currentQuestion.testCasesPassed !== undefined && currentQuestion.testCasesPassed !== null && (
                                                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                                        <CheckCircle size={14} />
                                                        <span>{currentQuestion.testCasesPassed}/{currentQuestion.totalTestCases || 10} Test Cases Passed</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Correctness Verdict + AI Status Badges */}
                                        <div className="flex items-center gap-3 flex-wrap pt-2">
                                            {/* Correctness Verdict Badge */}
                                            {verdictConfig && (
                                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${verdictConfig.bg} border ${verdictConfig.border}`}>
                                                    <VerdictIcon size={16} className={verdictConfig.color} />
                                                    <span className={`text-sm font-extrabold ${verdictConfig.color}`}>{verdictConfig.label}</span>
                                                </div>
                                            )}

                                            {/* AI Evaluation Status Badge */}
                                            {statusConfig && (
                                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${statusConfig.bg} border ${statusConfig.border}`}>
                                                    <Sparkles size={14} className={statusConfig.color} />
                                                    <span className={`text-xs font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
                                                </div>
                                            )}

                                            {/* Re-evaluate Button */}
                                            <button
                                                onClick={() => handleReEvaluate(activeQuestionIndex)}
                                                disabled={reEvaluating}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {reEvaluating ? (
                                                    <>
                                                        <Loader2 size={14} className="animate-spin" />
                                                        <span>Re-evaluating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw size={14} />
                                                        <span>Re-evaluate with AI</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {(currentQuestion.questionDescription || currentQuestion.expectedApproach || currentQuestion.constraints || currentQuestion.inputFormat || currentQuestion.outputFormat || currentQuestion.sampleInput || currentQuestion.sampleOutput) && (
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                                                {currentQuestion.questionDescription && (
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Question Description</h4>
                                                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{currentQuestion.questionDescription}</p>
                                                    </div>
                                                )}
                                                {currentQuestion.constraints && (
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Constraints</h4>
                                                        <p className="text-gray-400 text-xs font-mono bg-white/[0.01] p-3 rounded-xl border border-white/5">{currentQuestion.constraints}</p>
                                                    </div>
                                                )}
                                                {(currentQuestion.inputFormat || currentQuestion.outputFormat) && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {currentQuestion.inputFormat && (
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Input Format</h4>
                                                                <p className="text-gray-400 text-xs font-mono bg-white/[0.01] p-2.5 rounded-xl border border-white/5">{currentQuestion.inputFormat}</p>
                                                            </div>
                                                        )}
                                                        {currentQuestion.outputFormat && (
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Output Format</h4>
                                                                <p className="text-gray-400 text-xs font-mono bg-white/[0.01] p-2.5 rounded-xl border border-white/5">{currentQuestion.outputFormat}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {(currentQuestion.sampleInput || currentQuestion.sampleOutput) && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {currentQuestion.sampleInput && (
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sample Input</h4>
                                                                <pre className="text-xs font-mono bg-[#080a0f] p-2.5 rounded-xl border border-white/5 text-gray-300 overflow-x-auto whitespace-pre">{currentQuestion.sampleInput}</pre>
                                                            </div>
                                                        )}
                                                        {currentQuestion.sampleOutput && (
                                                            <div>
                                                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Sample Output</h4>
                                                                <pre className="text-xs font-mono bg-[#080a0f] p-2.5 rounded-xl border border-white/5 text-gray-300 overflow-x-auto whitespace-pre">{currentQuestion.sampleOutput}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submitted Code Block */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Submitted Code</h4>
                                        <div className="rounded-2xl border border-white/10 bg-[#080a0f] overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0e111a] text-xs text-gray-500 font-mono">
                                                <span>solution.{currentQuestion.language === 'python' ? 'py' : currentQuestion.language === 'javascript' ? 'js' : 'code'}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleCopyCode(currentQuestion.code, 'submitted')}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                                                    >
                                                        {copiedCode === 'submitted' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                        <span className="text-[10px]">{copiedCode === 'submitted' ? 'Copied!' : 'Copy'}</span>
                                                    </button>
                                                    <span className="uppercase text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded font-black">{currentQuestion.language}</span>
                                                </div>
                                            </div>
                                            <pre className="p-5 overflow-x-auto text-sm text-gray-200 font-mono leading-7 whitespace-pre">
                                                {currentQuestion.code || '// No code submitted'}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* AI Suggested Correct Code */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                                <Sparkles size={14} className="text-teal-400" />
                                                AI Suggested Correct Code
                                            </h4>
                                            {(currentQuestion.suggestedCode || currentQuestion.expectedApproach) && (
                                                <button
                                                    onClick={() => setShowSuggestedCode(!showSuggestedCode)}
                                                    className="text-xs text-teal-400 hover:text-teal-300 font-bold cursor-pointer transition-colors"
                                                >
                                                    {showSuggestedCode ? 'Hide Code' : 'Show Code'}
                                                </button>
                                            )}
                                        </div>

                                        {(currentQuestion.suggestedCode || currentQuestion.expectedApproach) ? (
                                            showSuggestedCode && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="rounded-2xl border border-teal-500/20 bg-[#080c11] overflow-hidden"
                                                >
                                                    <div className="flex items-center justify-between px-4 py-2 border-b border-teal-500/10 bg-teal-950/20 text-xs text-teal-400 font-mono">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles size={12} />
                                                            <span>ai_correct_solution.{currentQuestion.language === 'python' ? 'py' : currentQuestion.language === 'javascript' ? 'js' : 'code'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleCopyCode(currentQuestion.suggestedCode || currentQuestion.expectedApproach, 'suggested')}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-teal-500/10 transition-colors cursor-pointer"
                                                            >
                                                                {copiedCode === 'suggested' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                                <span className="text-[10px]">{copiedCode === 'suggested' ? 'Copied!' : 'Copy'}</span>
                                                            </button>
                                                            <span className="uppercase text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded font-black">AI Optimal Solution</span>
                                                        </div>
                                                    </div>
                                                    <pre className="p-5 overflow-x-auto text-sm text-teal-300/95 font-mono leading-7 whitespace-pre">
                                                        {currentQuestion.suggestedCode || currentQuestion.expectedApproach}
                                                    </pre>
                                                </motion.div>
                                            )
                                        ) : (
                                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-semibold text-amber-200">No AI suggested code available yet</p>
                                                    <p className="text-xs text-gray-400 mt-1">Click "Re-evaluate with AI" to analyze this solution and generate the correct code.</p>
                                                </div>
                                                <button
                                                    onClick={() => handleReEvaluate(activeQuestionIndex)}
                                                    disabled={reEvaluating}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                                                >
                                                    {reEvaluating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                    <span>Evaluate Now</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Evaluation Feedback */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={14} className="text-violet-400" />
                                            AI Assessment & Feedback
                                        </h4>
                                        <div className="p-6 rounded-2xl bg-teal-500/[0.02] border border-teal-500/10">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-teal-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-gray-300 leading-relaxed font-medium whitespace-pre-line">
                                                        {currentQuestion.feedback || 'No evaluation feedback generated.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default CodingAssessmentDetail;
