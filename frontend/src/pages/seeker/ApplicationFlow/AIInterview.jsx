import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Loader, ChevronRight, User, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../../../firebase';
import AIInterviewReport from './AIInterviewReport';
import Webcam from "react-webcam";
import * as cocoSsd from "@tensorflow-models/coco-ssd";

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
    const [recordingSessionId, setRecordingSessionId] = useState(null);
    const [recordingNotice, setRecordingNotice] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(new Audio());
    const recognitionRef = useRef(null);
    const typewriterIntervalRef = useRef(null);
    const fullSessionRecorderRef = useRef(null);
    const fullSessionChunksRef = useRef([]);
    const fullSessionStreamRef = useRef(null);

    // AI state for interaction: 'idle' | 'speaking' | 'listening' | 'processing'
    const [coreState, setCoreState] = useState('idle');

    // --- AI Webcam Detection State ---
    const [model, setModel] = useState(null);
    const [warnings, setWarnings] = useState(0);
    const [isKickedOut, setIsKickedOut] = useState(false);
    const [personCount, setPersonCount] = useState(1);
    const webcamRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const MAX_WARNINGS = 20;

    useEffect(() => {
        // Preload COCO-SSD mode for person detection
        cocoSsd.load()
            .then(loadedModel => setModel(loadedModel))
            .catch(() => null);

        return () => {
            if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        };
    }, []);

    // Webcam Detection Loop
    useEffect(() => {
        if (step === "interview" && !isKickedOut) {
            detectionIntervalRef.current = setInterval(async () => {
                if (webcamRef.current && webcamRef.current.video?.readyState === 4 && model) {
                    try {
                        const predictions = await model.detect(webcamRef.current.video);
                        const persons = predictions.filter(p => p.class === "person");
                        setPersonCount(persons.length);

                        if (persons.length !== 1) {
                            setWarnings(prev => {
                                const next = prev + 1;
                                if (next >= MAX_WARNINGS) {
                                    setIsKickedOut(true);
                                    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
                                }
                                return next;
                            });
                        }
                    } catch (error) {
                        return;
                    }
                }
            }, 3000); // Check every 3 seconds
        } else {
            if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        }
        return () => {
            if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
        };
    }, [step, model, isKickedOut]);

    useEffect(() => {
        if (!isKickedOut) {
            return;
        }

        stopAndUploadFullSessionRecording().catch(() => {
            setRecordingNotice('Interview ended early, and the partial recording could not be uploaded.');
        });
    }, [isKickedOut]);

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

    const stopStreamTracks = (stream) => {
        stream?.getTracks?.().forEach(track => track.stop());
    };

    const getRecordingMimeType = () => {
        const candidates = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];

        return candidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || '';
    };

    const startFullSessionRecording = async () => {
        if (fullSessionRecorderRef.current && fullSessionRecorderRef.current.state !== 'inactive') {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 20, max: 24 }
                }
            });

            const mimeType = getRecordingMimeType();
            const recorderOptions = mimeType
                ? { mimeType, videoBitsPerSecond: 900000, audioBitsPerSecond: 96000 }
                : { videoBitsPerSecond: 900000, audioBitsPerSecond: 96000 };

            const fullSessionRecorder = new MediaRecorder(stream, recorderOptions);

            fullSessionStreamRef.current = stream;
            fullSessionRecorderRef.current = fullSessionRecorder;
            fullSessionChunksRef.current = [];

            fullSessionRecorder.ondataavailable = (event) => {
                if (event.data?.size) {
                    fullSessionChunksRef.current.push(event.data);
                }
            };

            fullSessionRecorder.start(1000);
            setRecordingNotice('');
        } catch (err) {
            setRecordingNotice('Interview continued, but full video recording could not start on this device.');
        }
    };

    const uploadFullSessionRecording = async (blob, activeRecordingSessionId) => {
        if (!blob?.size) {
            return null;
        }

        const formData = new FormData();
        formData.append('userId', user.uid);
        formData.append('jobId', job._id);
        formData.append('recordingSessionId', activeRecordingSessionId || '');
        formData.append(
            'recording',
            blob,
            `${activeRecordingSessionId || `interview-${Date.now()}`}.webm`
        );

        const response = await axios.post(`${API_URL}/interview/upload-recording`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000
        });

        return response.data;
    };

    const stopAndUploadFullSessionRecording = async () => {
        const recorder = fullSessionRecorderRef.current;
        const recordingId = recordingSessionId;

        if (!recorder) {
            return null;
        }

        if (recorder.state === 'inactive') {
            stopStreamTracks(fullSessionStreamRef.current);
            fullSessionStreamRef.current = null;
            fullSessionRecorderRef.current = null;
            fullSessionChunksRef.current = [];
            return null;
        }

        return new Promise((resolve, reject) => {
            recorder.onstop = async () => {
                const mimeType = recorder.mimeType || 'video/webm';
                const blob = new Blob(fullSessionChunksRef.current, { type: mimeType });

                stopStreamTracks(fullSessionStreamRef.current);
                fullSessionStreamRef.current = null;
                fullSessionRecorderRef.current = null;
                fullSessionChunksRef.current = [];

                try {
                    const uploadResponse = await uploadFullSessionRecording(blob, recordingId);
                    resolve(uploadResponse);
                } catch (uploadError) {
                    reject(uploadError);
                }
            };

            recorder.onerror = (event) => {
                stopStreamTracks(fullSessionStreamRef.current);
                fullSessionStreamRef.current = null;
                fullSessionRecorderRef.current = null;
                fullSessionChunksRef.current = [];
                reject(event?.error || new Error('Failed to stop session recording.'));
            };

            recorder.stop();
        });
    };

    const startInterviewTrigger = async () => {
        setStep('loading');
        try {
            const res = await axios.post(`${API_URL}/interview/start`, {
                jobId: job._id,
                userId: user.uid
            });
            setSessionId(res.data.sessionId);
            setRecordingSessionId(res.data.recordingSessionId || null);
            setCurrentQuestion(res.data.question);
            setCurrentQNum(1);
            await startFullSessionRecording();
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
                    formData.append('interviewId', sessionId); // Append BEFORE audio
                    formData.append('audio', blob, 'answer.wav');

                    let answerText = transcript;
                    try {
                        const trRes = await axios.post(`${API_URL}/upload-audio`, formData);
                        if (trRes.data?.text) answerText = trRes.data.text;
                    } catch (e) { }

                    if (!answerText || answerText.length < 2) throw new Error("Silence detected. Please try again.");

                    const nextRes = await axios.post(`${API_URL}/interview/next`, {
                        sessionId, answerText
                    });

                    if (!nextRes.data.hasNext) {
                        setStep('finalizing');
                        setRecording(false);
                        setProcessing(true);

                        // ✅ Stop and Upload Full Session Recording
                        try {
                            const uploadResponse = await stopAndUploadFullSessionRecording();
                            if (uploadResponse?.recordingSessionId) {
                                setRecordingSessionId(uploadResponse.recordingSessionId);
                                setRecordingNotice('Interview recording saved successfully.');
                            }
                        } catch (uploadErr) {
                            setRecordingNotice('Interview completed, but the session recording could not be uploaded.');
                        }

                        setFinalScore(nextRes.data.finalScore);
                        setFeedback(nextRes.data.feedback);
                        setStep('completed');
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
                    stopStreamTracks(stream);
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
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
            if (fullSessionRecorderRef.current && fullSessionRecorderRef.current.state !== 'inactive') fullSessionRecorderRef.current.stop();
            stopStreamTracks(fullSessionStreamRef.current);
            audioPlayerRef.current.pause();
            if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
            window.speechSynthesis.cancel();
        };
    }, []);

    if (isKickedOut) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-20 text-center animate-in zoom-in duration-300">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-[32px] p-10 shadow-xl border border-red-100"
                >
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[28px] mx-auto flex items-center justify-center mb-6 shadow-sm border border-red-100">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Interview Terminated</h2>
                    <p className="text-gray-600 mb-8 max-w-sm mx-auto leading-relaxed">
                        We repeatedly detected multiple people or no one in the camera frame. To ensure integrity, this interview session has been automatically closed.
                    </p>
                    <button
                        onClick={() => {
                            setStep('ready');
                            setWarnings(0);
                            setIsKickedOut(false);
                            setSessionId(null);
                        }}
                        className="w-full py-5 bg-red-600 text-white rounded-[24px] font-bold hover:bg-red-700 transition-all shadow-xl active:scale-95 text-lg"
                    >
                        Return to Start
                    </button>
                </motion.div>
            </div>
        );
    }

    if (step === 'ready') {
        return (
            <div className="max-w-xl mx-auto py-20 px-10 bg-white border border-gray-200 rounded-[2.5rem] shadow-sm text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-8 text-indigo-600">
                    <User size={32} />
                </div>
                <h2 className="text-3xl font-medium text-gray-900 mb-4 tracking-tight">AI Interview Session</h2>
                <p className="text-gray-600 mb-12 font-light leading-relaxed">
                    This session will evaluate your professional capabilities through adaptive, role-specific questioning tailored to the job requirements.
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
                <p className="text-gray-600 font-light tracking-wide italic">Preparing your personalized interview session...</p>
            </div>
        );
    }

    if (step === 'finalizing') {
        return (
            <div className="py-32 text-center">
                <Loader className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-light tracking-wide italic">Finalizing your interview and saving the full session recording...</p>
            </div>
        );
    }

    if (step === 'interview') {
        return (
            <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-700 bg-white rounded-[2.5rem] border border-gray-200 shadow-sm px-6 md:px-10 pt-10">
                {/* Minimal Header */}
                <div className="flex justify-between items-center mb-12 border-b border-gray-200 pb-6">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${coreState === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="text-xs font-light text-gray-500 uppercase tracking-[0.2em]">
                                {coreState === 'speaking' ? 'Interviewer Speaking' : coreState === 'listening' ? 'Recording Active' : 'System Ready'}
                            </span>
                        </div>
                        {/* Webcam Mini View - INCREASED SIZE */}
                        <div className="flex items-center gap-4">
                            <AnimatePresence>
                                {warnings > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                                        className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full animate-pulse"
                                    >
                                        <AlertTriangle size={12} className="text-red-500" />
                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                            {personCount === 0 ? "No Face" : "Multiple People"} ({warnings}/{MAX_WARNINGS})
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="w-48 h-36 rounded-[16px] bg-black overflow-hidden relative border-2 border-gray-200 shadow-md">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    className="w-full h-full object-cover"
                                    mirrored={true}
                                />
                                {!model && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                                        <Loader size={18} className="text-indigo-400 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">Question {currentQNum} of 10</span>
                </div>

                {/* Question Section - Elegant and Clean (No Bold) */}
                <div className="min-h-[220px] max-h-[400px] overflow-y-auto flex flex-col justify-center mb-16 px-6 custom-scrollbar">
                    <AnimatePresence>
                        {displayText ? (
                            <motion.p
                                key={currentQuestion}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-lg md:text-xl text-gray-900 leading-relaxed font-light tracking-tight text-center"
                            >
                                {displayText}
                            </motion.p>
                        ) : (
                            <motion.div
                                key="loading-voice"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="flex items-end gap-1.5 h-12">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ height: ['20%', '100%', '20%'] }}
                                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                            className="w-1.5 bg-indigo-100 rounded-full"
                                        />
                                    ))}
                                </div>
                                <span className="text-xs font-medium text-indigo-600 uppercase tracking-[0.3em] animate-pulse">
                                    Interviewer is thinking...
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
                                ? 'bg-red-500 text-white shadow-red-500/30'
                                : !displayText ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-white text-indigo-600 border border-gray-200 hover:bg-indigo-50'
                                }`}
                        >
                            {recording ? <StopCircle size={32} /> : <Mic size={32} />}
                        </motion.button>

                        <div className="flex flex-col">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1">Current State</span>
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
                                className="w-full max-w-2xl p-6 bg-gray-50 rounded-2xl border border-gray-200 italic font-light text-gray-700 text-center"
                            >
                                "{transcript}"
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {error && (
                    <div className="mt-8 text-center text-red-600 text-xs font-medium uppercase tracking-widest">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    if (step === 'completed') {
        return (
            <AIInterviewReport
                score={finalScore}
                feedback={feedback}
                totalQuestions={10}
                attemptedQuestions={currentQNum}
                userId={user.uid}
                interviewId={sessionId}
                recordingNotice={recordingNotice}
                onDone={() => onComplete({ interviewScore: finalScore })}
            />
        );
    }

    return null;
};

export default AIInterview;
