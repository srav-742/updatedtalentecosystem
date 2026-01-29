import React, { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Loader } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AIInterview = ({ job, user, onComplete }) => {
    const [step, setStep] = useState('loading'); // loading → interview → completed
    const [sessionId, setSessionId] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [currentQNum, setCurrentQNum] = useState(1);

    const [recording, setRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState(null);
    const [finalScore, setFinalScore] = useState(null);
    const [feedback, setFeedback] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    /* ---------------------------------------------
       START INTERVIEW (USE STORED RESUME DATA)
    ----------------------------------------------*/
    useEffect(() => {
        const startInterview = async () => {
            try {
                setError(null);

                const res = await axios.post(
                    `${API_BASE_URL}/api/interview/start`,
                    {
                        jobId: job._id,
                        userId: user.uid
                    },
                    { timeout: 20000 }
                );

                setSessionId(res.data.sessionId);
                setCurrentQuestion(res.data.question);
                setCurrentQNum(1);
                setStep('interview');
            } catch (err) {
                console.error("Interview start failed:", err);
                setError(
                    err.response?.data?.message ||
                    "Resume analysis not found. Please complete resume analysis first."
                );
                // Keep loading state but show error
            }
        };

        if (job?._id && user?.uid) {
            startInterview();
        }
    }, [job._id, user.uid]);

    /* ---------------------------------------------
       RECORD / STOP AUDIO
    ----------------------------------------------*/
    const recognitionRef = useRef(null);

    const toggleRecording = async () => {
        if (recording) {
            // Stop high-quality audio recording
            const recorder = mediaRecorderRef.current;
            if (recorder && recorder.state === 'recording') {
                recorder.stop();
            }

            // Stop live transcription
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }

            setRecording(false);
            setProcessing(true);
            return;
        }

        try {
            // 1. High-quality recording (for backend)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                try {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    const formData = new FormData();
                    formData.append('audio', blob, 'answer.wav');

                    // Final Transcript from Backend (more accurate)
                    const transcribeRes = await axios.post(
                        `${API_BASE_URL}/api/upload-audio`,
                        formData,
                        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 20000 }
                    );

                    const answerText = transcribeRes.data?.text?.trim() || transcript;
                    if (!answerText) {
                        throw new Error("No speech detected. Please speak clearly.");
                    }

                    // Step logic...
                    const nextRes = await axios.post(
                        `${API_BASE_URL}/api/interview/next`,
                        { sessionId, answerText },
                        { timeout: 30000 }
                    );

                    if (!nextRes.data.hasNext) {
                        setFinalScore(nextRes.data.finalScore || 0);
                        setFeedback(nextRes.data.feedback || "Interview completed successfully.");
                        setStep('completed');
                        onComplete({ interviewScore: nextRes.data.finalScore || 0 });
                    } else {
                        setCurrentQuestion(nextRes.data.question);
                        setCurrentQNum(nextRes.data.currentQuestionNumber);
                        setTranscript('');
                        setError(null);
                    }
                } catch (err) {
                    console.error("Answer processing failed:", err);
                    setError(err.response?.data?.message || err.message || "Failed to process your answer.");
                } finally {
                    setProcessing(false);
                }
            };

            // 2. Live Transcription (Web Speech API)
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event) => {
                    let fullTranscript = '';
                    for (let i = 0; i < event.results.length; ++i) {
                        fullTranscript += event.results[i][0].transcript;
                    }
                    setTranscript(fullTranscript);
                };

                recognition.onend = () => {
                    if (recording && recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch (e) { }
                    }
                };

                recognitionRef.current = recognition;
                recognition.start();
            }

            recorder.start();
            setRecording(true);
            setError(null);
            setTranscript('');
        } catch (err) {
            console.error("Microphone error:", err);
            setError("Microphone access denied or unavailable.");
            setProcessing(false);
        }
    };

    /* ---------------------------------------------
       CLEANUP
    ----------------------------------------------*/
    useEffect(() => {
        return () => {
            const recorder = mediaRecorderRef.current;
            if (recorder) {
                try {
                    if (recorder.state !== 'inactive') recorder.stop();
                    recorder.stream?.getTracks().forEach(track => track.stop());
                } catch { }
            }
        };
    }, []);

    // --- UI ---
    if (step === 'loading') {
        return (
            <div className="text-center py-24">
                <Loader className="animate-spin w-8 h-8 mx-auto text-indigo-600" />
                <p className="mt-3 text-gray-600">Preparing your AI Interview based on your resume...</p>
                {error && (
                    <div className="mt-6">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (step === 'interview') {
        return (
            <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
                <div className="bg-indigo-50 p-6 rounded-xl">
                    <p className="text-sm text-indigo-700">
                        Question {currentQNum} / 10
                    </p>
                    <p className="mt-2 text-gray-900">
                        {currentQuestion || "Loading question..."}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border">
                    <p className="text-sm text-gray-600 min-h-[50px]">
                        {transcript
                            ? `"${transcript}"`
                            : recording
                                ? "Recording..."
                                : "Click the mic to answer"}
                    </p>

                    <div className="flex justify-center mt-4">
                        <button
                            onClick={toggleRecording}
                            disabled={processing}
                            className={`p-4 rounded-full transition ${recording ? 'bg-red-500' : 'bg-gray-200'
                                }`}
                        >
                            {recording
                                ? <StopCircle className="w-6 h-6 text-white" />
                                : <Mic className="w-6 h-6 text-gray-700" />
                            }
                        </button>
                    </div>

                    {processing && (
                        <p className="text-center text-sm mt-3 text-indigo-600 flex justify-center items-center">
                            <Loader className="animate-spin w-4 h-4 mr-2" />
                            Processing answer...
                        </p>
                    )}

                    {error && (
                        <p className="text-center text-sm mt-3 text-red-500">
                            {error}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (step === 'completed') {
        return (
            <div className="max-w-md mx-auto text-center py-16">
                <div className="text-5xl font-extrabold text-green-600 mb-4">
                    {finalScore}%
                </div>
                <p className="mb-6 text-gray-700">
                    {feedback}
                </p>
                <button
                    onClick={() => onComplete({ interviewScore: finalScore })}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
                >
                    View Final Report
                </button>
            </div>
        );
    }

    return null;
};

export default AIInterview;
