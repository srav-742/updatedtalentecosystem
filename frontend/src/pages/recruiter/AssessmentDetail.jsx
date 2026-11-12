import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
    X,
    CheckCircle,
    XCircle,
    FileText,
    Code,
    Award,
    Calendar,
    User,
    Mail,
    Briefcase
} from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase';

// Module-level in-memory cache for instant zero-delay reopening
const assessmentCache = new Map();

export const prefetchAssessmentDetails = async (applicationId) => {
    if (!applicationId || assessmentCache.has(applicationId)) return;
    try {
        const headers = await getAuthHeaders();
        const res = await axios.get(`${API_URL}/assessment-details/${applicationId}`, { headers });
        if (res.data) assessmentCache.set(applicationId, res.data);
    } catch (e) {}
};

const AssessmentDetail = ({ applicationId, onClose }) => {
    const cachedData = applicationId ? assessmentCache.get(applicationId) : null;
    const [loading, setLoading] = useState(!cachedData);
    const [data, setData] = useState(cachedData);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchAssessmentDetails = async () => {
            if (!cachedData) setLoading(true);
            setError(null);
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get(`${API_URL}/assessment-details/${applicationId}`, { headers });
                if (isMounted) {
                    setData(res.data);
                    assessmentCache.set(applicationId, res.data);
                }
            } catch (err) {
                console.error("Failed to fetch assessment details:", err);
                if (isMounted && !cachedData) {
                    setError(err.response?.data?.message || 'Failed to load assessment details');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (applicationId) {
            fetchAssessmentDetails();
        }
        return () => { isMounted = false; };
    }, [applicationId]);

    if (loading) {
        const loadingContent = (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-gray-800">Loading Assessment Details</h3>
                    <p className="text-gray-500 mt-2">Fetching candidate's responses...</p>
                </div>
            </div>
        );
        return typeof document !== 'undefined' ? createPortal(loadingContent, document.body) : loadingContent;
    }

    if (error || !data) {
        const isUpgradeError = error?.includes('Pro Recruiter') || error?.includes('Forbidden') || error?.includes('Unauthorized');
        const errorContent = (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] text-white border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl rec-modal-dark" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    {isUpgradeError ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
                                <Award className="w-8 h-8 text-black" />
                            </div>
                            <h3 className="text-2xl font-black mb-3 text-white" style={{ color: '#ffffff' }}>Pro Access Required</h3>
                            <p className="text-gray-300 text-sm mb-8 leading-relaxed" style={{ color: '#cbd5e1' }}>
                                Detailed candidate skill assessments are exclusive to premium recruiters. Upgrade your plan to view full candidate answers.
                            </p>
                            <button
                                onClick={() => {
                                    onClose();
                                    window.location.href = '/recruiter/upgrade';
                                }}
                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold px-6 py-3.5 rounded-xl transition-transform hover:scale-102 hover:shadow-lg shadow-amber-500/20 mb-3"
                            >
                                Upgrade to Pro
                            </button>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2 text-white" style={{ color: '#ffffff' }}>Error Loading Assessment</h3>
                            <p className="text-gray-300 mb-6" style={{ color: '#cbd5e1' }}>{error || 'Assessment data not found'}</p>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold px-6 py-3 rounded-xl border border-white/10 transition-colors cursor-pointer"
                        style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
        return typeof document !== 'undefined' ? createPortal(errorContent, document.body) : errorContent;
    }

    const { application, job, assessment } = data;
    
    // Calculate weighted points per question based on the 20-point maximum
    const pointsPerQuestion = assessment?.totalQuestions > 0 ? (20 / assessment.totalQuestions) : 0;
    const formattedPoints = Number.isInteger(pointsPerQuestion) ? pointsPerQuestion : pointsPerQuestion.toFixed(1);

    const modalContent = (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 text-white p-8 rounded-t-3xl assessment-modal-header shadow-lg z-10" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <Award className="w-8 h-8 text-white shrink-0" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                                <h2 className="text-3xl font-black text-white" style={{ color: '#ffffff' }}>Assessment Details</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                                    <div className="text-3xl font-black text-white" style={{ color: '#ffffff' }}>{assessment.score}%</div>
                                    <div className="text-xs font-bold uppercase tracking-widest mt-1 text-white" style={{ color: '#ffffff' }}>Score</div>
                                </div>
                                <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                                    <div className="text-3xl font-black text-white" style={{ color: '#ffffff' }}>{assessment.correctAnswers}/{assessment.totalQuestions}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest mt-1 text-white" style={{ color: '#ffffff' }}>Correct</div>
                                </div>
                                <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                                    <div className="text-3xl font-black text-white" style={{ color: '#ffffff' }}>{assessment.totalQuestions}</div>
                                    <div className="text-xs font-bold uppercase tracking-widest mt-1 text-white" style={{ color: '#ffffff' }}>Questions</div>
                                </div>
                                <div className="rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                                    <div className="text-sm font-black text-white" style={{ color: '#ffffff' }}>
                                        {new Date(assessment.submittedAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs font-bold uppercase tracking-widest mt-1 text-white" style={{ color: '#ffffff' }}>Submitted</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-3 transition-colors cursor-pointer shrink-0 ml-4 flex items-center justify-center hover:opacity-80"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
                            title="Close Assessment"
                        >
                            <X className="w-6 h-6" style={{ color: '#ffffff', stroke: '#ffffff' }} />
                        </button>
                    </div>
                </div>

                {/* Candidate Info */}
                <div className="p-8 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Candidate Information
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-3 rounded-xl">
                                <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Name</div>
                                <div className="font-bold text-gray-800">{application.applicantName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <Mail className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Email</div>
                                <div className="font-bold text-gray-800">{application.applicantEmail}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Briefcase className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Job</div>
                                <div className="font-bold text-gray-800">{job.title}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions & Answers */}
                <div className="p-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Questions & Responses
                    </h3>
                    <div className="space-y-6">
                        {assessment.questions.map((q, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`border-2 rounded-2xl p-6 ${q.isCorrect
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-red-200 bg-red-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${q.isCorrect
                                                ? 'bg-green-500 text-white'
                                                : 'bg-red-500 text-white'
                                            }`}>
                                            {q.isCorrect ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                                Question {idx + 1}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${q.type === 'mcq'
                                                        ? 'bg-blue-500 text-white'
                                                        : (q.type === 'paragraph' || q.type === 'descriptive' || q.type === 'subjective')
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-purple-500 text-white'
                                                    }`}>
                                                    {q.type === 'mcq' ? 'MCQ' : (q.type === 'paragraph' || q.type === 'descriptive' || q.type === 'subjective') ? 'Paragraph' : 'Coding'}
                                                </span>
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700 uppercase tracking-widest">
                                                    {q.skill}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h4 className="font-bold text-gray-800 mb-2">{q.question}</h4>
                                </div>

                                {q.type === 'mcq' ? (
                                    <div className="space-y-3">
                                        <div className="text-sm font-bold text-gray-600 mb-2">Options:</div>
                                        <div className="space-y-2">
                                            {q.options.map((opt, optIdx) => {
                                                const isCorrectOption = optIdx === q.correctAnswer;
                                                const isUserSelected = (q.selectedOption || q.userAnswer) === opt;
                                                return (
                                                    <div
                                                        key={optIdx}
                                                        className={`p-3 rounded-xl border-2 font-medium ${isCorrectOption
                                                                ? 'border-green-500 bg-green-100 text-green-800'
                                                                : isUserSelected
                                                                    ? 'border-red-500 bg-red-100 text-red-800'
                                                                    : 'border-gray-200 bg-white text-gray-600'
                                                            }`}
                                                    >
                                                        {opt}
                                                        {isCorrectOption && (
                                                            <span className="ml-2 text-green-700 font-black">✓ Correct</span>
                                                        )}
                                                        {isUserSelected && !isCorrectOption && (
                                                            <span className="ml-2 text-red-700 font-black">✗ Candidate's Choice</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Candidate's written explanation & AI reasoning analysis */}
                                        {q.explanation && (
                                            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                    Candidate's Written Explanation:
                                                </div>
                                                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                                                    "{q.explanation}"
                                                </p>
                                                {q.aiFeedback && (
                                                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-xs text-indigo-700 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                                                        <span className="font-bold uppercase tracking-wider block mb-1">AI Reasoning Analysis:</span>
                                                        {q.aiFeedback}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (q.type === 'paragraph' || q.type === 'descriptive' || q.type === 'subjective') ? (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                            <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                                Candidate Written Response:
                                            </div>
                                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                                                "{q.explanation || q.userAnswer || '(No answer provided)'}"
                                            </p>
                                            {q.aiFeedback && (
                                                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-indigo-700 bg-indigo-50/70 p-3 rounded-lg border border-indigo-100">
                                                    <span className="font-bold uppercase tracking-wider block mb-1">AI Technical Assessment:</span>
                                                    {q.aiFeedback}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {q.starterCode && (
                                            <div>
                                                <div className="text-sm font-bold text-gray-600 mb-2">Starter Code:</div>
                                                <pre className="bg-gray-900 text-gray-200 p-4 rounded-xl font-mono text-sm overflow-x-auto">
                                                    {q.starterCode}
                                                </pre>
                                            </div>
                                        )}
                                        <div>
                                            <div className="text-sm font-bold text-gray-600 mb-2">Your Answer:</div>
                                            <pre className={`p-4 rounded-xl font-mono text-sm overflow-x-auto ${q.userAnswer
                                                    ? 'bg-blue-50 text-blue-900 border-2 border-blue-200'
                                                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                                                }`}>
                                                {q.userAnswer || '(No answer provided)'}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-bold text-gray-600">
                                            Status: {q.isCorrect ? (
                                                <span className="text-green-600">Correct</span>
                                            ) : (
                                                <span className="text-red-600">Incorrect</span>
                                            )}
                                        </div>
                                        <div className="text-sm font-bold text-gray-600">
                                            Score: <span className={q.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                {q.isCorrect ? `+${formattedPoints}` : '0'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-gray-50 border-t border-gray-200 rounded-b-3xl">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
                        >
                            Close Assessment
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
};

export default AssessmentDetail;
