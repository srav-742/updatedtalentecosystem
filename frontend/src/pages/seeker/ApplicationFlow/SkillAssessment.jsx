import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BookOpenCheck,
    Brain,
    CheckCircle2,
    Clock3,
    Code2,
    FileLock2,
    ListChecks,
    Loader2,
    Play
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../../firebase';
import SecureExamWrapper from '../../../components/exam/SecureExamWrapperEnhanced';

const SkillAssessment = ({
    job,
    user,
    onComplete,
    onBack,
    onSecurityReset,
    sharedStream,
    setSharedStream,
    sharedRecorder,
    setSharedRecorder,
    sharedSessionId,
    setSharedSessionId,
    sharedRecordingSessionId,
    setSharedRecordingSessionId,
    firstQuestionData,
    setFirstQuestionData,
    sharedChunkIndexRef,
    sharedChunkUploadsRef
}) => {
    const [lobbyStarted, setLobbyStarted] = useState(false);
    const [lobbyError, setLobbyError] = useState(null);
    const [started, setStarted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [error, setError] = useState(null);
    const [securityResetting, setSecurityResetting] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const localRecordingSessionIdRef = useRef(null);
    const localRecorderRef = useRef(null);
    const latestStreamRef = useRef(sharedStream);

    // Keep the ref in sync with the latest sharedStream state so async
    // functions (startAssessment) never close over a stale null value.
    useEffect(() => {
        latestStreamRef.current = sharedStream;
    }, [sharedStream]);

    const assessmentType = (job.assessment?.type || 'mcq').toUpperCase();
    const totalQuestions = questions.length || job.assessment?.totalQuestions || 5;
    const estimatedMinutes = Math.max(totalQuestions * 8, 20);

    // Auto-navigate to next step when completed
    useEffect(() => {
        if (score !== null) {
            const timer = setTimeout(() => {
                onComplete(score);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [score, onComplete]);

    const progress = useMemo(() => {
        if (!questions.length) return 0;
        return ((currentQIndex + 1) / questions.length) * 100;
    }, [currentQIndex, questions.length]);

    const enableMedia = async () => {
        try {
            setLobbyError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 },
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            setSharedStream(stream);
        } catch (err) {
            console.error("Camera/Mic access denied:", err);
            setLobbyError("Camera and microphone access are required to proceed.");
        }
    };

    const handleLobbyBack = () => {
        if (sharedStream) {
            sharedStream.getTracks().forEach(t => t.stop());
            setSharedStream(null);
        }
        setLobbyStarted(false);
    };

    const getRecordingMimeType = () => {
        const candidates = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4;codecs=h264,aac',
            'video/mp4'
        ];
        return candidates.find(type => window.MediaRecorder?.isTypeSupported?.(type)) || '';
    };

    const startFullSessionRecording = async (activeStream, activeRecordingSessionId) => {
        try {
            const mimeType = getRecordingMimeType();
            const recorderOptions = mimeType
                ? { mimeType, videoBitsPerSecond: 900000, audioBitsPerSecond: 96000 }
                : { videoBitsPerSecond: 900000, audioBitsPerSecond: 96000 };

            const recordTracks = [];
            const camVideoTrack = activeStream.getVideoTracks().find(t => !(t.label || '').toLowerCase().includes('screen') && !(t.label || '').toLowerCase().includes('monitor'));
            const audioTrack = activeStream.getAudioTracks()[0];

            if (camVideoTrack) recordTracks.push(camVideoTrack);
            if (audioTrack) recordTracks.push(audioTrack);

            const recordStream = new MediaStream(recordTracks);
            
            let fullSessionRecorder;
            try {
                fullSessionRecorder = new MediaRecorder(recordStream, recorderOptions);
            } catch (mimeErr) {
                console.warn("[MediaRecorder] Failed to initialize with options, trying default constructor:", mimeErr);
                fullSessionRecorder = new MediaRecorder(recordStream);
            }

            localRecorderRef.current = fullSessionRecorder;
            setSharedRecorder(fullSessionRecorder);
            sharedChunkIndexRef.current = 0;
            sharedChunkUploadsRef.current = [];

            const uploadChunkWithRetry = async (formData, index, retries = 3) => {
                for (let attempt = 1; attempt <= retries; attempt++) {
                    try {
                        await axios.post(`${API_URL}/upload-recording-chunk`, formData);
                        return;
                    } catch (err) {
                        console.warn(`Chunk ${index} upload attempt ${attempt} failed:`, err);
                        if (attempt === retries) throw err;
                        await new Promise(resolve => setTimeout(resolve, 1500));
                    }
                }
            };

            fullSessionRecorder.ondataavailable = async (event) => {
                if (event.data?.size > 0) {
                    const chunk = event.data;
                    const currentIndex = sharedChunkIndexRef.current;
                    sharedChunkIndexRef.current++;

                    const formData = new FormData();
                    formData.append('sessionId', localRecordingSessionIdRef.current || activeRecordingSessionId);
                    formData.append('chunkIndex', currentIndex);
                    formData.append('chunk', chunk);

                    const uploadPromise = uploadChunkWithRetry(formData, currentIndex);
                    sharedChunkUploadsRef.current.push(uploadPromise);
                }
            };

            fullSessionRecorder.start(30000);
        } catch (err) {
            console.error("Failed to start MediaRecorder:", err);
        }
    };

    const startAssessment = async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Generate full assessment questions
            const res = await axios.post(`${API_URL}/generate-full-assessment`, {
                jobId: job._id,
                userId: user.uid
            });

            if (!Array.isArray(res.data?.questions) || res.data.questions.length === 0) {
                throw new Error('No questions in response');
            }

            // 2. Pre-start interview session if enabled to get recordingSessionId
            let interviewData = null;
            if (job.mockInterview?.enabled) {
                try {
                    const interviewRes = await axios.post(`${API_URL}/interview/start`, {
                        jobId: job._id,
                        userId: user.uid
                    });
                    if (interviewRes.data?.success) {
                        interviewData = interviewRes.data;
                        setSharedSessionId(interviewRes.data.sessionId);
                        setSharedRecordingSessionId(interviewRes.data.recordingSessionId);
                        setFirstQuestionData(interviewRes.data);
                    }
                } catch (interviewErr) {
                    console.warn("Failed to pre-start interview session:", interviewErr);
                }
            }

            // 3. Generate distinct assessmentRecordingSessionId
            const activeRecId = `assessment_${String(user.uid || user._id || 'user').replace(/[^a-zA-Z0-9_-]/g, '')}_${String(job._id).replace(/[^a-zA-Z0-9_-]/g, '')}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            
            localRecordingSessionIdRef.current = activeRecId;
            // 4. Start the assessment recording. Keep the shared interview
            // recording id intact so the next stage saves as AI interview.
            // Use the ref instead of the closure variable to avoid stale null
            const activeStream = latestStreamRef.current;
            if (activeStream) {
                await startFullSessionRecording(activeStream, activeRecId);
            }

            setQuestions(res.data.questions);
            setSessionId(res.data.sessionId);
            setStarted(true);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                'Failed to generate assessment. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (value) => {
        setAnswers((prev) => ({ ...prev, [currentQIndex]: value }));
    };

    const nextQuestion = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex((value) => value + 1);
            return;
        }

        finishAssessment();
    };

    const finishAssessment = async () => {
        setSubmitting(true);
        setError(null);
        let correct = 0;
        const formattedAnswers = [];

        questions.forEach((question, index) => {
            const userAnswer = answers[index];
            let isCorrect = false;

            if (question.type === 'mcq') {
                if (question.options[question.correctAnswer] === userAnswer) {
                    correct += 1;
                    isCorrect = true;
                }
            } else if (question.type === 'coding') {
                if (userAnswer && userAnswer.trim().length > 20) {
                    correct += 1;
                    isCorrect = true;
                }
            }

            formattedAnswers.push({
                userAnswer,
                isCorrect
            });
        });

        const finalScore = Math.round((correct / questions.length) * 20);

        try {
            await axios.post(`${API_URL}/submit-assessment`, {
                jobId: job._id,
                userId: user.uid,
                sessionId,
                questions,
                answers: formattedAnswers
            });
            // Successfully submitted!
            setScore(finalScore);

            // Always stop and finalize assessment recording on assessment complete!
            const recorder = localRecorderRef.current || sharedRecorder;
            const activeRecId = localRecordingSessionIdRef.current || sharedRecordingSessionId;

            if (recorder) {
                recorder.onstop = async () => {
                    try {
                        if (sharedChunkUploadsRef.current.length > 0) {
                            await Promise.allSettled(sharedChunkUploadsRef.current);
                        }
                        if (activeRecId) {
                            await axios.post(`${API_URL}/finalize-recording`, {
                                sessionId: activeRecId,
                                userId: user.uid,
                                jobId: job._id,
                                type: "assessment"
                            });
                        }
                    } catch (err) {
                        console.error("Finalization failed:", err);
                    } finally {
                        setSharedRecorder(null);
                    }
                };
                try {
                    recorder.stop();
                } catch (stopErr) {
                    console.error("Failed to stop recorder:", stopErr);
                }
            }
        } catch (submitError) {
            console.error('Assessment submission failed:', submitError);
            setError(
                submitError.response?.data?.message ||
                submitError.message ||
                'Failed to save your assessment. Please check your connection and try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssessmentSecurityReset = async (violation) => {
        setSecurityResetting(true);

        const activeRecId = localRecordingSessionIdRef.current || sharedRecordingSessionId;
        const recorder = localRecorderRef.current || sharedRecorder;

        if (recorder && recorder.state !== 'inactive') {
            recorder.onstop = async () => {
                try {
                    if (sharedChunkUploadsRef.current.length > 0) {
                        await Promise.allSettled(sharedChunkUploadsRef.current);
                    }
                    if (activeRecId) {
                        await axios.post(`${API_URL}/finalize-recording`, {
                            sessionId: activeRecId,
                            userId: user.uid,
                            jobId: job._id,
                            type: "assessment"
                        });
                    }
                } catch (err) {
                    console.error("Finalization failed on security reset:", err);
                }
            };
            try { recorder.stop(); } catch (_) {}
        }
        if (sharedStream) {
            sharedStream.getTracks().forEach(t => t.stop());
            setSharedStream(null);
        }
        setSharedRecorder(null);
        setSharedSessionId(null);
        setSharedRecordingSessionId(null);
        setFirstQuestionData(null);
        sharedChunkIndexRef.current = 0;
        sharedChunkUploadsRef.current = [];

        try {
            if (sessionId && questions.length > 0) {
                await axios.post(`${API_URL}/submit-assessment`, {
                    jobId: job._id,
                    userId: user.uid,
                    sessionId,
                    questions,
                    answers: [],
                    terminated: true,
                    terminationReason: violation?.detail || 'Assessment security limit exceeded'
                });
            }
        } catch (saveError) {
            console.warn('Failed to save terminated assessment attempt:', saveError);
        }

        await onSecurityReset?.({
            stage: 'assessment',
            reason: violation?.detail || 'Assessment security limit exceeded',
            violation
        });
    };

    if (loading) {
        return (
            <div className="rounded-[2.5rem] border border-black/10 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f3efe6] text-gray-700">
                    <Loader2 size={34} className="animate-spin" />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Preparing your assessment</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                    We are generating role-specific questions based on the recruiter requirements for {job.title}.
                </p>
            </div>
        );
    }

    if (lobbyStarted && !started && score === null) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto py-12 px-8 bg-white border border-black/10 rounded-[2.5rem] shadow-xl"
            >
                <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight text-center">Assessment Setup</h2>
                <p className="text-gray-500 mb-8 font-medium leading-relaxed max-w-md mx-auto text-sm text-center">
                    To ensure the integrity of the skill assessment and the subsequent AI interview, please enable your camera and microphone.
                </p>

                <div className="flex flex-col items-center gap-6 mb-8">
                    <div className="w-full aspect-video bg-gray-900 rounded-3xl overflow-hidden relative border-2 border-gray-100 shadow-inner">
                        {sharedStream ? (
                            <video 
                                autoPlay 
                                muted 
                                playsInline 
                                ref={el => { 
                                    if(el) {
                                        const camTrack = sharedStream.getVideoTracks()[0];
                                        if (camTrack) el.srcObject = new MediaStream([camTrack]);
                                    }
                                }}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                                <AlertCircle size={40} className="opacity-20" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-40">Camera Inactive</span>
                            </div>
                        )}
                    </div>
                    
                    {!sharedStream ? (
                        <button 
                            onClick={enableMedia}
                            className="px-6 py-3 bg-black text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
                        >
                            Enable Camera & Mic
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                            <CheckCircle2 size={18} />
                            <span>Camera and Microphone Active</span>
                        </div>
                    )}
                </div>

                {lobbyError && (
                    <p className="text-red-500 text-center mb-6 text-sm font-bold uppercase tracking-wider">{lobbyError}</p>
                )}

                <div className="flex justify-between gap-4 border-t border-black/10 pt-6">
                    <button
                        onClick={handleLobbyBack}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    <button
                        disabled={!sharedStream}
                        onClick={startAssessment}
                        className={`inline-flex items-center justify-center gap-3 rounded-[2rem] px-10 py-5 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 ${
                            sharedStream ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        Begin Assessment
                        <Play size={18} />
                    </button>
                </div>
            </motion.div>
        );
    }

    if (!started && score === null) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <header className="rounded-[2.25rem] border border-black/10 bg-white px-8 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Skill assessment</p>
                    <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Assessment Center</h1>
                            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500">
                                Complete the next stage of your application through a secure, proctored challenge tailored to the job requirements.
                            </p>
                        </div>
                        <div className="rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-sm font-medium text-gray-700">
                            Stage 3 of 4
                        </div>
                    </div>
                </header>

                <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-[2rem] border border-black/10 bg-[#fbf8f3] p-8">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-white">
                                <Brain size={28} />
                            </div>
                            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900">Ready for the assessment?</h2>
                            <p className="mt-4 text-sm leading-7 text-gray-600">
                                This round checks how well your skills align with the role, then unlocks the next application stage.
                            </p>

                            <div className="mt-8 grid gap-4 md:grid-cols-3">
                                <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                        <ListChecks size={20} />
                                    </div>
                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Format</p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">{assessmentType}</p>
                                </div>
                                <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                        <BookOpenCheck size={20} />
                                    </div>
                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Questions</p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">{totalQuestions}</p>
                                </div>
                                <div className="rounded-[1.5rem] border border-black/10 bg-white p-5">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                        <Clock3 size={20} />
                                    </div>
                                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Estimated time</p>
                                    <p className="mt-2 text-lg font-semibold text-gray-900">{estimatedMinutes} min</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                                <div className="flex items-center gap-3 text-amber-800">
                                    <AlertCircle size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider">Before you start</h3>
                                </div>
                                <ul className="mt-4 space-y-3 text-xs leading-5 text-amber-700/80">
                                    <li className="flex gap-2"><span>•</span> Do not switch tabs or minimize the window.</li>
                                    <li className="flex gap-2"><span>•</span> Ensure you are in a quiet place with stable internet.</li>
                                    <li className="flex gap-2"><span>•</span> Screen sharing and camera must remain active.</li>
                                    <li className="flex gap-2"><span>•</span> Any attempt to copy-paste or search will be logged.</li>
                                </ul>
                            </div>

                            {[
                                {
                                    icon: FileLock2,
                                    title: 'Secure environment',
                                    description: 'Proctoring features remain active throughout the session.'
                                },
                                {
                                    icon: Code2,
                                    title: 'Dynamic Questions',
                                    description: 'AI-generated challenges based on real-world scenarios.'
                                }
                            ].map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div key={item.title} className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-sm">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
                                            <Icon size={20} />
                                        </div>
                                        <h3 className="mt-5 text-xl font-semibold tracking-tight text-gray-900">{item.title}</h3>
                                        <p className="mt-2 text-sm leading-7 text-gray-500">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {error ? (
                        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 md:flex-row md:items-center">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 px-6 py-4 text-sm font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>

                        <button
                            onClick={() => setLobbyStarted(true)}
                            className="inline-flex items-center justify-center gap-3 rounded-[2rem] bg-black px-10 py-5 text-sm font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-gray-800 shadow-2xl active:scale-95"
                        >
                            Start Challenge
                            <Play size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (score !== null) {
        return (
            <SecureExamWrapper
                examId={`assessment:${job._id}:${sessionId || 'pending'}`}
                userId={user.uid}
                isActive={started && !securityResetting}
                requireScreenShare={true}
                requireCamera={true}
                cameraStream={sharedStream}
                isAnswering={false}
                warningLimit={3}
                resetLimit={4}
                onSecurityReset={handleAssessmentSecurityReset}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-[2.5rem] border border-black/10 bg-white p-10 shadow-[0_30px_90px_rgba(15,23,42,0.08)]"
                >
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#eff9ef] text-emerald-600">
                            <CheckCircle2 size={40} />
                        </div>
                        <h2 className="mt-6 text-4xl font-semibold tracking-tight text-gray-900">Assessment completed</h2>
                        <p className="mt-4 text-sm leading-7 text-gray-500">
                            Your responses have been recorded successfully. Continue to the interview stage to complete your application.
                        </p>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Score</p>
                                <p className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">{score}/20</p>
                            </div>
                            <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Questions completed</p>
                                <p className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">{questions.length}</p>
                            </div>
                            <div className="rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 text-left">
                                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">Next stage</p>
                                <p className="mt-3 text-lg font-semibold text-gray-900">AI interview</p>
                            </div>
                        </div>

                        <button
                            onClick={() => onComplete(score)}
                            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                        >
                            Continue to Interview
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </motion.div>
            </SecureExamWrapper>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="rounded-[2.5rem] border border-red-200 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <AlertCircle size={28} />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">No questions loaded</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">Please go back and restart the assessment.</p>
                <button
                    onClick={onBack}
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                    <ArrowLeft size={18} />
                    Go back
                </button>
            </div>
        );
    }

    const question = questions[currentQIndex];

    if (!question || typeof question.question !== 'string') {
        return (
            <div className="rounded-[2.5rem] border border-amber-200 bg-white px-8 py-20 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <AlertCircle size={28} />
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Question data unavailable</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">Use the button below to move to the next question.</p>
                <button
                    onClick={() => setCurrentQIndex((value) => Math.min(value + 1, questions.length - 1))}
                    className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                    Skip to next
                    <ArrowRight size={18} />
                </button>
            </div>
        );
    }

    return (
        <SecureExamWrapper
            examId={`assessment:${job._id}:${sessionId || 'pending'}`}
            userId={user.uid}
            isActive={started && !securityResetting}
            requireScreenShare={true}
            requireCamera={true}
            cameraStream={sharedStream}
            isAnswering={started && !securityResetting}
            warningLimit={3}
            resetLimit={4}
            onSecurityReset={handleAssessmentSecurityReset}
        >
            <motion.div
                key={currentQIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
            >
                <div className="rounded-[2.25rem] border border-black/10 bg-white px-8 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Assessment in progress</p>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{job.title}</h1>
                        </div>
                        <div className="rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-sm font-medium text-gray-700">
                            Question {currentQIndex + 1} of {questions.length}
                        </div>
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/10">
                        <motion.div
                            className="h-full rounded-full bg-black"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f8f4ed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                                {question.type === 'mcq' ? <ListChecks size={14} /> : <Code2 size={14} />}
                                {question.type === 'mcq' ? 'Multiple choice' : 'Coding response'}
                            </div>
                            <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-tight text-gray-900">
                                {question.question}
                            </h2>
                        </div>
                    </div>

                    {question.type === 'mcq' ? (
                        <div className="mt-8 space-y-4">
                            {question.options.map((option, index) => {
                                const isSelected = answers[currentQIndex] === option;

                                return (
                                    <button
                                        key={`${option}-${index}`}
                                        onClick={() => handleAnswer(option)}
                                        className={`w-full rounded-[1.5rem] border px-5 py-5 text-left transition ${isSelected ? 'border-black bg-black text-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]' : 'border-black/10 bg-[#fbf8f3] text-gray-700 hover:border-black/20 hover:bg-[#faf7f1]'}`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${isSelected ? 'bg-white text-black' : 'bg-white text-gray-500 border border-black/10'}`}>
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <p className="text-base leading-7">{option}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="mt-8 space-y-4">
                            <div className="rounded-[1.75rem] border border-black/10 bg-[#111827] p-5 text-sm text-gray-200">
                                <pre className="overflow-x-auto whitespace-pre-wrap font-mono leading-7">
                                    {question.starterCode || '// Write your solution here'}
                                </pre>
                            </div>
                            <textarea
                                className="h-72 w-full rounded-[1.75rem] border border-black/10 bg-[#fbf8f3] p-5 font-mono text-sm leading-7 text-gray-800 outline-none transition focus:border-black/20"
                                value={answers[currentQIndex] || ''}
                                onChange={(event) => handleAnswer(event.target.value)}
                                placeholder="Write your response here..."
                            />
                        </div>
                    )}

                    {error ? (
                        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 animate-pulse">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    ) : null}

                    <div className="mt-8 flex flex-col justify-between gap-4 border-t border-black/10 pt-6 md:flex-row md:items-center">
                        <div className="text-sm text-gray-500">
                            {question.type === 'mcq'
                                ? 'Select the strongest answer before moving forward.'
                                : 'Provide a complete response before continuing.'}
                        </div>

                        <button
                            onClick={nextQuestion}
                            disabled={!answers[currentQIndex] || submitting}
                            className={`inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold transition ${answers[currentQIndex] && !submitting ? 'bg-black text-white hover:bg-gray-800' : 'cursor-not-allowed border border-black/10 bg-gray-100 text-gray-400'}`}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    {currentQIndex === questions.length - 1 ? 'Finish assessment' : 'Next question'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </SecureExamWrapper>
    );
};

export default SkillAssessment;
