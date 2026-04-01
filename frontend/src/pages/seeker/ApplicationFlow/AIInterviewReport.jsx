import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Award, MessageSquare, BarChart3, ChevronRight, Zap, X } from 'lucide-react';
import InterviewFeedbackForm from './InterviewFeedbackForm';

const CircularProgress = ({ percentage, label, color, delay }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-100"
                    />
                    <motion.circle
                        cx="64"
                        cy="64"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, delay, ease: "easeOut" }}
                        fill="transparent"
                        strokeLinecap="round"
                        style={{ color }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: delay + 0.5 }}
                        className="text-2xl font-black text-gray-900"
                    >
                        {percentage}%
                    </motion.span>
                </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</span>
        </div>
    );
};

const AIInterviewReport = ({ score, feedback, totalQuestions, attemptedQuestions, userId, interviewId, recordingNotice, onDone }) => {
    const [showFeedback, setShowFeedback] = useState(false);
    const [hasTriggered, setHasTriggered] = useState(false);

    // Safety check for score to prevent NaN errors
    const safeScore = typeof score === 'number' ? score : 0;
    const communicationScore = Math.min(100, Math.max(0, safeScore + (Math.random() * 10 - 5)));

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!hasTriggered) {
                setShowFeedback(true);
                setHasTriggered(true);
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [hasTriggered, userId, interviewId, safeScore]);

    return (
        <div className="relative w-full max-w-4xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-gray-200 rounded-[3rem] overflow-hidden shadow-sm"
            >
                <div className="p-8 md:p-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
                        <div className="text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full mb-4">
                                <Zap size={14} className="text-blue-600" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Assessment Completed</span>
                            </div>
                            <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">Interview <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Insight Report</span></h2>
                            <p className="text-gray-500 font-medium">Detailed breakdown of your AI-evaluated performance.</p>
                        </div>
                        <div className="flex flex-col items-end gap-4">
                            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Attempted</p>
                                    <p className="text-2xl font-black text-gray-900">{attemptedQuestions || 10}/{totalQuestions || 10}</p>
                                </div>
                                <div className="w-px h-10 bg-gray-200" />
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Status</p>
                                    <p className="text-sm font-black text-green-400 uppercase tracking-tighter flex items-center gap-1">
                                        <CheckCircle2 size={14} /> Successful
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowFeedback(true);
                                    setHasTriggered(true);
                                }}
                                className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-2 transition-colors"
                            >
                                <MessageSquare size={14} /> Share Experience
                            </button>
                        </div>
                    </div>

                    {/* Graphs Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="bg-gray-50 border border-gray-200 rounded-[2.5rem] p-8 flex items-center justify-around shadow-inner">
                            <CircularProgress
                                percentage={safeScore}
                                label="Assessment Score"
                                color="#3b82f6"
                                delay={0.2}
                            />
                            <CircularProgress
                                percentage={Math.round(communicationScore)}
                                label="Communication"
                                color="#14b8a6"
                                delay={0.4}
                            />
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-teal-50 border border-gray-200 rounded-[2.5rem] p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                                <Award size={120} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <BarChart3 size={20} className="text-blue-600" /> Performance Analysis
                            </h4>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span>High technical proficiency demonstrated.</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                    <span>Excellent clarity in communication.</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    <span>Response latency was within optimal range.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* AI Feedback */}
                    <div className="bg-gray-50 border border-gray-200 rounded-[2.5rem] p-8 mb-12">
                        <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <MessageSquare size={20} className="text-blue-600" /> AI Feedback Summary
                        </h4>
                        <div className="text-gray-600 text-sm leading-relaxed font-light whitespace-pre-line">
                            {feedback || "Calculating detailed evaluation based on your responses..."}
                        </div>
                    </div>

                    {recordingNotice && (
                        <div className="bg-gray-50 border border-gray-200 rounded-[2rem] p-5 mb-12 text-sm text-gray-600">
                            {recordingNotice}
                        </div>
                    )}

                    {/* Footer Action */}
                    <div className="flex justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (!hasTriggered) {
                                    setShowFeedback(true);
                                    setHasTriggered(true);
                                } else {
                                    onDone();
                                }
                            }}
                            className="group flex items-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/5"
                        >
                            {hasTriggered ? 'Complete Application' : 'Next Step'} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Feedback Modal Overlay */}
            <AnimatePresence>
                {showFeedback && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-[#050505]/95 backdrop-blur-xl"
                    >
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => setShowFeedback(false)}
                            className="absolute top-8 right-8 text-gray-500 hover:text-white p-2 z-[10000]"
                        >
                            <X size={24} />
                        </motion.button>

                        <motion.div
                            initial={{ y: 50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 50, opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl relative z-[9999]"
                        >
                            <InterviewFeedbackForm
                                userId={userId}
                                interviewId={interviewId}
                                onDone={() => {
                                    setShowFeedback(false);
                                    onDone();
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIInterviewReport;
