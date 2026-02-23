import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Star, ChevronRight, CheckCircle2, Loader } from 'lucide-react';

const DIFFICULTY_OPTIONS = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard'];
const RELEVANCE_OPTIONS = ['Yes', 'Somewhat', 'No'];
const ISSUES_OPTIONS = ['None', 'Audio issues', 'Mic issues', 'Delay'];

// Use local backend directly — the feedback route only exists locally (not yet on Render)
const FEEDBACK_API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const InterviewFeedbackForm = ({ userId, jobId, interviewScore, onDone }) => {
    const [experienceRating, setExperienceRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [difficultyLevel, setDifficultyLevel] = useState('');
    const [aiRelevance, setAiRelevance] = useState('');
    const [technicalIssues, setTechnicalIssues] = useState('None');
    const [comments, setComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!experienceRating) { setError('Please rate your experience before submitting.'); return; }
        setError('');
        setSubmitting(true);
        try {
            const payload = { userId, jobId, interviewScore, experienceRating, difficultyLevel, aiRelevance, technicalIssues, comments };
            console.log('[FEEDBACK] Sending to:', `${FEEDBACK_API}/interview/feedback`, payload);
            const res = await axios.post(`${FEEDBACK_API}/interview/feedback`, payload);
            console.log('[FEEDBACK] Saved successfully:', res.data);
            setSubmitted(true);
            // Give the user 1.5s to see the success state, then proceed
            setTimeout(() => onDone(), 1500);
        } catch (err) {
            console.error('[FEEDBACK] Error saving:', err.response?.data || err.message);
            setError('Could not save feedback. You can still continue.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl mx-auto py-20 px-12 text-center"
            >
                <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-green-500">
                    <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-light text-gray-900 mb-2">Thank you!</h3>
                <p className="text-gray-400 font-light">Your feedback helps us improve the AI interview experience.</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl mx-auto py-12 px-10 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
        >
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 rounded-full text-indigo-500 text-xs font-medium uppercase tracking-widest mb-5">
                    Quick Feedback
                </div>
                <h2 className="text-2xl font-light text-gray-900 tracking-tight mb-2">
                    Help us improve the<br />
                    <span className="font-medium text-indigo-600">AI Interview Experience</span>
                </h2>
                <p className="text-gray-400 text-sm font-light">Takes less than a minute. Your score was <strong className="text-indigo-500">{interviewScore}%</strong></p>
            </div>

            <div className="space-y-8">

                {/* 1 — Star Rating */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
                        Overall Experience
                    </label>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <motion.button
                                key={star}
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setExperienceRating(star)}
                                onMouseEnter={() => setHoveredStar(star)}
                                onMouseLeave={() => setHoveredStar(0)}
                                className="focus:outline-none"
                            >
                                <Star
                                    size={32}
                                    className={`transition-all duration-150 ${star <= (hoveredStar || experienceRating)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-200'
                                        }`}
                                />
                            </motion.button>
                        ))}
                        {experienceRating > 0 && (
                            <span className="ml-3 text-sm text-gray-400 font-light">
                                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][experienceRating]}
                            </span>
                        )}
                    </div>
                </div>

                {/* 2 — Difficulty */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
                        Difficulty Level
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {DIFFICULTY_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setDifficultyLevel(opt)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${difficultyLevel === opt
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3 — AI Relevance */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
                        Were the questions relevant to your resume?
                    </label>
                    <div className="flex gap-3">
                        {RELEVANCE_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setAiRelevance(opt)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${aiRelevance === opt
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4 — Technical Issues */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
                        Any technical issues?
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ISSUES_OPTIONS.map(opt => (
                            <button
                                key={opt}
                                onClick={() => setTechnicalIssues(opt)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${technicalIssues === opt
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 5 — Open Comments */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
                        Any suggestions? <span className="normal-case text-gray-400 font-light">(optional)</span>
                    </label>
                    <textarea
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Share your thoughts..."
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-light resize-none focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-gray-300"
                    />
                    <p className="text-right text-xs text-gray-300 mt-1">{comments.length}/500</p>
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="text-red-400 text-xs font-medium text-center uppercase tracking-wider"
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>

                {/* Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-60"
                    >
                        {submitting
                            ? <><Loader className="animate-spin" size={18} /> Submitting...</>
                            : <> Submit Feedback &amp; Finish <ChevronRight size={18} /></>
                        }
                    </motion.button>
                    <button
                        onClick={onDone}
                        className="text-gray-400 text-sm font-light hover:text-gray-600 transition-colors py-1"
                    >
                        Skip and finish →
                    </button>
                </div>

            </div>
        </motion.div>
    );
};

export default InterviewFeedbackForm;
