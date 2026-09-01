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
    Play
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

const CodingAssessmentDetail = ({ applicationId, onClose }) => {
    const cachedData = applicationId ? codingCache.get(applicationId) : null;
    const [loading, setLoading] = useState(!cachedData);
    const [data, setData] = useState(cachedData);
    const [error, setError] = useState(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

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
                                        {ans.difficulty && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400 w-fit">
                                                {ans.difficulty}
                                            </span>
                                        )}
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

                                        {(currentQuestion.questionDescription || currentQuestion.expectedApproach || currentQuestion.correctAnswer) && (
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
                                            </div>
                                        )}
                                    </div>

                                    {/* Code Block */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Submitted Code</h4>
                                        <div className="rounded-2xl border border-white/10 bg-[#080a0f] overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0e111a] text-xs text-gray-500 font-mono">
                                                <span>solution.{currentQuestion.language === 'python' ? 'py' : currentQuestion.language === 'javascript' ? 'js' : 'code'}</span>
                                                <span className="uppercase text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded font-black">{currentQuestion.language}</span>
                                            </div>
                                            <pre className="p-5 overflow-x-auto text-sm text-gray-200 font-mono leading-7 whitespace-pre">
                                                {currentQuestion.code || '// No code submitted'}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* Expected Approach / Correct Answer */}
                                    {(currentQuestion.correctAnswer || currentQuestion.expectedApproach) && (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Expected Solution / Correct Answer</h4>
                                            <div className="rounded-2xl border border-teal-500/20 bg-[#080c11] overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-2 border-b border-teal-500/10 bg-teal-950/20 text-xs text-teal-400 font-mono">
                                                    <span>expected_solution.{currentQuestion.language === 'python' ? 'py' : currentQuestion.language === 'javascript' ? 'js' : 'code'}</span>
                                                    <span className="uppercase text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded font-black">Expected</span>
                                                </div>
                                                <pre className="p-5 overflow-x-auto text-sm text-teal-300/95 font-mono leading-7 whitespace-pre">
                                                    {currentQuestion.correctAnswer || currentQuestion.expectedApproach}
                                                </pre>
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Evaluation */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">AI Assessment & Feedback</h4>
                                        <div className="p-6 rounded-2xl bg-teal-500/[0.02] border border-teal-500/10">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle size={18} className="text-teal-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-gray-300 leading-relaxed font-medium">
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
