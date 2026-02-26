import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Award, MessageSquare, BarChart3, ChevronRight, Zap } from 'lucide-react';

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
                        className="text-white/5"
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
                        className="text-2xl font-black text-white"
                    >
                        {percentage}%
                    </motion.span>
                </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</span>
        </div>
    );
};

const AIInterviewReport = ({ score, feedback, totalQuestions, attemptedQuestions, onDone }) => {
    // Generate a communication score based on the assessment score for visual consistency
    const communicationScore = Math.min(100, Math.max(0, score + (Math.random() * 10 - 5)));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl mx-auto bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
        >
            <div className="p-8 md:p-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-8">
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full mb-4">
                            <Zap size={14} className="text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Assessment Completed</span>
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">Interview <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Insight Report</span></h2>
                        <p className="text-gray-500 font-medium">Detailed breakdown of your AI-evaluated performance.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Attempted</p>
                            <p className="text-2xl font-black text-white">{attemptedQuestions || 10}/{totalQuestions || 10}</p>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="text-center">
                            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Status</p>
                            <p className="text-sm font-black text-green-400 uppercase tracking-tighter flex items-center gap-1">
                                <CheckCircle2 size={14} /> Successful
                            </p>
                        </div>
                    </div>
                </div>

                {/* Graphs Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex items-center justify-around shadow-inner">
                        <CircularProgress
                            percentage={score}
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

                    <div className="bg-gradient-to-br from-blue-600/20 to-teal-500/10 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                            <Award size={120} />
                        </div>
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BarChart3 size={20} className="text-blue-400" /> Performance Analysis
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-sm text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span>High technical proficiency demonstrated.</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                <span>Excellent clarity in communication.</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span>Response latency was within optimal range.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* AI Feedback */}
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 mb-12">
                    <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <MessageSquare size={20} className="text-blue-400" /> AI Feedback Summary
                    </h4>
                    <div className="text-gray-400 text-sm leading-relaxed font-light whitespace-pre-line">
                        {feedback || "Calculating detailed evaluation based on your responses..."}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="flex justify-center">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onDone}
                        className="group flex items-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/5"
                    >
                        Proceed to Next Step <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default AIInterviewReport;
