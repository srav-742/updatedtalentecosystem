import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    CheckCircle,
    FileText,
    Award,
    User,
    Mail,
    Briefcase,
    MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const InterviewDetail = ({ applicationId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInterviewDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`${API_URL}/interview-details/${applicationId}`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch interview details:", err);
                setError(err.response?.data?.message || 'Failed to load interview details');
            } finally {
                setLoading(false);
            }
        };

        if (applicationId) {
            fetchInterviewDetails();
        }
    }, [applicationId]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-gray-800">Loading Interview Details</h3>
                    <p className="text-gray-500 mt-2">Fetching candidate's responses...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-12 text-center max-w-md w-full">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Interview</h3>
                    <p className="text-gray-500 mb-6">{error || 'Interview data not found'}</p>
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

    const { application, job, interview } = data;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-t-3xl">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <Award className="w-8 h-8" />
                                <h2 className="text-3xl font-black">Interview Details</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="text-3xl font-black">{interview.score}%</div>
                                    <div className="text-xs opacity-80 font-bold uppercase tracking-widest">Score</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="text-3xl font-black">{interview.totalQuestions}</div>
                                    <div className="text-xs opacity-80 font-bold uppercase tracking-widest">Questions</div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                                    <div className="text-sm font-black">
                                        {new Date(interview.completedAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs opacity-80 font-bold uppercase tracking-widest">Completed</div>
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
                        <User className="w-5 h-5 text-purple-600" />
                        Candidate Information
                    </h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-3 rounded-xl">
                                <User className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Name</div>
                                <div className="font-bold text-gray-800">{application.applicantName}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-3 rounded-xl">
                                <Mail className="w-5 h-5 text-indigo-600" />
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
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        Interview Questions & Responses
                    </h3>
                    <div className="space-y-6">
                        {interview.questions.map((q, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="border-2 border-purple-200 bg-purple-50 rounded-2xl p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-black text-lg">
                                            {q.questionNumber}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                                Question {q.questionNumber}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="px-4 py-2 rounded-full bg-purple-500 text-white font-bold text-sm">
                                            Score: {q.score}%
                                        </div>
                                    </div>
                                </div>

                                {/* Question */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4 text-purple-600" />
                                        <h4 className="font-bold text-gray-800">Interviewer Question:</h4>
                                    </div>
                                    <div className="bg-white border-2 border-purple-200 rounded-xl p-4">
                                        <p className="text-gray-800 font-medium">{q.question}</p>
                                    </div>
                                </div>

                                {/* Answer */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4 text-indigo-600" />
                                        <h4 className="font-bold text-gray-800">Candidate's Answer:</h4>
                                    </div>
                                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                                        <p className="text-gray-800">{q.answer}</p>
                                    </div>
                                </div>

                                {/* Feedback */}
                                {q.feedback && (
                                    <div className="mt-4 pt-4 border-t border-purple-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <h4 className="font-bold text-gray-800">AI Feedback:</h4>
                                        </div>
                                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                                            <p className="text-gray-800">{q.feedback}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-gray-50 border-t border-gray-200 rounded-b-3xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Award className="w-6 h-6 text-purple-600" />
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Final Score</div>
                                <div className="text-2xl font-black text-purple-600">{interview.score}%</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors"
                        >
                            Close Interview
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default InterviewDetail;
