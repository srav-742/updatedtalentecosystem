import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Loader, ShieldCheck, Cpu, Volume2, CheckCircle2, ChevronRight, Sparkles, User, AudioLines } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AIInterview = ({ job, user, onComplete }) => {
    const [step, setStep] = useState('ready');
    const [sessionId, setSessionId] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentQNum, setCurrentQNum] = useState(1);
    const [displayText, setDisplayText] = useState('');

    const [recording, setRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [finalScore, setFinalScore] = useState(null);
    const [feedback, setFeedback] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(new Audio());
    const recognitionRef = useRef(null);
    const typewriterIntervalRef = useRef(null);

    // AI state for interaction: 'idle' | 'speaking' | 'listening' | 'processing'
    const [coreState, setCoreState] = useState('idle');

    // Clean Typewriter Effect (Removed Bold)
    const typeText = (text) => {
        if (!text) return;
        const cleanText = text.trim();
        let i = 0;
        setDisplayText('');
        setCoreState('idle');

        if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);

        typewriterIntervalRef.current = setInterval(() => {
            i++;
            if (i <= cleanText.length) {
                setDisplayText(cleanText.substring(0, i));
            } else {
                clearInterval(typewriterIntervalRef.current);
            }
        }, 22);
    };

    const playAudio = (base64, textToDisplay) => {
        setDisplayText('');
        setCoreState('speaking');
        const textToSpeak = textToDisplay || currentQuestion;
        if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);

        const speakInBrowser = () => {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.onend = () => typeText(textToSpeak);
            window.speechSynthesis.speak(utterance);
        };

        if (!base64 || base64 === "") {
            speakInBrowser();
            return;
        }

        try {
            const audioBlob = new Blob(
                [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
                { type: 'audio/mpeg' }
            );
            const url = URL.createObjectURL(audioBlob);
            audioPlayerRef.current.src = url;
            audioPlayerRef.current.onended = () => {
                setCoreState('idle');
                typeText(textToSpeak);
            };
            audioPlayerRef.current.onerror = speakInBrowser;
            audioPlayerRef.current.play().catch(speakInBrowser);
        } catch (err) {
            speakInBrowser();
        }
    };

    const startInterviewTrigger = async () => {
        setStep('loading');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/interview/start`, {
                jobId: job._id,
                userId: user.uid
            });
            setSessionId(res.data.sessionId);
            setCurrentQuestion(res.data.question);
            setCurrentQNum(1);
            setStep('interview');
            playAudio(res.data.audio, res.data.question);
        } catch (err) {
            setError("Communication link failed. Please retry.");
            setStep('ready');
        }
    };

    const toggleRecording = async () => {
        if (recording) {
            if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
            if (recognitionRef.current) recognitionRef.current.stop();
            setRecording(false);
            setCoreState('processing');
            setProcessing(true);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            recorder.onstop = async () => {
                try {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    const formData = new FormData();
                    formData.append('audio', blob, 'answer.wav');

                    let answerText = transcript;
                    try {
                        const trRes = await axios.post(`${API_BASE_URL}/api/upload-audio`, formData);
                        if (trRes.data?.text) answerText = trRes.data.text;
                    } catch (e) { }

                    if (!answerText || answerText.length < 2) throw new Error("Silence detected. Please try again.");

                    const nextRes = await axios.post(`${API_BASE_URL}/api/interview/next`, {
                        sessionId, answerText
                    });

                    if (!nextRes.data.hasNext) {
                        setFinalScore(nextRes.data.finalScore);
                        setFeedback(nextRes.data.feedback);
                        setStep('completed');
                        onComplete({ interviewScore: nextRes.data.finalScore });
                    } else {
                        setCurrentQuestion(nextRes.data.question);
                        setCurrentQNum(nextRes.data.currentQuestionNumber);
                        setTranscript('');
                        setError(null);
                        setDisplayText('');
                        playAudio(nextRes.data.audio, nextRes.data.question);
                    }
                } catch (err) {
                    setError(err.message || "Response processing error.");
                    setCoreState('idle');
                } finally {
                    setProcessing(false);
                }
            };

            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                const rec = new SpeechRec();
                rec.continuous = true;
                rec.interimResults = true;
                rec.onresult = (e) => {
                    let full = '';
                    for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
                    setTranscript(full);
                };
                recognitionRef.current = rec;
                rec.start();
            }

            recorder.start();
            setRecording(true);
            setCoreState('listening');
            setError(null);
        } catch (err) {
            setError("Mic access required to proceed.");
        }
    };

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
            audioPlayerRef.current.pause();
            if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
            window.speechSynthesis.cancel();
        };
    }, []);

    if (step === 'ready') {
        return (
            <div className="max-w-xl mx-auto py-20 px-10 bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-8 text-indigo-600">
                    <User size={32} />
                </div>
                <h2 className="text-3xl font-medium text-gray-900 mb-4 tracking-tight">AI Interview Session</h2>
                <p className="text-gray-500 mb-12 font-light leading-relaxed">
                    This session will evaluate your technical proficiency through adaptive questioning.
                </p>
                <button
                    onClick={startInterviewTrigger}
                    className="w-full py-4 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                    Begin Interview <ChevronRight size={18} />
                </button>
            </div>
        );
    }

    if (step === 'loading') {
        return (
            <div className="py-32 text-center">
                <Loader className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-400 font-light tracking-wide italic">Connecting to assessment engine...</p>
            </div>
        );
    }

    if (step === 'interview') {
        return (
            <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-700">
                {/* Minimal Header */}
                <div className="flex justify-between items-center mb-12 border-b border-gray-50 pb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${coreState === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="text-xs font-light text-gray-400 uppercase tracking-[0.2em]">
                            {coreState === 'speaking' ? 'Interviewer Speaking' : coreState === 'listening' ? 'Recording Active' : 'System Ready'}
                        </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Question {currentQNum} of 10</span>
                </div>

                {/* Question Section - Elegant and Clean (No Bold) */}
                <div className="min-h-[220px] flex flex-col justify-center mb-16 px-4">
                    <AnimatePresence mode="wait">
                        {displayText ? (
                            <motion.p
                                key={currentQuestion}
                                animate={{ opacity: 1 }}
                                className="text-lg md:text-xl text-gray-800 leading-relaxed font-light tracking-tight text-center"
                            >
                                {displayText}
                            </motion.p>
                        ) : (
                            <motion.div
                                key="loading-voice"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="flex items-end gap-1.5 h-12">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ height: ['20%', '100%', '20%'] }}
                                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                            className="w-1.5 bg-indigo-500/20 rounded-full"
                                        />
                                    ))}
                                </div>
                                <span className="text-xs font-medium text-indigo-400 uppercase tracking-[0.3em] animate-pulse">
                                    Audio Feed Processing...
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Interaction Section */}
                <div className="flex flex-col items-center gap-10">
                    <div className="flex items-center gap-8">
                        <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={toggleRecording}
                            disabled={processing || !displayText}
                            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${recording
                                ? 'bg-red-500 text-white shadow-red-200'
                                : !displayText ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white text-indigo-600 border border-indigo-50 hover:bg-indigo-50'
                                }`}
                        >
                            {recording ? <StopCircle size={32} /> : <Mic size={32} />}
                        </motion.button>

                        <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">Current State</span>
                            <span className={`text-sm font-medium ${recording ? 'text-red-500' : 'text-gray-900'}`}>
                                {recording ? 'Transcribing your answer' : processing ? 'Analyzing response' : 'Touch mic to speak'}
                            </span>
                        </div>
                    </div>

                    {/* Transcript Preview */}
                    <AnimatePresence>
                        {transcript && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="w-full max-w-2xl p-6 bg-gray-50 rounded-2xl border border-gray-100 italic font-light text-gray-500 text-center"
                            >
                                "{transcript}"
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && (
                    <div className="mt-8 text-center text-red-500 text-xs font-medium uppercase tracking-widest">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    if (step === 'completed') {
        return (
            <div className="max-w-xl mx-auto py-20 px-12 bg-white rounded-[2.5rem] border border-gray-100 text-center shadow-sm">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-600">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-3xl font-light text-gray-900 mb-2">Audit Concluded</h2>
                <div className="text-5xl font-light text-indigo-600 my-8 italic">
                    {finalScore}%
                </div>
                <p className="text-gray-500 font-light mb-12 italic leading-relaxed">
                    "{feedback}"
                </p>
                <button
                    onClick={() => onComplete({ interviewScore: finalScore })}
                    className="w-full py-4 bg-gray-900 text-white font-medium rounded-xl hover:bg-black transition-all shadow-lg"
                >
                    Finalize Application
                </button>
            </div>
        );
    }

    return null;
};

export default AIInterview;
