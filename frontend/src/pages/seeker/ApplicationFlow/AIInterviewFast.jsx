import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Loader, ChevronRight, User, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../../../firebase';
import AIInterviewReport from './AIInterviewReport';
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import SecureExamWrapper from '../../../components/exam/SecureExamWrapper';

/**
 * ─── AIInterviewFast ────────────────────────────────────────────────────────
 *
 * Optimized copy of AIInterview.jsx that reduces question-to-question
 * latency from ~20-30 seconds to ~3-5 seconds.
 *
 * CHANGES FROM ORIGINAL:
 *   1. When mic stops, the browser's real-time SpeechRecognition transcript
 *      is sent DIRECTLY to /interview/next-fast (no /upload-audio wait).
 *   2. Audio file is uploaded asynchronously in the background for
 *      archival/proctoring — it does NOT block the UI.
 *   3. /interview/next-fast runs answer evaluation in the background
 *      and only awaits the next question generation.
 *
 * ORIGINAL FILE: AIInterview.jsx is NOT modified — it remains fully intact.
 * ────────────────────────────────────────────────────────────────────────────
 */

const AIInterviewFast = ({ job, user, onComplete, onSecurityReset }) => {
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
    const [ownershipScore, setOwnershipScore] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [recordingSessionId, setRecordingSessionId] = useState(null);
    const [recordingNotice, setRecordingNotice] = useState('');

    // Tab lock state
    const [interviewTerminated, setInterviewTerminated] = useState(false);
    const [securityResetting, setSecurityResetting] = useState(false);

    const mediaRecorderRef = useRef(null);
    const answerStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(new Audio());
    const recognitionRef = useRef(null);
    const typewriterIntervalRef = useRef(null);
    const fullSessionRecorderRef = useRef(null);
    const fullSessionStreamRef = useRef(null);
    const chunkIndexRef = useRef(0);
    const securityResetRef = useRef(false);
    const chunkUploadsRef = useRef([]);

    // AI state for interaction: 'idle' | 'speaking' | 'listening' | 'processing'
    const [coreState, setCoreState] = useState('idle');
    const latestTranscriptRef = useRef('');

    // --- AI Webcam Detection State ---
    const [model, setModel] = useState(null);
    const [warnings, setWarnings] = useState(0);
    const [isKickedOut, setIsKickedOut] = useState(false);
    const [personCount, setPersonCount] = useState(1);
    const webcamRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const MAX_WARNINGS = 20;
    const normalizeQuestionText = (text = '') =>
        String(text)
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

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
            }, 3000);
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

    // Clean Typewriter Effect — guarantees the FULL question is always displayed
    const typeText = (text) => {
        const cleanText = normalizeQuestionText(text);
        if (!cleanText) return;
        let i = 0;
        setDisplayText('');

        if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);

        typewriterIntervalRef.current = setInterval(() => {
            i++;
            if (i <= cleanText.length) {
                setDisplayText(cleanText.substring(0, i));
            } else {
                clearInterval(typewriterIntervalRef.current);
                typewriterIntervalRef.current = null;
                // Ensure the FULL text is set after typewriter completes
                setDisplayText(cleanText);
            }
        }, 10);

        // Safety net: if typewriter takes too long, force-set the full text
        setTimeout(() => {
            if (typewriterIntervalRef.current) {
                clearInterval(typewriterIntervalRef.current);
                typewriterIntervalRef.current = null;
            }
            setDisplayText(cleanText);
        }, Math.max(cleanText.length * 12, 3000));
    };

    const speakInBrowserFallback = (text) => {
        window.speechSynthesis.cancel();
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.92;
            utterance.pitch = 1.0;
            const voices = window.speechSynthesis.getVoices();
            // Try to find the highest-quality native voice
            const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft') && (v.name.includes('Guy') || v.name.includes('Davis') || v.name.includes('Tony')))
                || voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
                || voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.localService === false))
                || voices.find(v => v.lang === 'en-US');
            if (preferredVoice) utterance.voice = preferredVoice;
            
            utterance.onend = () => setCoreState('idle');
            utterance.onerror = () => setCoreState('idle');
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error("[TTS-BROWSER-FALLBACK] browser speech synthesis failed:", err);
            setCoreState('idle');
        }
    };

    const playDecoupledAudio = (base64, text) => {
        try {
            const audioBlob = new Blob(
                [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
                { type: 'audio/mpeg' }
            );
            const url = URL.createObjectURL(audioBlob);
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            audioPlayerRef.current.src = url;
            audioPlayerRef.current.playbackRate = 0.90; // Slow down voice slightly for measured cadence
            
            audioPlayerRef.current.onplay = () => {
                audioPlayerRef.current.playbackRate = 0.90; // Lock speed
            };
            audioPlayerRef.current.onended = () => setCoreState('idle');
            audioPlayerRef.current.onerror = () => speakInBrowserFallback(text);
            audioPlayerRef.current.play().catch(() => speakInBrowserFallback(text));
        } catch (err) {
            speakInBrowserFallback(text);
        }
    };

    const fetchAndPlayAudio = async (text, activeSessionId) => {
        setCoreState('speaking');
        try {
            const res = await axios.post(`${API_URL}/interview/tts`, { 
                text, 
                sessionId: activeSessionId 
            });
            if (res.data?.audio) {
                playDecoupledAudio(res.data.audio, text);
            } else {
                speakInBrowserFallback(text);
            }
        } catch (err) {
            console.warn("[TTS-ASYNC] Failed to fetch audio, using browser fallback", err);
            speakInBrowserFallback(text);
        }
    };

    const stopStreamTracks = (stream) => {
        stream?.getTracks?.().forEach(track => track.stop());
    };

    const getRecordingMimeType = () => {
        // Ordered by quality. Safari/iOS don't support webm — fall back to mp4/h264.
        const candidates = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4;codecs=h264,aac',
            'video/mp4'
        ];

        return candidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || '';
    };

    const startFullSessionRecording = async (activeSessionId, activeRecordingSessionId) => {
        if (!fullSessionStreamRef.current) {
            setRecordingNotice('Hardware not initialized. Please restart setup.');
            return;
        }

        try {
            const mimeType = getRecordingMimeType();
            const recorderOptions = mimeType
                ? { mimeType, videoBitsPerSecond: 900000, audioBitsPerSecond: 96000 }
                : { videoBitsPerSecond: 900000, audioBitsPerSecond: 96000 };

            const recordTracks = [];
            const camVideoTrack = fullSessionStreamRef.current.getVideoTracks().find(t => !(t.label || '').toLowerCase().includes('screen') && !(t.label || '').toLowerCase().includes('monitor'));
            const audioTrack = fullSessionStreamRef.current.getAudioTracks()[0];

            if (camVideoTrack) recordTracks.push(camVideoTrack);
            if (audioTrack) recordTracks.push(audioTrack);

            const recordStream = new MediaStream(recordTracks);

            const fullSessionRecorder = new MediaRecorder(recordStream, recorderOptions);
            fullSessionRecorderRef.current = fullSessionRecorder;
            chunkIndexRef.current = 0;
            chunkUploadsRef.current = [];

            const uploadChunkWithRetry = async (formData, index, retries = 3) => {
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        await axios.post(`${API_URL}/upload-recording-chunk`, formData);
                        return;
                    } catch (err) {
                        console.warn(`Chunk ${index} upload attempt ${attempt} failed:`, err);
                        if (attempt === retries) {
                            console.error(`Chunk ${index} upload failed after ${retries} attempts.`);
                            throw err;
                        }
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            };

            fullSessionRecorder.ondataavailable = async (event) => {
                if (event.data?.size > 0) {
                    const chunk = event.data;
                    const currentIndex = chunkIndexRef.current;
                    chunkIndexRef.current++;

                    const formData = new FormData();
                    formData.append('sessionId', activeRecordingSessionId || activeSessionId);
                    formData.append('chunkIndex', currentIndex);
                    formData.append('chunk', chunk);

                    const uploadPromise = uploadChunkWithRetry(formData, currentIndex);
                    chunkUploadsRef.current.push(uploadPromise);
                }
            };

            fullSessionRecorder.start(30000);
            setRecordingNotice('');
        } catch (err) {
            setRecordingNotice('Interview continued, but full video recording could not start.');
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
        if (!recorder) return null;

        return new Promise((resolve) => {
            recorder.onstop = async () => {
                try {
                    // Wait for all in-flight chunk uploads to settle
                    if (chunkUploadsRef.current.length > 0) {
                        await Promise.allSettled(chunkUploadsRef.current);
                    }
                    // Finalize is now async on the server — it responds immediately.
                    // The actual merge+upload happens in the background on the server.
                    const response = await axios.post(`${API_URL}/finalize-recording`, {
                        sessionId: recordingSessionId || sessionId,
                        userId: user.uid,
                        jobId: job._id
                    });
                    resolve(response.data);
                } catch (err) {
                    console.error("Finalization request failed", err);
                    resolve(null);
                } finally {
                    stopStreamTracks(fullSessionStreamRef.current);
                    fullSessionStreamRef.current = null;
                    fullSessionRecorderRef.current = null;
                    chunkUploadsRef.current = [];
                }
            };
            recorder.stop();
        });
    };

    const startInterviewTrigger = async () => {
        setStep('loading');
        try {
            // ── Uses the EXISTING /interview/start endpoint (no change needed) ──
            const res = await axios.post(`${API_URL}/interview/start`, {
                jobId: job._id,
                userId: user.uid
            });
            const firstQuestion = normalizeQuestionText(res.data.question);
            const activeSessionId = res.data.sessionId;
            const activeRecordingSessionId = res.data.recordingSessionId || null;
            setSessionId(activeSessionId);
            setRecordingSessionId(activeRecordingSessionId);
            setCurrentQuestion(firstQuestion);
            setCurrentQNum(1);
            await startFullSessionRecording(activeSessionId, activeRecordingSessionId);
            setStep('interview');
            typeText(firstQuestion);
            fetchAndPlayAudio(firstQuestion, activeSessionId);
        } catch (err) {
            setError("Communication link failed. Please retry.");
            setStep('ready');
        }
    };

    // ── OPTIMIZED: Calls /interview/next-fast instead of /interview/next ────
    const submitUserAnswer = async (answerText) => {
        if (processing) return;
        setProcessing(true);
        setCoreState('processing');

        try {
            const nextRes = await axios.post(`${API_URL}/interview/next-fast`, {
                sessionId,
                answerText: answerText || ""
            });

            if (!nextRes.data.hasNext) {
                setStep('finalizing');
                setRecording(false);

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
                setOwnershipScore(nextRes.data.ownershipScore);
                setFeedback(nextRes.data.feedback);
                setStep('completed');
            } else {
                const nextQuestion = normalizeQuestionText(nextRes.data.question);
                setCurrentQuestion(nextQuestion);
                setCurrentQNum(nextRes.data.currentQuestionNumber);
                setTranscript('');
                setError(null);
                setDisplayText('');
                typeText(nextQuestion);
                fetchAndPlayAudio(nextQuestion, sessionId);
            }
        } catch (err) {
            setError(err.message || "Response processing error.");
            setCoreState('idle');
        } finally {
            setProcessing(false);
        }
    };

    // ── OPTIMIZED: toggleRecording — bypasses /upload-audio wait ─────────────
    const toggleRecording = async () => {
        if (recording) {
            if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
            if (recognitionRef.current) recognitionRef.current.stop();
            setRecording(false);
            setCoreState('processing');
            return;
        }

        try {
            setTranscript('');
            latestTranscriptRef.current = '';

            let stream;
            let isReusedStream = false;
            const existingAudioTracks = fullSessionStreamRef.current?.getAudioTracks();
            if (existingAudioTracks && existingAudioTracks.length > 0) {
                stream = new MediaStream([existingAudioTracks[0].clone()]);
                isReusedStream = false;
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                isReusedStream = false;
            }

            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            answerStreamRef.current = stream;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

            // ── OPTIMIZED: onstop handler ───────────────────────────────────
            // Instead of waiting for /upload-audio (Whisper STT), we:
            //   1. Immediately send the local transcript to /next-fast
            //   2. Upload the audio file in the background (fire-and-forget)
            // ────────────────────────────────────────────────────────────────
            recorder.onstop = async () => {
                if (securityResetRef.current) {
                    stopStreamTracks(answerStreamRef.current);
                    answerStreamRef.current = null;
                    setRecording(false);
                    setProcessing(false);
                    setCoreState('idle');
                    return;
                }

                try {
                    // Get the real-time transcript from browser SpeechRecognition
                    const localTranscriptText = latestTranscriptRef.current || "";

                    // ── FAST PATH: Submit answer immediately using local transcript ──
                    await submitUserAnswer(localTranscriptText);

                    // ── ASYNC BACKGROUND: Upload audio for archival/proctoring ──
                    try {
                        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                        const formData = new FormData();
                        formData.append('interviewId', sessionId);
                        formData.append('audio', blob, 'answer.wav');
                        formData.append('localTranscript', localTranscriptText);

                        // Fire-and-forget: does NOT block the UI
                        axios.post(`${API_URL}/interview/upload-audio-async`, formData).catch(bgErr => {
                            console.warn("[FAST] Background audio upload failed:", bgErr);
                        });
                    } catch (bgUploadErr) {
                        console.warn("[FAST] Could not prepare background audio upload:", bgUploadErr);
                    }

                } catch (err) {
                    setError(err.message || "Response processing error.");
                    setCoreState('idle');
                } finally {
                    if (!isReusedStream) {
                        stopStreamTracks(answerStreamRef.current || stream);
                    }
                    answerStreamRef.current = null;
                    setProcessing(false);
                }
            };

            const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRec) {
                const rec = new SpeechRec();
                rec.lang = 'en-US';
                rec.continuous = true;
                rec.interimResults = true;
                rec.maxAlternatives = 1;
                rec.onresult = (e) => {
                    let finalText = '';
                    let interimText = '';
                    for (let i = 0; i < e.results.length; i++) {
                        const result = e.results[i];
                        if (result.isFinal) {
                            finalText += result[0].transcript;
                        } else {
                            interimText += result[0].transcript;
                        }
                    }
                    const full = (finalText + interimText).trim();
                    setTranscript(full || '');
                    latestTranscriptRef.current = full || '';
                };
                rec.onerror = (e) => {
                    // If speech recognition errors out (e.g. no-speech), restart it
                    if (e.error === 'no-speech' || e.error === 'audio-capture') {
                        try { rec.start(); } catch(_) {}
                    }
                };
                rec.onend = () => {
                    // Auto-restart if recording is still active (browser may stop it)
                    if (recording || mediaRecorderRef.current?.state === 'recording') {
                        try { rec.start(); } catch(_) {}
                    }
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

    // Warn users before they accidentally close the tab during an active recording
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (fullSessionRecorderRef.current && fullSessionRecorderRef.current.state === 'recording') {
                e.preventDefault();
                e.returnValue = 'Your interview recording is still in progress. Are you sure you want to leave?';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
            if (fullSessionRecorderRef.current && fullSessionRecorderRef.current.state !== 'inactive') fullSessionRecorderRef.current.stop();
            stopStreamTracks(answerStreamRef.current);
            stopStreamTracks(fullSessionStreamRef.current);
            audioPlayerRef.current.pause();
            if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
            window.speechSynthesis.cancel();
        };
    }, []);

    const handleInterviewSecurityReset = async (violation) => {
        console.warn('Interview security reset triggered:', violation);
        securityResetRef.current = true;
        setInterviewTerminated(true);
        setSecurityResetting(true);
        setRecording(false);
        setProcessing(false);
        setCoreState('idle');

        recognitionRef.current?.stop();
        audioPlayerRef.current.pause();
        window.speechSynthesis.cancel();

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }

        stopStreamTracks(answerStreamRef.current);
        answerStreamRef.current = null;

        if (fullSessionRecorderRef.current && fullSessionRecorderRef.current.state !== 'inactive') {
            fullSessionRecorderRef.current.onstop = null;
            fullSessionRecorderRef.current.onerror = null;
            fullSessionRecorderRef.current.stop();
        }

        stopStreamTracks(fullSessionStreamRef.current);
        fullSessionStreamRef.current = null;
        fullSessionRecorderRef.current = null;

        await onSecurityReset?.({
            stage: 'interview',
            reason: violation?.detail || 'Interview security limit exceeded',
            violation
        });
    };

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
            <div className="max-w-2xl mx-auto py-12 px-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl text-center">
                <div className="w-20 h-20 bg-black text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <User size={36} />
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">AI Interview Session</h2>
                <p className="text-gray-500 mb-10 font-medium leading-relaxed max-w-md mx-auto text-sm">
                    An adaptive, high-fidelity interview session designed to verify your expertise for the <span className="text-black font-black uppercase tracking-wider">{job?.title || 'requested role'}</span>.
                </p>

                {/* Detailed Instructions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-10">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">Environment</h4>
                                <p className="text-[11px] text-gray-500 leading-normal">Sit in a quiet, well-lit room with a stable internet connection.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">Honesty</h4>
                                <p className="text-[11px] text-gray-500 leading-normal">Your webcam and microphone will be active to ensure interview integrity.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold mt-0.5">3</div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">Process</h4>
                                <p className="text-[11px] text-gray-500 leading-normal">The AI will ask 10 questions. Press the microphone to start and stop recording.</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold mt-0.5">4</div>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">Security</h4>
                                <p className="text-[11px] text-gray-500 leading-normal">Tab switching and presence detection are active. Violations may reset the session.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-10 flex items-center gap-4">
                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                    <p className="text-[11px] text-amber-800 font-medium text-left">
                        Once you begin, do not close this window or switch tabs. Ensure your face is clearly visible in the camera frame at all times.
                    </p>
                </div>

                <button
                    onClick={() => setStep('lobby')}
                    className="w-full py-6 bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-[2rem] hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                >
                    Begin Setup <ChevronRight size={18} />
                </button>
            </div>
        );
    }

    if (step === 'lobby') {
        const hasCamera = fullSessionStreamRef.current?.getVideoTracks().some(t => !(t.label || '').toLowerCase().includes('screen') && !(t.label || '').toLowerCase().includes('monitor'));
        const hasScreen = fullSessionStreamRef.current?.getVideoTracks().some(t => (t.label || '').toLowerCase().includes('screen') || (t.label || '').toLowerCase().includes('monitor'));

        return (
            <div className="max-w-4xl mx-auto py-12 px-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl">
                <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight text-center">Interview Hardware Setup</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-full aspect-video bg-gray-900 rounded-3xl overflow-hidden relative border-2 border-gray-100 shadow-inner">
                            {hasCamera ? (
                                <video 
                                    autoPlay 
                                    muted 
                                    playsInline 
                                    ref={el => { 
                                        if(el) {
                                            const camTrack = fullSessionStreamRef.current.getVideoTracks().find(t => !(t.label || '').toLowerCase().includes('screen') && !(t.label || '').toLowerCase().includes('monitor'));
                                            if (camTrack) el.srcObject = new MediaStream([camTrack]);
                                        }
                                    }}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                                    <User size={40} className="opacity-20" />
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">Camera Inactive</span>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    const camStream = await navigator.mediaDevices.getUserMedia({ 
                                        video: { width: 1280, height: 720 },
                                        audio: { echoCancellation: true, noiseSuppression: true }
                                    });
                                    if (!fullSessionStreamRef.current) {
                                        fullSessionStreamRef.current = new MediaStream();
                                    }
                                    camStream.getTracks().forEach(t => fullSessionStreamRef.current.addTrack(t));
                                    setStep('lobby-refresh'); setTimeout(() => setStep('lobby'), 10);
                                } catch (e) { setError("Camera access denied."); }
                            }}
                            className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${hasCamera ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {hasCamera ? 'Camera Enabled' : 'Enable Camera'}
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-full aspect-video bg-gray-900 rounded-3xl overflow-hidden relative border-2 border-gray-100 shadow-inner">
                            {hasScreen ? (
                                <video 
                                    autoPlay 
                                    muted 
                                    playsInline 
                                    ref={el => { 
                                        if(el) {
                                            const screenTrack = fullSessionStreamRef.current.getVideoTracks().find(t => (t.label || '').toLowerCase().includes('screen') || (t.label || '').toLowerCase().includes('monitor'));
                                            if (screenTrack) el.srcObject = new MediaStream([screenTrack]);
                                        }
                                    }}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                                    <StopCircle size={40} className="opacity-20" />
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">Screen Share Inactive</span>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                                    if (!fullSessionStreamRef.current) {
                                        fullSessionStreamRef.current = new MediaStream();
                                    }
                                    screenStream.getTracks().forEach(t => fullSessionStreamRef.current.addTrack(t));
                                    setStep('lobby-refresh'); setTimeout(() => setStep('lobby'), 10);
                                } catch (e) { setError("Screen share denied."); }
                            }}
                            className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${hasScreen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {hasScreen ? 'Screen Sharing' : 'Share Screen'}
                        </button>
                    </div>
                </div>

                {error && <p className="text-red-500 text-center mb-6 text-sm font-bold uppercase tracking-wider">{error}</p>}

                <button
                    disabled={!hasCamera || !hasScreen}
                    onClick={startInterviewTrigger}
                    className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 ${
                        (hasCamera && hasScreen) ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    Start Interview <ChevronRight size={18} />
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
            <SecureExamWrapper
                examId={`interview:${job._id}:${sessionId || 'pending'}`}
                userId={user.uid}
                isActive={!interviewTerminated && !securityResetting}
                requireScreenShare={false}
                warningLimit={3}
                resetLimit={4}
                onSecurityReset={handleInterviewSecurityReset}
            >
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
                            {/* Webcam Mini View */}
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
                                    <video 
                                        autoPlay 
                                        muted 
                                        playsInline 
                                        ref={el => { 
                                            if(el && fullSessionStreamRef.current) {
                                                const camTrack = fullSessionStreamRef.current.getVideoTracks().find(t => !(t.label || '').toLowerCase().includes('screen') && !(t.label || '').toLowerCase().includes('monitor'));
                                                if (camTrack) el.srcObject = new MediaStream([camTrack]);
                                            }
                                        }}
                                        className="w-full h-full object-cover mirrored"
                                    />
                                    {!fullSessionStreamRef.current && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                                            <Loader size={18} className="text-indigo-400 animate-spin" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Question Section — full question is always visible, no height clipping */}
                    <div className="min-h-[120px] flex flex-col justify-center mb-6 px-6">
                        <AnimatePresence mode="wait">
                            {displayText ? (
                                <motion.div
                                    key={currentQuestion}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                    className="w-full"
                                >
                                    {/* Question number badge */}
                                    <div className="flex justify-center mb-3">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
                                            Question {currentQNum}
                                        </span>
                                    </div>
                                    <p className="text-lg md:text-xl text-gray-900 leading-relaxed font-light tracking-tight text-center whitespace-pre-wrap break-words">
                                        {displayText}
                                    </p>
                                </motion.div>
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
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-8">
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={toggleRecording}
                                disabled={processing || !displayText || coreState === 'speaking'}
                                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${recording
                                    ? 'bg-red-500 text-white shadow-red-500/30'
                                    : (!displayText || coreState === 'speaking') ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-white text-indigo-600 border border-gray-200 hover:bg-indigo-50'
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

                        {/* Transcript Preview — always visible during recording, scrollable for long answers */}
                        <AnimatePresence>
                            {(recording || transcript) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden"
                                >
                                    {/* Transcript header */}
                                    <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                                        {recording && (
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                        )}
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                                            {recording ? 'Live Transcription' : 'Your Answer'}
                                        </span>
                                    </div>
                                    {/* Scrollable transcript body */}
                                    <div className="p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {transcript ? (
                                            <p className="text-sm text-gray-700 font-light leading-relaxed text-left whitespace-pre-wrap break-words">
                                                {transcript}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic text-center">
                                                Listening... Start speaking and your words will appear here.
                                            </p>
                                        )}
                                    </div>
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
            </SecureExamWrapper>
        );
    }

    if (step === 'completed') {
        return (
            <AIInterviewReport
                score={finalScore}
                ownershipScore={ownershipScore}
                feedback={feedback}
                totalQuestions={10}
                attemptedQuestions={currentQNum}
                userId={user.uid}
                jobId={job._id}
                interviewId={sessionId}
                recordingNotice={recordingNotice}
                onDone={() => onComplete({ interviewScore: finalScore })}
            />
        );
    }

    return null;
};

export default AIInterviewFast;
