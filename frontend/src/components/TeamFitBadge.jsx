import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Info, Sparkles, X, BrainCircuit, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../firebase';

const TeamFitBadge = ({ applicationId, teamFit, onUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    
    // Fallback if teamFit is null or score is 0
    const hasData = teamFit && teamFit.score > 0;
    const score = hasData ? teamFit.score : null;

    const handleCalculate = async (e) => {
        e.stopPropagation();
        setIsCalculating(true);
        try {
            const res = await axios.post(`${API_URL}/team-fit/calculate/${applicationId}`);
            if (onUpdate) onUpdate(res.data);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Failed to calculate team fit:", error);
        } finally {
            setIsCalculating(false);
        }
    };

    const getScoreColor = (s) => {
        if (s >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        if (s >= 60) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    };

    return (
        <>
            <div className="flex flex-col items-center gap-1">
                {hasData ? (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsModalOpen(true);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-tighter flex items-center gap-2 transition-all ${getScoreColor(score)}`}
                    >
                        <Target size={14} />
                        {score}% Fit
                    </motion.button>
                ) : (
                    <button
                        onClick={handleCalculate}
                        disabled={isCalculating}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isCalculating ? (
                            <BrainCircuit size={14} className="animate-pulse" />
                        ) : (
                            <Sparkles size={14} />
                        )}
                        {isCalculating ? 'Analysing...' : 'Predict Fit'}
                    </button>
                )}
            </div>

            {/* Analysis Modal */}
            <AnimatePresence>
                {isModalOpen && teamFit && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg bg-[#1a1d24] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-8"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Target size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight">Team Fit Predictor</h3>
                                    <p className="text-gray-500 text-sm font-medium">AI Organizational Analysis</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 rounded-[2rem] bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/5">
                                    <div className="flex items-end justify-between mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Match score</span>
                                        <span className={`text-4xl font-black ${getScoreColor(score).split(' ')[0]}`}>{score}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${score}%` }}
                                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1 rounded-md bg-white/5 text-blue-400 flex-none">
                                            <Sparkles size={14} />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">AI Analysis</p>
                                            <p className="text-white text-sm leading-relaxed font-medium italic">
                                                "{teamFit.reason}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-1 rounded-md bg-white/5 text-emerald-400 flex-none">
                                            <CheckCircle2 size={14} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Impact Predicted</p>
                                            <p className="text-gray-400 text-xs leading-relaxed">
                                                Highly likely to resonate with your previous {score > 80 ? 'top performance' : 'hiring'} patterns.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full mt-10 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-blue-400 hover:text-white transition-all shadow-xl"
                            >
                                Close Analysis
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default TeamFitBadge;
