import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../firebase';
import TechnicalProblemPanel from './TechnicalProblemPanel';
import CodingEditorWorkspace from './CodingEditorWorkspace';
import ApproachChatPanel from './ApproachChatPanel';
import {
    Terminal,
    MessageSquare,
    Code2,
    CheckCircle2,
    Sparkles,
    ArrowRight,
    Loader2,
    Layers,
    Cpu,
    Video,
    Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    { key: 'APPROACH_EXPLANATION', label: '1. Explain Approach', icon: MessageSquare },
    { key: 'CODING_IN_PROGRESS', label: '2. Code & Test', icon: Code2 },
    { key: 'AI_FOLLOW_UP', label: '3. AI Follow-Up', icon: Sparkles },
    { key: 'TECHNICAL_EVALUATION', label: '4. Evaluation', icon: CheckCircle2 }
];

const LiveTechnicalWorkspace = ({
    sessionId,
    initialProblem = null,
    onResumeInterview,
    fetchAndPlayAudio,
    isAiSpeaking = false,
    speechTranscript = '',
    isRecording = false,
    onToggleRecording,
    cameraStream = null
}) => {
    const [problem, setProblem] = useState(initialProblem);
    const [stage, setStage] = useState('APPROACH_EXPLANATION');
    const [loading, setLoading] = useState(!initialProblem);
    const [approachExplanation, setApproachExplanation] = useState('');
    const [aiReaction, setAiReaction] = useState('');
    const [followUpQuestion, setFollowUpQuestion] = useState('');
    const [followUpAnswer, setFollowUpAnswer] = useState('');
    const [evaluation, setEvaluation] = useState(null);
    const [rightPaneView, setRightPaneView] = useState('approach'); // 'approach' | 'editor'
    const [error, setError] = useState(null);
    const hasSpokenIntroRef = useRef(false);

    // 1. Fetch or initialize technical problem on mount
    useEffect(() => {
        let isMounted = true;

        const initSession = async () => {
            try {
                // First check current state
                const stateRes = await axios.get(`${API_URL}/interview/technical/state/${sessionId}`);
                if (!isMounted) return;

                if (stateRes.data?.success && stateRes.data?.problem) {
                    setProblem(stateRes.data.problem);
                    const currentStage = stateRes.data.technicalStage;

                    if (currentStage === 'CODING_IN_PROGRESS') {
                        setStage('CODING_IN_PROGRESS');
                        setRightPaneView('editor');
                    } else if (currentStage === 'AI_FOLLOW_UP') {
                        setStage('AI_FOLLOW_UP');
                        setRightPaneView('approach');
                    } else if (currentStage === 'TECHNICAL_EVALUATION' || currentStage === 'COMPLETED') {
                        setStage('TECHNICAL_EVALUATION');
                        setEvaluation(stateRes.data.evaluation);
                        setRightPaneView('approach');
                    }

                    // Restore attempts
                    const approachAttempt = (stateRes.data.attempts || []).find(a => a.type === 'APPROACH');
                    if (approachAttempt) {
                        setApproachExplanation(approachAttempt.content || '');
                        if (approachAttempt.evaluation?.aiReaction) {
                            setAiReaction(approachAttempt.evaluation.aiReaction);
                        }
                    }

                    const lastFollowUp = (stateRes.data.followUps || []).slice().reverse()[0];
                    if (lastFollowUp) {
                        setFollowUpQuestion(lastFollowUp.question || '');
                        setFollowUpAnswer(lastFollowUp.answer || '');
                    }

                    setLoading(false);
                    return;
                }

                // If no problem exists yet, call init
                const initRes = await axios.post(`${API_URL}/interview/technical/init`, { sessionId });
                if (!isMounted) return;

                if (initRes.data?.success && initRes.data?.problem) {
                    setProblem(initRes.data.problem);
                    setStage('APPROACH_EXPLANATION');
                    setRightPaneView('approach');

                    // Announce problem statement via AI speech once
                    if (!hasSpokenIntroRef.current && fetchAndPlayAudio) {
                        hasSpokenIntroRef.current = true;
                        fetchAndPlayAudio(
                            `I've presented the live technical challenge: ${initRes.data.problem.title}. Take a moment to read it, and explain your approach before coding.`,
                            sessionId
                        );
                    }
                }
            } catch (err) {
                console.error('[LIVE-TECH] Init error:', err);
                if (isMounted) setError(err.response?.data?.message || err.message || 'Failed to initialize technical challenge.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (sessionId) {
            initSession();
        }

        return () => {
            isMounted = false;
        };
    }, [sessionId]);

    // Handle candidate submitting approach explanation
    const handleSubmitApproach = async (text) => {
        try {
            setApproachExplanation(text);
            const res = await axios.post(`${API_URL}/interview/technical/explain-approach`, {
                sessionId,
                approachText: text
            });

            if (res.data?.success) {
                const reactionText = res.data.aiReaction || "That's a solid strategy. Let's write the code.";
                setAiReaction(reactionText);
                setStage('CODING_IN_PROGRESS');

                if (fetchAndPlayAudio) {
                    fetchAndPlayAudio(reactionText, sessionId);
                }
            }
        } catch (err) {
            console.error('[LIVE-TECH] Submit approach error:', err);
            setError(err.response?.data?.message || 'Error submitting approach.');
        }
    };

    // Proceed from approach feedback to code editor
    const handleProceedToCoding = () => {
        setStage('CODING_IN_PROGRESS');
        setRightPaneView('editor');
    };

    // Handle candidate submitting final code solution
    const handleSolutionSubmitted = ({ code, language, testResults, followUpQuestion: q }) => {
        setStage('AI_FOLLOW_UP');
        setFollowUpQuestion(q);
        setRightPaneView('approach');

        if (fetchAndPlayAudio && q) {
            fetchAndPlayAudio(q, sessionId);
        }
    };

    // Handle candidate answering AI follow-up question
    const handleSubmitFollowUp = async (text) => {
        try {
            setFollowUpAnswer(text);
            const res = await axios.post(`${API_URL}/interview/technical/answer-follow-up`, {
                sessionId,
                followUpAnswer: text
            });

            if (res.data?.success) {
                setStage('TECHNICAL_EVALUATION');
                setRightPaneView('approach');
            }
        } catch (err) {
            console.error('[LIVE-TECH] Submit follow-up error:', err);
            setError(err.response?.data?.message || 'Error submitting follow-up answer.');
        }
    };

    // Finalize evaluation and resume normal interview
    const handleFinalizeAndResume = async () => {
        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/interview/technical/complete-and-resume`, { sessionId });

            if (res.data?.success) {
                setEvaluation(res.data.evaluation);
                const speech = res.data.resumeSpeech || "Great job completing the technical problem! Let's resume our interview.";
                if (fetchAndPlayAudio) {
                    fetchAndPlayAudio(speech, sessionId);
                }

                // Call parent callback to resume normal interview
                onResumeInterview?.({
                    evaluation: res.data.evaluation,
                    resumeSpeech: speech
                });
            }
        } catch (err) {
            console.error('[LIVE-TECH] Complete and resume error:', err);
            setError(err.response?.data?.message || 'Error completing technical challenge.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-[750px] bg-[#0d1117] rounded-3xl border border-[#30363d] flex flex-col items-center justify-center text-center p-8 text-gray-300">
                <Loader2 size={36} className="text-teal-400 animate-spin mb-4" />
                <h3 className="text-base font-bold text-white mb-1">Setting Up Live Technical Workspace</h3>
                <p className="text-xs text-gray-500 max-w-sm">
                    Generating dynamic problem, test cases, and preparing isolated container sandbox...
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-[820px] bg-[#0d1117] rounded-3xl border border-[#30363d] shadow-2xl flex flex-col overflow-hidden text-gray-200">
            {/* Top Workspace Header & Progression Bar */}
            <header className="px-6 py-3.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between shrink-0">
                {/* Left: Challenge Badge & Webcam Pip */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                            <Terminal size={17} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 block leading-tight">
                                Live Technical Round
                            </span>
                            <span className="text-xs font-bold text-white">
                                {problem?.title || 'Interactive Problem-Solving'}
                            </span>
                        </div>
                    </div>

                    {/* Camera Preview Mini-PiP */}
                    {cameraStream && (
                        <div className="w-20 h-14 rounded-lg bg-black border border-[#30363d] overflow-hidden relative shadow hidden sm:block">
                            <video
                                autoPlay
                                muted
                                playsInline
                                ref={(el) => {
                                    if (el && cameraStream) {
                                        const camTrack = cameraStream.getVideoTracks().find(t => !(t.getSettings?.().displaySurface)) || cameraStream.getVideoTracks()[0];
                                        if (camTrack) {
                                            if (!el.srcObject || el.srcObject.getVideoTracks?.()[0]?.id !== camTrack.id) {
                                                el.srcObject = new MediaStream([camTrack]);
                                            }
                                            el.play().catch(() => {});
                                        }
                                    }
                                }}
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Center: Stage Progression Stepper */}
                <div className="hidden md:flex items-center gap-2">
                    {STEPS.map((step, idx) => {
                        const StepIcon = step.icon;
                        const isCurrent = stage === step.key;
                        const isPast =
                            (stage === 'CODING_IN_PROGRESS' && idx === 0) ||
                            (stage === 'AI_FOLLOW_UP' && idx <= 1) ||
                            (stage === 'TECHNICAL_EVALUATION' && idx <= 2);

                        return (
                            <React.Fragment key={step.key}>
                                {idx > 0 && (
                                    <div className={`w-4 h-0.5 ${isPast ? 'bg-teal-500' : 'bg-[#30363d]'}`} />
                                )}
                                <div
                                    className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                                        isCurrent
                                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-xs'
                                            : isPast
                                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/40'
                                            : 'bg-[#21262d] text-gray-500 border border-[#30363d]'
                                    }`}
                                >
                                    <StepIcon size={12} />
                                    <span>{step.label}</span>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Right: View Toggles for Right Pane (when in Coding mode) */}
                <div className="flex items-center gap-2">
                    {stage === 'CODING_IN_PROGRESS' && (
                        <div className="flex items-center bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
                            <button
                                onClick={() => setRightPaneView('editor')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    rightPaneView === 'editor'
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Code2 size={13} />
                                <span>Code Editor</span>
                            </button>
                            <button
                                onClick={() => setRightPaneView('approach')}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    rightPaneView === 'approach'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <MessageSquare size={13} />
                                <span>Discussion</span>
                            </button>
                        </div>
                    )}

                    {evaluation && (
                        <button
                            onClick={handleFinalizeAndResume}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                            <span>Resume Interview</span>
                            <ArrowRight size={13} />
                        </button>
                    )}
                </div>
            </header>

            {/* Error Banner if any */}
            {error && (
                <div className="px-6 py-2 bg-red-950/80 border-b border-red-800 text-red-300 text-xs flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-white">✕</button>
                </div>
            )}

            {/* Main Split Layout */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Pane: Technical Problem Description (45% width) */}
                <div className="w-full md:w-[45%] h-full overflow-hidden border-b md:border-b-0">
                    <TechnicalProblemPanel problem={problem} />
                </div>

                {/* Right Pane: Dynamic Workspace / Discussion (55% width) */}
                <div className="w-full md:w-[55%] h-full overflow-hidden flex flex-col">
                    <div className={`h-full flex flex-col ${rightPaneView === 'editor' ? '' : 'hidden'}`}>
                        <CodingEditorWorkspace
                            sessionId={sessionId}
                            problem={problem}
                            onSolutionSubmitted={handleSolutionSubmitted}
                            initialLanguage={problem?.primaryLanguage || 'python'}
                        />
                    </div>
                    <div className={`h-full flex flex-col ${rightPaneView === 'approach' ? '' : 'hidden'}`}>
                        <ApproachChatPanel
                            stage={stage}
                            approachExplanation={approachExplanation}
                            aiReaction={aiReaction}
                            followUpQuestion={followUpQuestion}
                            followUpAnswer={followUpAnswer}
                            onSubmitApproach={handleSubmitApproach}
                            onSubmitFollowUp={handleSubmitFollowUp}
                            onProceedToCoding={handleProceedToCoding}
                            onFinalizeAndResume={handleFinalizeAndResume}
                            isAiSpeaking={isAiSpeaking}
                            speechTranscript={speechTranscript}
                            isRecording={isRecording}
                            onToggleRecording={onToggleRecording}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveTechnicalWorkspace;
