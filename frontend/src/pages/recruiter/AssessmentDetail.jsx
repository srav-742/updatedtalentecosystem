import React, { useState, useEffect } from 'react';
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
import { API_URL } from '../../firebase';

const AssessmentDetail = ({ applicationId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAssessmentDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`${API_URL}/assessment-details/${applicationId}`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch assessment details:", err);
                setError(err.response?.data?.message || 'Failed to load assessment details');
            } finally {
                setLoading(false);
            }
        };

        if (applicationId) {
            fetchAssessmentDetails();
        }
    }, [applicationId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-gray-800">Loading Assessment Details</h3>
                    <p className="text-gray-500 mt-2">Fetching candidate's responses...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Assessment</h3>
                    <p className="text-gray-500 mb-6">{error || 'Assessment data not found'}</p>
                    <button
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl font-bold"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const { application, job, assessment } = data;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-t-3xl">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <Award className="w-8 h-8" />
                                <h2 className="text-3xl font-black">Assessment Details</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="text-3xl font-black">{assessment.score}%</div>
                                    <div className="text-xs opacity-80 font-bold uppercase tracking-widest">Score</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="text-3xl font-black">{assessment.correctAnswers}/{assessment.totalQuestions}</div>
                                    <div className="text-xs opacity-80 font-bold uppercase tracking-widest">Correct</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="text-3xl font-black">{assessment.totalQuestions}</div>
                                    <div className="text-xs opacity-80 font-bold uppercase tracking-widest">Questions</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="text-sm font-black">
                                        {new Date(assessment.submittedAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs opacity-80 font-bold uppercase tracking-widest">Submitted</div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
                        >
                            <X className="w-6 h-6" />
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
                                                        : 'bg-purple-500 text-white'
                                                    }`}>
                                                    {q.type === 'mcq' ? 'MCQ' : 'Coding'}
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
                                    <div className="space-y-2">
                                        <div className="text-sm font-bold text-gray-600 mb-2">Options:</div>
                                        {q.options.map((opt, optIdx) => {
                                            const isCorrectOption = optIdx === q.correctAnswer;
                                            const isUserSelected = q.userAnswer === opt;
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
                                                        <span className="ml-2 text-red-700 font-black">✗ Your Answer</span>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                            Score: <span className={q.answerScore > 0 ? 'text-green-600' : 'text-red-600'}>
                                                {q.answerScore > 0 ? '+1' : '0'}
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
};

export default AssessmentDetail;
