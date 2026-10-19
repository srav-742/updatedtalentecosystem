import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, MessageSquare, Sparkles, ArrowRight, Loader2, Volume2, CheckCircle2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ApproachChatPanel = ({
    stage,
    approachExplanation,
    aiReaction,
    followUpQuestion,
    followUpAnswer,
    onSubmitApproach,
    onSubmitFollowUp,
    onProceedToCoding,
    onFinalizeAndResume,
    isAiSpeaking = false,
    speechTranscript = '',
    isRecording = false,
    onToggleRecording
}) => {
    const [textInput, setTextInput] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Sync live speech recognition transcript into text input if recording
    useEffect(() => {
        if (speechTranscript && isRecording) {
            setTextInput(speechTranscript);
        }
    }, [speechTranscript, isRecording]);

    const handleSend = async () => {
        const text = textInput.trim();
        if (!text || submitting) return;
        setSubmitting(true);

        try {
            if (stage === 'APPROACH_EXPLANATION') {
                await onSubmitApproach?.(text);
                setTextInput('');
            } else if (stage === 'AI_FOLLOW_UP') {
                await onSubmitFollowUp?.(text);
                setTextInput('');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0d1117] text-gray-200 border-l border-[#30363d] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <MessageSquare size={16} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-white">
                            {stage === 'APPROACH_EXPLANATION'
                                ? 'Step 1: Explain Approach'
                                : stage === 'AI_FOLLOW_UP'
                                ? 'Step 3: AI Follow-Up'
                                : 'Technical Discussion'}
                        </h3>
                        <p className="text-[10px] text-gray-400">
                            Voice mic or text chat accepted
                        </p>
                    </div>
                </div>

                {isAiSpeaking && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold animate-pulse">
                        <Volume2 size={12} />
                        <span>AI Speaking</span>
                    </div>
                )}
            </div>

            {/* Conversation Flow Feed */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
                {/* 1. Problem Introduction Bubble */}
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow">
                        AI
                    </div>
                    <div className="p-4 rounded-2xl rounded-tl-sm bg-[#161b22] border border-[#30363d] text-xs text-gray-300 leading-relaxed max-w-[85%] space-y-2">
                        <p className="font-semibold text-white">
                            Take a moment to read through the problem statement on the left.
                        </p>
                        <p>
                            Before you begin writing code, please explain your intended approach, data structures, and algorithmic strategy. You can speak using the microphone or type below.
                        </p>
                    </div>
                </div>

                {/* 2. Candidate's Approach Bubble (if submitted or in progress) */}
                {approachExplanation && (
                    <div className="flex items-start justify-end gap-3">
                        <div className="p-4 rounded-2xl rounded-tr-sm bg-teal-950/60 border border-teal-700/60 text-xs text-teal-200 leading-relaxed max-w-[85%]">
                            <span className="text-[10px] uppercase font-bold text-teal-400 block mb-1">Your Proposed Approach:</span>
                            <p className="whitespace-pre-wrap">{approachExplanation}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow">
                            <User size={14} />
                        </div>
                    </div>
                )}

                {/* 3. AI Reaction Bubble (after approach) */}
                {aiReaction && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow">
                            <Sparkles size={14} />
                        </div>
                        <div className="p-4 rounded-2xl rounded-tl-sm bg-gradient-to-br from-indigo-950/70 to-purple-950/70 border border-indigo-700/60 text-xs text-indigo-100 leading-relaxed max-w-[85%] space-y-3">
                            <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                                <Sparkles size={11} /> AI Feedback on Approach
                            </span>
                            <p className="font-medium">{aiReaction}</p>
                            {stage === 'APPROACH_EXPLANATION' && onProceedToCoding && (
                                <button
                                    onClick={onProceedToCoding}
                                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                                >
                                    <span>Proceed to Code Editor</span>
                                    <ArrowRight size={13} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* 4. Follow-up Question Bubble */}
                {followUpQuestion && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 pt-2 border-t border-[#30363d]/50"
                    >
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow">
                            AI
                        </div>
                        <div className="p-4 rounded-2xl rounded-tl-sm bg-[#161b22] border border-[#30363d] text-xs text-gray-200 leading-relaxed max-w-[85%] space-y-2">
                            <span className="text-[10px] uppercase font-bold text-amber-400 block">Technical Follow-Up:</span>
                            <p className="font-bold text-white text-sm">{followUpQuestion}</p>
                            <p className="text-[11px] text-gray-400">
                                Explain how you would address this trade-off, edge case, or optimization.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* 5. Candidate's Follow-up Answer */}
                {followUpAnswer && (
                    <div className="flex items-start justify-end gap-3">
                        <div className="p-4 rounded-2xl rounded-tr-sm bg-teal-950/60 border border-teal-700/60 text-xs text-teal-200 leading-relaxed max-w-[85%]">
                            <span className="text-[10px] uppercase font-bold text-teal-400 block mb-1">Your Follow-Up Answer:</span>
                            <p className="whitespace-pre-wrap">{followUpAnswer}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow">
                            <User size={14} />
                        </div>
                    </div>
                )}

                {/* 6. Ready to Resume Normal Interview */}
                {stage === 'TECHNICAL_EVALUATION' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 text-center space-y-3 my-2"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={22} />
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                            Technical Round Complete!
                        </h4>
                        <p className="text-xs text-emerald-300">
                            Your code, approach, and follow-up explanations have been successfully evaluated. Click below to resume your interview questions.
                        </p>
                        <button
                            onClick={onFinalizeAndResume}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer inline-flex items-center gap-2"
                        >
                            <span>Resume Normal Interview</span>
                            <ArrowRight size={14} />
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Input Action Bar (Voice + Text Chat) */}
            {(stage === 'APPROACH_EXPLANATION' || stage === 'AI_FOLLOW_UP') && (
                <div className="p-3 bg-[#161b22] border-t border-[#30363d] space-y-2 shrink-0">
                    {/* Live Transcript / Recording Status Pill */}
                    {isRecording && (
                        <div className="px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-800 flex items-center justify-between text-xs text-red-300">
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Listening... Speak your explanation
                            </span>
                            <span className="text-[10px] text-gray-400">Click mic again to stop</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {/* Voice Mic Toggle */}
                        {onToggleRecording && (
                            <button
                                onClick={onToggleRecording}
                                title={isRecording ? 'Stop Recording' : 'Answer with Microphone'}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                    isRecording
                                        ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                                        : 'bg-[#21262d] text-gray-300 hover:text-white hover:bg-[#30363d]'
                                }`}
                            >
                                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                            </button>
                        )}

                        {/* Text Input Area */}
                        <input
                            type="text"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={
                                stage === 'APPROACH_EXPLANATION'
                                    ? 'Explain your algorithmic approach here...'
                                    : 'Type your answer to the follow-up question...'
                            }
                            disabled={submitting}
                            className="flex-1 bg-[#05080f] text-gray-100 placeholder-gray-500 px-4 py-2.5 rounded-xl border border-[#30363d] text-xs outline-none focus:border-teal-500 transition-colors"
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={!textInput.trim() || submitting}
                            className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-md active:scale-95"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApproachChatPanel;
