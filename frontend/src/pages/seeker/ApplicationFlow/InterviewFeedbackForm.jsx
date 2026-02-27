import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Star, ChevronRight, CheckCircle2, Loader, Send, MessageSquare, Monitor, Cpu, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

// API Configuration
const FEEDBACK_API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const StarRating = ({ value, onChange, label, max = 5 }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex flex-col gap-2">
            {label && <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</span>}
            <div className="flex gap-1.5">
                {[...Array(max)].map((_, i) => (
                    <motion.button
                        key={i}
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onChange(i + 1)}
                        onMouseEnter={() => setHover(i + 1)}
                        onMouseLeave={() => setHover(0)}
                        className="focus:outline-none"
                    >
                        <Star
                            size={24}
                            className={`transition-colors duration-200 ${(hover || value) > i ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`}
                        />
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

const InterviewFeedbackForm = ({ userId, interviewId, onDone }) => {
    const [step, setStep] = useState(1);
    const [overallRating, setOverallRating] = useState(0);
    const [recommendationScore, setRecommendationScore] = useState(5);
    const [ratings, setRatings] = useState({
        uiDesign: 0,
        navigation: 0,
        interviewFlow: 0,
        responsiveness: 0,
        aiAccuracy: 0,
        processingSpeed: 0,
        scoreFairness: 0,
        feedbackClarity: 0
    });
    const [likedMost, setLikedMost] = useState('');
    const [improvements, setImprovements] = useState('');
    const [issuesFaced, setIssuesFaced] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleRatingChange = (key, val) => {
        setRatings(prev => ({ ...prev, [key]: val }));
    };

    const handleSubmit = async () => {
        if (overallRating === 0) {
            setError('Please provide an overall rating.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            const payload = {
                userId,
                interviewId,
                overallRating,
                recommendationScore,
                ratings,
                likedMost,
                improvements,
                issuesFaced
            };
            await axios.post(`${FEEDBACK_API}/interview/feedback`, payload);
            setSubmitted(true);
            setTimeout(() => onDone(), 2000);
        } catch (err) {
            console.error('[FEEDBACK_ERROR]', err);
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
            >
                <div className="relative mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20"
                    >
                        <CheckCircle2 size={48} className="text-white" />
                    </motion.div>
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-green-500/20 rounded-full"
                    />
                </div>
                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Experience Received!</h3>
                <p className="text-gray-400 max-w-xs mx-auto">Your feedback fuels our AI to be better every single day. Thank you.</p>
            </motion.div>
        );
    }

    return (
        <div className="relative w-full max-w-2xl mx-auto bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-400"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            <div className="p-10">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <ThumbsUp className="text-blue-400" size={24} /> Overall Experience
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">First, how was your general experience today?</p>
                            </div>

                            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 flex flex-col items-center gap-6">
                                <StarRating
                                    value={overallRating}
                                    onChange={setOverallRating}
                                    max={5}
                                />
                                {overallRating > 0 && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-blue-400 font-bold uppercase tracking-widest text-xs"
                                    >
                                        {['', 'Needs Work', 'Decent', 'Good', 'Excellent', 'Mind-Blowing'][overallRating]}
                                    </motion.span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block">
                                    Likelihood to recommend (0-10)
                                </label>
                                <div className="flex justify-between gap-1">
                                    {[...Array(11)].map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setRecommendationScore(i)}
                                            className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${recommendationScore === i
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-white/5 text-gray-500 hover:bg-white/10'
                                                }`}
                                        >
                                            {i}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                                    <span>Not Likely</span>
                                    <span>Very Likely</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <Monitor className="text-purple-400" size={24} /> Interface & AI
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">Tell us about the platform's performance.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <StarRating label="UI Design Beauty" value={ratings.uiDesign} onChange={v => handleRatingChange('uiDesign', v)} />
                                    <StarRating label="Navigation Ease" value={ratings.navigation} onChange={v => handleRatingChange('navigation', v)} />
                                    <StarRating label="Flow Smoothness" value={ratings.interviewFlow} onChange={v => handleRatingChange('interviewFlow', v)} />
                                    <StarRating label="Mobile Experience" value={ratings.responsiveness} onChange={v => handleRatingChange('responsiveness', v)} />
                                </div>
                                <div className="space-y-6">
                                    <StarRating label="AI Accuracy" value={ratings.aiAccuracy} onChange={v => handleRatingChange('aiAccuracy', v)} />
                                    <StarRating label="System Speed" value={ratings.processingSpeed} onChange={v => handleRatingChange('processingSpeed', v)} />
                                    <StarRating label="Score Fairness" value={ratings.scoreFairness} onChange={v => handleRatingChange('scoreFairness', v)} />
                                    <StarRating label="Feedback Clarity" value={ratings.feedbackClarity} onChange={v => handleRatingChange('feedbackClarity', v)} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <MessageSquare className="text-teal-400" size={24} /> Final Thoughts
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">Anything else you'd like to share?</p>
                            </div>

                            <div className="space-y-6">
                                {overallRating >= 4 ? (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-400">What did you like the most?</label>
                                        <textarea
                                            value={likedMost}
                                            onChange={e => setLikedMost(e.target.value)}
                                            placeholder="The AI feedback was very detailed..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-red-400">What went wrong?</label>
                                        <textarea
                                            value={issuesFaced}
                                            onChange={e => setIssuesFaced(e.target.value)}
                                            placeholder="Describe any issues you faced..."
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-red-500 transition-colors h-24 resize-none"
                                        />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">How can we improve?</label>
                                    <textarea
                                        value={improvements}
                                        onChange={e => setImprovements(e.target.value)}
                                        placeholder="Add more coding questions..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-teal-400 transition-colors h-24 resize-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest bg-red-400/10 p-4 rounded-2xl border border-red-400/20"
                    >
                        <AlertCircle size={16} /> {error}
                    </motion.div>
                )}

                <div className="flex items-center justify-between mt-10">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(s => s - 1)}
                            className="text-gray-500 text-xs font-black uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Back
                        </button>
                    )}
                    <div className="flex-1" />
                    {step < 3 ? (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setStep(s => s + 1)}
                            className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/5"
                        >
                            Next <ChevronRight size={16} />
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={submitting}
                            onClick={handleSubmit}
                            className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-2xl hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader className="animate-spin" size={18} /> : <><Send size={18} /> Submit Experience</>}
                        </motion.button>
                    )}
                </div>

                <button
                    onClick={onDone}
                    className="w-full text-center mt-6 text-gray-600 text-[10px] font-black uppercase tracking-widest hover:text-gray-400 transition-colors"
                >
                    Or skip for now
                </button>
            </div>
        </div>
    );
};

export default InterviewFeedbackForm;
