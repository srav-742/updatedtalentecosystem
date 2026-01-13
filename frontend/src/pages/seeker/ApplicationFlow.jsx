import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FileUp, Sparkles, CheckCircle2, XCircle, Wand2, Loader2, BrainCircuit, FileText, Upload, Plus, Trash2, GraduationCap, Briefcase, Code, BookOpen, Users, Mic, Video, Volume2, Timer } from 'lucide-react';
import axios from 'axios';
import * as faceapi from 'face-api.js';

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://127.0.0.1:5000";
import { getUserProfile } from '../../firebase';

const ApplicationFlow = () => {
    const { jobId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

    useEffect(() => {
        const syncUser = async () => {
            if (user.uid || user._id || user.id) {
                const freshProfile = await getUserProfile(user.uid || user._id || user.id);
                if (freshProfile && freshProfile.profilePic !== user.profilePic) {
                    console.log("[FLOW] Syncing fresh profile data...");
                    const updated = { ...user, ...freshProfile };
                    setUser(updated);
                    localStorage.setItem('user', JSON.stringify(updated));
                }
            }
        };
        syncUser();
    }, []);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const audioRef = useRef(new Audio());
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const isAdvancingRef = useRef(false);
    const isListeningRef = useRef(false);
    const currentQuestionIdxRef = useRef(0);
    const lastProcessedQuestionId = useRef(null);
    const interviewAnswersRef = useRef({});
    const transcriptAccumulatorRef = useRef(""); // Robust buffer for browser STT

    // Flow State
    const [step, setStep] = useState(1);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stream, setStream] = useState(null);
    const method = searchParams.get('method') || 'upload';

    // Upload & Create State
    const [selectedFile, setSelectedFile] = useState(null);
    const [createData, setCreateData] = useState({
        skills: '',
        education: '',
        experience: '',
        projects: ''
    });

    // Interview & Assessment Global State
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [assessmentStarted, setAssessmentStarted] = useState(false);
    const [interviewQuestions, setInterviewQuestions] = useState([]);
    const [interviewAnswers, setInterviewAnswers] = useState({});

    // Sync state to Ref for closures
    useEffect(() => { interviewAnswersRef.current = interviewAnswers; }, [interviewAnswers]);

    const [interviewActive, setInterviewActive] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [currentAssessmentIdx, setCurrentAssessmentIdx] = useState(0);
    const [qAnalysis, setQAnalysis] = useState(null);
    const [interviewAnalyses, setInterviewAnalyses] = useState({});
    const [analyzingAnswer, setAnalyzingAnswer] = useState(false);
    const [displayedQuestion, setDisplayedQuestion] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [textBeforeSpeech, setTextBeforeSpeech] = useState("");
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState("");
    const [isNoisyTranscript, setIsNoisyTranscript] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isListening, setIsListening] = useState(false);
    const [proctorStatus, setProctorStatus] = useState("SECURE");
    const [thinkingLatency, setThinkingLatency] = useState(0);
    const [questionLatencies, setQuestionLatencies] = useState({});
    const [questionEndTime, setQuestionEndTime] = useState(null);
    const [faceDetectionActive, setFaceDetectionActive] = useState(false);
    const [proctorLogs, setProctorLogs] = useState([]);
    const [waitingForVoice, setWaitingForVoice] = useState(false);
    const [globalTimeLeft, setGlobalTimeLeft] = useState(420);

    const [analysis, setAnalysis] = useState({
        matchPercentage: 0,
        matchedSkills: [],
        missingSkills: [],
        explanation: '',
        assessmentScore: 0,
        interviewScore: 0
    });

    const canvasRef = useRef(null);
    const detectIntervalRef = useRef(null);

    // Sync Refs with state for async callbacks
    useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
    useEffect(() => { currentQuestionIdxRef.current = currentQuestionIdx; }, [currentQuestionIdx]);




    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            setFaceDetectionActive(true);
            startProctoring();
        } catch (err) {
            console.error("Camera Access Error:", err);
            setProctorStatus("HARDWARE_ERROR");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
        setFaceDetectionActive(false);
    };

    const submitAssessment = async () => {
        setLoading(true);
        console.log("Submitting assessment. Context:", { jobId, userId: user?._id || user?.id, analysis, answers });
        try {
            const userId = user.uid || user._id || user.id;
            if (!jobId || !userId) {
                console.error("Missing context:", { jobId, userId, user });
                throw new Error("Missing Application Context (Job or User ID). Please ensure you are logged in.");
            }

            let correctCount = 0;
            const qs = questions.length > 0 ? questions : [];

            qs.forEach((q, i) => {
                const userAnswer = answers[i];
                if (q.options) {
                    // MCQ Scoring
                    if (userAnswer === q.correctAnswer) correctCount++;
                } else {
                    // Coding Scoring (Checking for presence of meaningful code)
                    if (typeof userAnswer === 'string' && userAnswer.trim().length > 20) {
                        correctCount++;
                    }
                }
            });

            const score = Math.round((correctCount / (qs.length || 1)) * 100);
            console.log("Calculated Combined Score:", score);

            // Sync analysis state and proceed
            const updatedAnalysis = { ...analysis, assessmentScore: score };
            setAnalysis(updatedAnalysis);

            if (job?.mockInterview?.enabled) {
                console.log("Flow: Redirecting to Interview Step...");
                await startInterview();
            } else {
                console.log("Flow: Finalizing directly...");
                const matchPct = updatedAnalysis.matchPercentage || 0;
                const final = Math.round((matchPct + score) / 2);

                const applicationData = {
                    jobId,
                    userId: user.uid || user._id || user.id,
                    applicantName: user.name,
                    applicantEmail: user.email,
                    applicantPic: user.profilePic,
                    resumeMatchPercent: matchPct,
                    assessmentScore: score,
                    status: final >= (job.minPercentage || 50) ? 'SHORTLISTED' : 'ELIGIBLE',
                    finalScore: final
                };

                await axios.post(`${API_BASE_URL}/api/applications`, applicationData);
                setStep(6);
            }
        } catch (error) {
            console.error('Submission Error Details:', error);
            alert('CRITICAL: Assessment submission failed. ' + (error.response?.data?.message || error.message));
        } finally { setLoading(false); }
    };

    const startProctoring = async () => {
        console.log("[PROCTOR] Loading Neural Models...");
        try {
            // Load from CDN if local /models missing
            const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            console.log("[PROCTOR] Neural Face Sync: ACTIVE");

            detectIntervalRef.current = setInterval(async () => {
                if (videoRef.current && faceDetectionActive) {
                    const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());

                    if (detections.length === 0) {
                        updateProctorStatus("NO_FACE_DETECTED", "Candidate not visible in frame.");
                    } else if (detections.length > 1) {
                        updateProctorStatus("MULTIPLE_FACES", "Multiple identities detected in session.");
                    } else {
                        setProctorStatus("SECURE");
                    }
                }
            }, 4000); // Optimized to 4s to reduce main thread blocking
        } catch (err) {
            console.error("[PROCTOR] Model Load Failed:", err);
        }
    };

    const updateProctorStatus = (status, log) => {
        setProctorStatus(status);
        setProctorLogs(prev => [...prev.slice(-4), { time: new Date().toLocaleTimeString(), message: log }]);
    };


    // Effect to trigger question flow when index changes
    useEffect(() => {
        if (interviewActive && interviewQuestions.length > 0) {
            const currentQ = interviewQuestions[currentQuestionIdx];
            if (currentQ) {
                // HIDE question initially
                setDisplayedQuestion("");
                setWaitingForVoice(true);

                // Fetch Voice -> Then Show Text
                speakQuestion(currentQ).then(() => {
                    // This creates the type-writer effect only AFTER voice starts (or fallback)
                    // The actual state update happens inside speakQuestion's play callback or fallback
                });
            }
            setQuestionEndTime(Date.now());
        }
    }, [currentQuestionIdx, interviewActive, interviewQuestions]);


    const speakQuestion = async (text) => {
        try {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();

            // 1. Try AI Voice
            const res = await axios.post(`${API_BASE_URL}/api/tts`, { text });

            if (res.data.audioUrl) {
                audioRef.current.src = `${API_BASE_URL}${res.data.audioUrl}?t=${Date.now()}`;

                // EVENT: When audio *actually* starts playing, show the text
                audioRef.current.onplay = () => {
                    setWaitingForVoice(false);
                    setDisplayedQuestion(text);
                    setQuestionEndTime(Date.now() + (audioRef.current.duration * 1000));
                };

                // EVENT: Auto-Start Mic when audio finishes (The Loop)
                audioRef.current.onended = () => {
                    console.log("[Loop] AI finished speaking. Opening neural link...");
                    if (!isListeningRef.current) {
                        try { toggleListening(); } catch (e) { console.error("Mic Auto-Start Failed", e); }
                    }
                };

                await audioRef.current.play();
            } else {
                throw new Error("No URL");
            }
        } catch (error) {
            console.warn("AI Voice Failed, using System Voice. Syncing text immediately.");
            setWaitingForVoice(false);
            setDisplayedQuestion(text);
            triggerNativeSpeech(text);
        }
    };

    const triggerNativeSpeech = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.pitch = 1.0;
            utterance.rate = 1.1;

            // Critical Sync: Only show text when browser voice ACTUALLY starts
            utterance.onstart = () => {
                setWaitingForVoice(false);
                setDisplayedQuestion(text);
                setQuestionEndTime(Date.now() + (text.length * 50));
            };

            // Loop: Auto-Mic
            utterance.onend = () => {
                console.log("[Loop] Native Voice finished. Opening neural link...");
                if (!isListeningRef.current) {
                    try { toggleListening(); } catch (e) { console.error("Mic Auto-Start Failed", e); }
                }
            };

            window.speechSynthesis.speak(utterance);
        }
    };

    // AI Proctoring removed logic placeholder was here - Logic is restored above

    // GLOBAL SESSION TIMER (10 Minute Cap)
    useEffect(() => {
        let globalTimer;
        if (interviewActive && globalTimeLeft > 0 && !qAnalysis) {
            globalTimer = setInterval(() => {
                setGlobalTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (globalTimeLeft === 0 && interviewActive) {
            console.warn("[SESSION] 7-Minute Hard Stop Triggered.");
            // Force finish
            setQAnalysis({ isMatch: true, feedback: "Session Time Exceeded. Auto-submitting logs.", score: 75 });
            setAnalyzingAnswer(false);
        }
        return () => clearInterval(globalTimer);
    }, [interviewActive, globalTimeLeft, qAnalysis]);


    // TIMER LOGIC: 60s countdown for each question
    useEffect(() => {
        let timer;
        // Proceed if active and not in a transition state
        if (interviewActive && !isTyping && !analyzingAnswer && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && !analyzingAnswer) {
            console.log("[TIMER] Time's up! Auto-proceeding to next node...");
            handleAnalyzeAnswer();
        }
        return () => clearInterval(timer);
    }, [interviewActive, isTyping, timeLeft, analyzingAnswer]);

    useEffect(() => {
        let interval;
        let initialDelay;

        if (interviewActive && interviewQuestions.length > 0) {
            const rawQ = interviewQuestions[currentQuestionIdx];
            const currentQ = typeof rawQ === 'string' ? rawQ : (rawQ?.question || "Error loading question.");

            setDisplayedQuestion("");
            setIsTyping(true);
            setTimeLeft(60); // Reset timer for new question
            // console.log("[DEBUG] Resetting Timer to 180s");

            initialDelay = setTimeout(() => {
                speakQuestion(currentQ);

                let i = 0;
                interval = setInterval(() => {
                    setDisplayedQuestion(currentQ.slice(0, i + 1));
                    i++;
                    if (i >= currentQ.length) {
                        clearInterval(interval);
                        setIsTyping(false);
                        setQuestionEndTime(Date.now()); // Mark when question ended
                    }
                }, 40); // Slightly faster typing for better UX
            }, 800);
        }

        return () => {
            if (initialDelay) clearTimeout(initialDelay);
            if (interval) clearInterval(interval);
        };
    }, [currentQuestionIdx, interviewActive, interviewQuestions]);

    // Safety: Auto-cleanup
    useEffect(() => {
        return () => {
            if (isListening) setIsListening(false);
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        };
    }, []);



    // Backend-integrated Transcription + Live Local Preview
    const toggleListening = async () => {
        const activeIdx = currentQuestionIdxRef.current;
        if (!isListeningRef.current) {
            try {
                const s = stream || await navigator.mediaDevices.getUserMedia({ audio: true });
                setStream(s);

                setStream(s);

                // Save starting text to avoid duplication later
                setTextBeforeSpeech(interviewAnswersRef.current[activeIdx] || '');
                transcriptAccumulatorRef.current = interviewAnswersRef.current[activeIdx] || ''; // Initialize Buffer
                setIsNoisyTranscript(false); // Reset on new recording

                // Track Thinking Latency
                if (questionEndTime) {
                    const latency = (Date.now() - questionEndTime) / 1000;
                    setThinkingLatency(latency);
                    setQuestionLatencies(prev => ({ ...prev, [activeIdx]: latency }));
                    console.log(`[ELITE-METRIC] Thinking Latency for Q${activeIdx + 1}: ${latency}s`);
                }

                // 1. Live Browser Transcription (LAYER 2: UI FEEDBACK ONLY)
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    recognitionRef.current = new SpeechRecognition();
                    recognitionRef.current.continuous = true;
                    recognitionRef.current.interimResults = true;
                    recognitionRef.current.lang = 'en-US';

                    recognitionRef.current.onstart = () => console.log("[STT] Browser Recognition Active for Node:", activeIdx);
                    recognitionRef.current.onerror = (e) => {
                        console.error("[STT] Browser Recognition Error:", e.error);
                    };

                    recognitionRef.current.onend = () => {
                        // Auto-restart if we are still explicitly listening and not submitting
                        if (isListeningRef.current && !isAdvancingRef.current) {
                            console.log("[STT] Recognition stopped (silence/network). Auto-restarting...");
                            try { recognitionRef.current.start(); } catch (e) { console.warn("Restart failed", e); }
                        }
                    };

                    recognitionRef.current.onresult = (event) => {
                        let finalPart = '';
                        let interimPart = '';
                        const qIdx = currentQuestionIdxRef.current;

                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            const transcript = event.results[i][0].transcript;
                            if (event.results[i].isFinal) {
                                finalPart += transcript;
                            } else {
                                interimPart += transcript;
                            }
                        }

                        if (finalPart) {
                            console.log(`[STT] Final Segment Captured for Q${qIdx}: ${finalPart}`);
                            // 1. Robust Ref Accumulation (Sync)
                            transcriptAccumulatorRef.current = (transcriptAccumulatorRef.current + " " + finalPart).trim();

                            // 2. React State Update (Async/Laggy)
                            setInterviewAnswers(prev => {
                                const existing = prev[qIdx] || '';
                                return { ...prev, [qIdx]: (existing + ' ' + finalPart).trim() };
                            });
                        }

                        setInterimTranscript(interimPart);
                    };

                    try {
                        recognitionRef.current.start();
                    } catch (startError) {
                        console.error("[STT] Failed to start Recognition:", startError);
                    }
                }

                // 2. High-Quality Audio Capture (LAYER 1: RAW BUFFER)
                const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                if (audioContext.state === 'suspended') await audioContext.resume();
                const source = audioContext.createMediaStreamSource(s);
                const processor = audioContext.createScriptProcessor(4096, 1, 1);
                const pcmDataStore = [];

                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    pcmDataStore.push(new Float32Array(inputData));
                };

                source.connect(processor);
                processor.connect(audioContext.destination);
                console.log("[STT] Audio Pipeline Engaged:", audioContext.state);

                mediaRecorderRef.current = {
                    stop: async () => {
                        console.log("[STT] Sequence: Stopping mic, flushing buffer...");
                        await new Promise(resolve => setTimeout(resolve, 500));

                        source.disconnect();
                        processor.disconnect();
                        audioContext.close();

                        if (recognitionRef.current) {
                            recognitionRef.current.stop();
                            setInterimTranscript("");
                        }

                        const flatData = flattenArray(pcmDataStore);
                        if (flatData.length === 0) {
                            console.warn("[STT] No audio data in buffer. Fallback to Layer 2.");
                            const browserFallback = interviewAnswersRef.current[activeIdx] || "";
                            if (!isAdvancingRef.current) handleAnalyzeAnswer(browserFallback);
                            return browserFallback;
                        }

                        const normalizedData = normalizeAudio(flatData);
                        const wavBuffer = encodeWAV(normalizedData, 16000);
                        const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });

                        return await finishRecording(audioBlob);
                    }
                };

                setIsListening(true);
                isListeningRef.current = true;
            } catch (err) {
                console.error("Mic Access Error:", err);
                alert("Microphone access denied.");
            }
        } else {
            setIsListening(false);
            isListeningRef.current = false;
            if (mediaRecorderRef.current) {
                return await mediaRecorderRef.current.stop();
            }
        }
    };

    const normalizeAudio = (samples) => {
        let max = 0;
        for (let i = 0; i < samples.length; i++) {
            const abs = Math.abs(samples[i]);
            if (abs > max) max = abs;
        }
        if (max > 0.01) { // Only normalize if there's actually sound
            const multiplier = 0.8 / max; // Aim for 80% peak
            for (let i = 0; i < samples.length; i++) {
                samples[i] *= multiplier;
            }
        }
        return samples;
    };

    const flattenArray = (chunks) => {
        const length = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Float32Array(length);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return result;
    };

    const encodeWAV = (samples, sampleRate) => {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 32 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);

        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        return buffer;
    };

    const finishRecording = async (audioBlob, attempt = 1) => {
        const activeIdx = currentQuestionIdxRef.current;
        setIsProcessingAudio(true);
        console.log(`[STT-FINAL] Initiating Layer 3 transcription (Attempt ${attempt}) for Node: ${activeIdx}...`);

        try {
            const currentText = interviewAnswersRef.current[activeIdx] || '';
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');

            // Layer 3: High-Accuracy Final Transcription (Non-streaming)
            const res = await axios.post(`${API_BASE_URL}/api/upload-audio`, formData);

            // Validate output (Don't expose internal errors to UI)
            const transcribed = (res.data.text && !res.data.text.includes("[Transcription Failed]")) ? res.data.text : "";

            // If empty and first attempt, maybe a hiccup, let's retry once as requested
            if (transcribed === "" && attempt === 1) {
                console.warn("[STT-FINAL] Empty result, retrying once...");
                return finishRecording(audioBlob, 2);
            }

            let finalOutput = (textBeforeSpeech + ' ' + transcribed).trim();

            // Layer 4: Mandatory AI Refinement (Polishing for Interview Depth)
            const textToRefine = finalOutput.length > 5 ? finalOutput : currentText;

            if (textToRefine.length > 5) {
                console.log("[STT-FINAL] Layer 4: Refining for interview-readiness...");
                try {
                    const refineRes = await axios.post(`${API_BASE_URL}/api/refine-text`, {
                        text: textToRefine,
                        jobTitle: job.title
                    });

                    if (refineRes.data.refinedText && !refineRes.data.isNoisy) {
                        finalOutput = refineRes.data.refinedText;
                        setIsNoisyTranscript(false);
                    } else if (refineRes.data.isNoisy) {
                        setIsNoisyTranscript(true);
                    }
                } catch (refineError) {
                    console.warn("[STT-FINAL] Refinement failed, using raw transcription:", refineError);
                    // Keep finalOutput as is (Raw STT)
                }
            } else if (transcribed === "" && currentText.length > 5) {
                finalOutput = currentText; // Preservation
            }

            // LAYER 3/4 MERGE: MAXIMIZE DATA RETENTION
            // We compare 3 sources and pick the LONGEST one to ensure no part of a lengthy answer is lost.
            const backendText = finalOutput;
            const refText = transcriptAccumulatorRef.current || "";
            const stateText = interviewAnswersRef.current[activeIdx] || "";

            console.log(`[STT-MERGE] Length Check - Backend: ${backendText.length}, Ref: ${refText.length}, State: ${stateText.length}`);

            // Sort by length descending
            const candidates = [backendText, refText, stateText];
            candidates.sort((a, b) => b.length - a.length);

            const chosenText = candidates[0]; // Pick the longest
            console.log("[STT-MERGE] Selected Source Length:", chosenText.length);

            // Sync state
            setInterviewAnswers(prev => ({ ...prev, [activeIdx]: chosenText }));

            console.log("[STT-FINAL] Final transcript secured.");

            // AUTO-ADVANCE: If recording stopped and we aren't already moving
            if (!isAdvancingRef.current) {
                console.log("[STT-FINAL] Triggering automatic progression...");
                handleAnalyzeAnswer(chosenText);
            }

            return chosenText;

        } catch (error) {
            console.error("Transcription Pipeline Error:", error);
            // On catastrophic failure, preserve whatever we have
            const fallback = interviewAnswersRef.current[activeIdx] || "";
            setInterviewAnswers(prev => ({ ...prev, [activeIdx]: fallback }));
        } finally {
            setIsProcessingAudio(false);
            setInterimTranscript("");
        }
    };

    // AUTO-FLOW LOGIC: Removed as progression is now handled directly by handleAnalyzeAnswer
    // to prevent race conditions with STT pipeline.

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/jobs`);
                const found = res.data.find(j => j._id === jobId);
                setJob(found);
            } catch (error) { console.error(error); }
        };
        fetchJob();
    }, [jobId]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
        } else {
            alert("Please upload a valid PDF file.");
        }
    };

    const handleAnalyze = async () => {
        if (!job) {
            alert("Protocol Error: Job data is still synchronizing. Please wait a moment.");
            return;
        }
        setStep(2);
        try {
            let resumeText = '';

            if (method === 'upload') {
                if (!selectedFile) {
                    alert("Please select a file first.");
                    setStep(1);
                    return;
                }
                // Extract text from PDF
                const formData = new FormData();
                formData.append('resume', selectedFile);
                const extractRes = await axios.post(`${API_BASE_URL}/api/extract-pdf`, formData);
                resumeText = extractRes.data.text;
            } else {
                // Combine create data
                resumeText = `
                    Skills: ${createData.skills}
                    Education: ${createData.education}
                    Experience: ${createData.experience}
                    Projects: ${createData.projects}
                `;
            }

            // Analyze with Gemini
            const res = await axios.post(`${API_BASE_URL}/api/analyze-resume`, {
                resumeText,
                jobSkills: job.skills,
                userId: user.uid || user._id || user.id
            });
            setAnalysis(res.data);

            // Immediate Popup for Missing Skills
            if (res.data.missingSkills && res.data.missingSkills.length > 0) {
                let msg = `Analysis Complete: ${res.data.matchPercentage}% Match.\n\nMissing Skills Detected:`;
                if (res.data.missingSkillsDetails && res.data.missingSkillsDetails.length > 0) {
                    msg += '\n' + res.data.missingSkillsDetails.map(d => `- ${d.skill}: ${d.message}`).join('\n');
                } else {
                    msg += '\n- ' + res.data.missingSkills.join('\n- ');
                }
                alert(msg);
            } else {
                alert(`Analysis Complete: ${res.data.matchPercentage}% Match.\n\nGreat job! Your profile matches all key requirements.`);
            }

            // Save application
            await axios.post(`${API_BASE_URL}/api/applications`, {
                jobId,
                userId: user._id || user.id,
                resumeMatchPercent: res.data.matchPercentage,
                matchedSkills: res.data.matchedSkills,
                missingSkills: res.data.missingSkills,
                status: 'APPLIED'
            });

            setStep(3);
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.message || error.response?.data?.details || "Analysis failed. Please try again.";
            alert(`Error: ${errorMsg}`);
            setStep(1);
        }
    };

    const renderResumeStep = () => {
        if (method === 'upload') {
            return (
                <div className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Upload Resume</h2>
                        <p className="text-gray-500 font-medium">Select your professional PDF file for AI auditing.</p>
                    </div>

                    <div
                        onClick={() => fileInputRef.current.click()}
                        className={`p-16 rounded-[3rem] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-6 group
                            ${selectedFile ? 'bg-teal-500/5 border-teal-500/50' : 'bg-white/[0.02] border-white/10 hover:border-teal-500/30 hover:bg-white/[0.04]'}
                        `}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" className="hidden" />
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${selectedFile ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-gray-500 group-hover:text-teal-400'}`}>
                            {selectedFile ? <CheckCircle2 size={40} /> : <Upload size={40} />}
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-black uppercase tracking-tight">
                                {selectedFile ? selectedFile.name : 'Click to Browse Files'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2 font-black uppercase tracking-widest">
                                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Limit 5MB • PDF Only'}
                            </p>
                        </div>
                    </div>

                    <button
                        disabled={!selectedFile}
                        onClick={handleAnalyze}
                        className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-xl
                            ${selectedFile ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-teal-500/20' : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'}
                        `}
                    >
                        <BrainCircuit size={18} /> Analyze Selected Resume
                    </button>

                    <div className="text-center">
                        <button
                            onClick={() => navigate(`/seeker/apply/${jobId}?method=create`)}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-teal-400 transition-colors"
                        >
                            Don't have a resume? Create one instead
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Create Digital Resume</h2>
                    <p className="text-gray-500 font-medium">Build your profile ledger to match with {job?.title}.</p>
                </div>

                <div className="p-8 rounded-[3rem] bg-white/[0.03] border border-white/5 shadow-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <Code size={14} /> Technical Skills
                            </label>
                            <textarea
                                value={createData.skills}
                                onChange={(e) => setCreateData({ ...createData, skills: e.target.value })}
                                placeholder="e.g. React, Node.js, Solidity, AWS..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <GraduationCap size={14} /> Education History
                            </label>
                            <textarea
                                value={createData.education}
                                onChange={(e) => setCreateData({ ...createData, education: e.target.value })}
                                placeholder="Degree, University, Graduation Year..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <Briefcase size={14} /> Work Experience
                            </label>
                            <textarea
                                value={createData.experience}
                                onChange={(e) => setCreateData({ ...createData, experience: e.target.value })}
                                placeholder="Role, Company, Years, Achievements..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 ml-2">
                                <BookOpen size={14} /> Projects & Labs
                            </label>
                            <textarea
                                value={createData.projects}
                                onChange={(e) => setCreateData({ ...createData, projects: e.target.value })}
                                placeholder="Hackathons, Side Projects, Web3 Contributions..."
                                className="w-full h-32 p-5 bg-[#0a0c12] border border-white/5 rounded-2xl text-xs leading-relaxed text-gray-300 outline-none focus:border-teal-500/30 transition-all resize-none font-medium"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleAnalyze}
                        className="w-full mt-4 py-5 rounded-[2rem] bg-teal-500 text-white font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3"
                    >
                        <Wand2 size={18} /> Generate & Analyze Profile
                    </button>
                </div>

                <div className="text-center">
                    <button
                        onClick={() => navigate(`/seeker/apply/${jobId}?method=upload`)}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-teal-400 transition-colors"
                    >
                        Already have a PDF? Upload instead
                    </button>
                </div>
            </div>
        );
    };


    const startAssessment = async () => {
        setLoading(true);
        try {
            console.log("[FLOW] Initiating expert unified assessment generation...");
            const res = await axios.post(`${API_BASE_URL}/api/generate-full-assessment`, {
                jobTitle: job.title,
                jobSkills: job.skills,
                jobDescription: job.description,
                candidateSkills: analysis.matchedSkills,
                experienceLevel: (job.minExperience > 5) ? 'Senior' : (job.minExperience > 2 ? 'Mid-Level' : 'Junior'),
                assessmentType: job.assessment?.type || 'MCQ',
                totalQuestions: job.assessment?.totalQuestions || 10,
                userId: user.uid || user._id || user.id
            });

            if (res.data) {
                // Combine MCQs and Coding into the main questions array for Page 4
                const allAssessmentQs = [
                    ...(res.data.mcq || []),
                    ...(res.data.coding || [])
                ];

                setQuestions(allAssessmentQs);

                // Store interview questions for Page 5
                const interviewData = Array.isArray(res.data.interview) ? res.data.interview : [];
                let formattedInterview = interviewData.map(q => {
                    if (typeof q === 'string') return q;
                    if (q?.question) return `${q.question}${q.followUp ? ` (Follow-up: ${q.followUp})` : ''}`;
                    return "Describe your approach to learning new technologies.";
                });

                // Enforce exactly 5 questions
                if (formattedInterview.length < 5) {
                    const fallbacks = [
                        "Walk me through a technical challenge you solved recently.",
                        "How do you ensure your code is scalable and maintainable?",
                        "Describe your typical workflow when debugging complex systems.",
                        "What is your approach to collaboration in a remote team?",
                        "How do you stay updated with industry trends?"
                    ];
                    formattedInterview = [...formattedInterview, ...fallbacks].slice(0, 5);
                }
                setInterviewQuestions(formattedInterview);

                setAssessmentStarted(true);
                setCurrentAssessmentIdx(0);
                setCurrentQuestionIdx(0);
                setAnswers({});
                setInterviewAnswers({});
            } else {
                throw new Error("Invalid assessment structure received");
            }
        } catch (error) {
            console.error("Expert Assessment Failure:", error);

            // Professional Multi-Question Fallback
            const fallbackSkills = job.skills.length > 0 ? job.skills : ['Technical Strategy'];
            const templates = [
                (s) => `In an enterprise ${s} environment, which strategy ensures maximum horizontal scalability?`,
                (s) => `What is the most critical security vulnerability to address for a production-grade ${s} implementation?`,
                (s) => `Which design pattern is best suited for decouplng business logic in a ${s} system?`,
                (s) => `How should state management be handled in a distributed ${s}-heavy architecture?`,
                (s) => `Identify the optimal structural pattern for high-concurrency modules using ${s}.`
            ];

            const fallbackQs = Array.from({ length: job.assessment?.totalQuestions || 5 }, (_, i) => {
                const skill = fallbackSkills[i % fallbackSkills.length];
                const optTemplates = [
                    ["Modular Decoupling", "Monolithic State", "Direct Bonding", "Manual Locking"],
                    ["SQL Injection Mitigation", "Code Refactoring", "UI Polish", "Unit Testing"],
                    ["Connection Pooling", "Single Connection", "Global Variable", "File System DB"],
                    ["Microservices", "Monolith", "Serverless", "Desktop App"],
                    ["Dockerization", "Standard ZIP", "Direct Upload", "Manual Copy"]
                ];
                const template = templates[i % templates.length];
                const options = optTemplates[i % optTemplates.length];

                return {
                    title: `${skill} Advanced Assessment`,
                    question: template(skill),
                    options: [...options].sort(() => Math.random() - 0.5),
                    correctAnswer: 0,
                    explanation: `Deep technical knowledge of ${skill} is essential for this role.`
                };
            });

            setQuestions(fallbackQs);
            const dynamicInterviewFallback = [
                `Could you walk me through your technical experience with ${fallbackSkills[0] || 'the core technology'}?`,
                `Describe a complex scenario where you implemented ${fallbackSkills[1] || 'a key skill'} to solve a problem.`,
                "How do you ensure system scalability and performance in high-traffic environments?",
                "Tell me about a time you had to manage a technical conflict or lead a team through a challenge.",
                "What is your philosophy on maintainable code and the future of this tech stack?"
            ];

            setInterviewQuestions(dynamicInterviewFallback);
            setAssessmentStarted(true);
        } finally { setLoading(false); }
    };

    const handleAnswerSelect = (qIdx, oIdx) => {
        setAnswers({ ...answers, [qIdx]: oIdx });
    };

    const startInterview = async () => {
        console.log("[FLOW] Initializing Elite Interview Sequence. Fetching fresh questions...");

        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/generate-interview-questions`, {
                skills: analysis?.matchedSkills || job.skills,
                jobTitle: job.title,
                jobDescription: job.description,
                userId: user.uid || user._id || user.id
            });

            if (Array.isArray(res.data) && res.data.length >= 5) {
                // Sanitize: Remove "1. ", "2. " from start of questions
                const cleanQs = res.data.map(q => {
                    const txt = typeof q === 'string' ? q : (q.question || "");
                    return txt.replace(/^\d+[\.\)]\s*/, '');
                });
                setInterviewQuestions(cleanQs);
            } else {
                // Secondary fallback
                if (interviewQuestions.length < 5) {
                    const fallbackQs = [
                        `Walk me through a technical challenge you solved recently involving ${job.title}.`,
                        "How do you ensure your systems are scalable and maintainable?",
                        "Describe your typical workflow when debugging complex systems.",
                        "What is your approach to collaboration in an elite team?",
                        "How do you stay updated with industry trends?"
                    ];
                    setInterviewQuestions(fallbackQs);
                }
            }
            setCurrentQuestionIdx(0);
            setStep(5);
            setInterviewActive(true);
            startCamera();
        } catch (error) {
            console.error("Interview Resume Fallback Error:", error);
            if (interviewQuestions.length < 1) {
                setInterviewQuestions(["Tell me about your experience.", "How do you handle pressure?", "Describe a success.", "Why this role?", "Future goals?"]);
            }
            setStep(5);
            setInterviewActive(true);
            startCamera();
        } finally { setLoading(false); }
    };



    const handleAnalyzeAnswer = async (overriddenAnswer = null) => {
        const activeIdx = currentQuestionIdxRef.current;

        // Strict Guard: Prevent double-submission or entry during transitions
        if (isAdvancingRef.current || (activeIdx === lastProcessedQuestionId.current && !overriddenAnswer)) {
            return;
        }

        // LOCK: Claim ownership of the transition immediately to prevent recursive triggers
        isAdvancingRef.current = true;
        lastProcessedQuestionId.current = activeIdx;
        setAnalyzingAnswer(true);

        console.log(`[FLOW] Handling Answer Submission for Node ${activeIdx}...`);

        // 1. Capture Base Answer (State + Interim + Accumulator Ref)
        let currentBest = overriddenAnswer;

        if (!currentBest) {
            // Priority: Accumulator Ref (Sync) > State (Async)
            const refVal = transcriptAccumulatorRef.current || "";
            const stateVal = interviewAnswersRef.current[activeIdx] || "";
            const baseVal = refVal.length > stateVal.length ? refVal : stateVal;

            // Append interim text if it exists and isn't already there
            if (interimTranscript && !baseVal.trim().endsWith(interimTranscript.trim())) {
                console.log("[FLOW] Capturing interim text before mic stop:", interimTranscript);
                currentBest = (baseVal + " " + interimTranscript).trim();
            } else {
                currentBest = baseVal;
            }
        }

        // 2. Handle Active Mic (Stop & Retrieve High-Quality Transcript)
        if (isListeningRef.current && !overriddenAnswer) {
            console.log("[FLOW] Mic active during submission. Stopping and fetching backend result...");
            try {
                // This call will returns the result from finishRecording
                // Because isAdvancingRef is now true, finishRecording will NOT auto-call handleAnalyzeAnswer
                const micResult = await toggleListening();

                // Merge Strategy: Prefer Backend Result if significant
                if (micResult && micResult.length >= (currentBest || "").length) {
                    console.log("[FLOW] Using Backend/Mic Result over Interim.");
                    currentBest = micResult;
                }
            } catch (err) {
                console.error("[FLOW] Error stopping mic during submit:", err);
            }
        }

        const finalAnswer = (currentBest || "").trim();

        // 3. Update State & Ref Final Force
        const updatedAnswers = { ...interviewAnswersRef.current, [activeIdx]: finalAnswer };
        setInterviewAnswers(updatedAnswers);
        interviewAnswersRef.current = updatedAnswers;

        console.log(`[FLOW] Finalizing Node ${activeIdx} with content:`, finalAnswer ? `"${finalAnswer.substring(0, 50)}..."` : "[NO RESPONSE]");

        // 4. Trigger UI Progression (Fast DB Save is below)
        const currentQuestion = interviewQuestions[activeIdx];
        const rawText = typeof currentQuestion === 'string' ? currentQuestion : (currentQuestion?.question || "");

        // Fast progression (800ms)
        setTimeout(() => {
            if (activeIdx < interviewQuestions.length - 1) {
                console.log(`[FLOW] Moving from Node ${activeIdx + 1} to ${activeIdx + 2}`);
                setCurrentQuestionIdx(prev => prev + 1);
                setTimeLeft(60);
                setInterimTranscript("");
                setAnalyzingAnswer(false);
                isAdvancingRef.current = false; // RELEASE LOCK
                lastProcessedQuestionId.current = null;
            } else {
                console.log("[FLOW] Last Question Captured. Auto-finalizing...");
                handleInterviewSubmit(updatedAnswers);
                // Note: We don't release lock here as we are moving to next step
            }
        }, 800);

        // 5. Backend Persistence & Audit
        try {
            // Incremental Save
            await axios.post(`${API_BASE_URL}/api/applications/interview-answer`, {
                jobId,
                userId: user.uid || user._id || user.id,
                question: rawText,
                answer: finalAnswer || "No response recorded"
            });
            console.log("[STT-STORE] Incremental save successful");

            // Fetch Real-time Feedback
            const auditRes = await axios.post(`${API_BASE_URL}/api/validate-answer`, {
                question: rawText,
                answer: finalAnswer,
                jobTitle: job.title,
                userId: user.uid || user._id || user.id
            });

            if (auditRes.data) {
                setInterviewAnalyses(prev => ({ ...prev, [activeIdx]: { ...auditRes.data, answer: finalAnswer } }));
            }

        } catch (e) {
            console.error("[STT-STORE] Audit/Save failed:", e);
        }
    };



    const handleInterviewSubmit = async (finalAnswersOverride = null) => {
        setLoading(true);
        const targetAnswers = finalAnswersOverride || interviewAnswersRef.current;

        try {
            const rawQs = interviewQuestions.map(q => typeof q === 'string' ? q : q.question);
            const res = await axios.post(`${API_BASE_URL}/api/analyze-interview`, {
                answers: targetAnswers,
                questions: rawQs,
                skills: job.skills,
                userId: user.uid || user._id || user.id,
                metrics: {
                    latencies: questionLatencies,
                    averageLatency: Object.values(questionLatencies).reduce((a, b) => a + b, 0) / (Object.keys(questionLatencies).length || 1),
                    proctorStatus: proctorStatus
                }
            });

            const interviewScore = res.data.interviewScore;

            // Map individual details to interviewAnalyses for display in Step 6
            if (res.data.details) {
                const mappedAnalyses = {};
                res.data.details.forEach((d, idx) => {
                    mappedAnalyses[idx] = d;
                });
                setInterviewAnalyses(mappedAnalyses);
            }

            const final = Math.round((analysis.matchPercentage + (analysis.assessmentScore || 0) + interviewScore) / 3);

            // Set results visible immediately
            const visibleAt = new Date();

            setAnalysis(prev => ({
                ...prev,
                interviewScore: interviewScore,
                finalScore: final,
                resultsVisibleAt: visibleAt // Track this locally
            }));

            await axios.post(`${API_BASE_URL}/api/applications`, {
                jobId,
                userId: user.uid || user._id || user.id,
                applicantName: user.name,
                applicantEmail: user.email,
                applicantPic: user.profilePic,
                resumeMatchPercent: analysis.matchPercentage,
                assessmentScore: analysis.assessmentScore,
                interviewScore: interviewScore,
                interviewAnswers: res.data.details || [],
                status: final >= (job.minPercentage || 50) ? 'SHORTLISTED' : 'ELIGIBLE',
                finalScore: final,
                resultsVisibleAt: visibleAt // Save to DB
            });
            stopCamera(); // Cleanup
            setStep(6);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setAnalyzingAnswer(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-10 px-4">
            {/* Progress Bar */}
            <div className="flex items-center justify-between mb-16 px-4">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                    <div key={s} className={`flex flex-col items-center relative flex-1 ${(!job?.mockInterview?.enabled && s === 5) ? 'hidden' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 z-10 ${step >= s ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-white/5 text-gray-600 border border-white/5'}`}>
                            {step > s ? <CheckCircle2 size={16} /> : s}
                        </div>
                        {s < 6 && (
                            <div className="absolute top-4 left-1/2 w-full h-[2px] bg-white/5 -z-0">
                                <div className={`h-full bg-teal-500 transition-all duration-500 ${step > s ? 'w-full' : 'w-0'}`} />
                            </div>
                        )}
                        <span className={`text-[8px] uppercase font-black tracking-widest mt-3 transition-colors ${step >= s ? 'text-teal-400' : 'text-gray-600'}`}>
                            {s === 1 ? 'Resume' : s === 2 ? 'Analysis' : s === 3 ? 'Eligible' : s === 4 ? 'Assessment' : s === 5 ? 'Interview' : 'Final'}
                        </span>
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div key="1" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                        {renderResumeStep()}
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div key="2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center space-y-8">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-teal-500/20 rounded-full" />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute inset-0 border-4 border-transparent border-t-teal-500 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles size={40} className="text-teal-400" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Analyzing Your Ledger...</h2>
                            <p className="text-gray-500 font-medium">Running AI match against {job?.skills.length} target skills.</p>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div key="3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        <div className={`relative p-12 rounded-[4rem] border transition-all duration-700 overflow-hidden ${analysis?.matchPercentage >= (job?.minPercentage || 50) ? 'bg-teal-500/5 border-teal-500/20 shadow-2xl shadow-teal-500/10' : 'bg-red-500/5 border-red-500/20 shadow-2xl shadow-red-500/10'}`}>
                            {/* Decorative background glow */}
                            <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-20 ${analysis?.matchPercentage >= (job?.minPercentage || 50) ? 'bg-teal-500' : 'bg-red-500'}`} />

                            <div className="relative z-10 text-center space-y-10">
                                {analysis?.matchPercentage >= (job?.minPercentage || 50) ? (
                                    <>
                                        <div className="space-y-8">
                                            <div className="flex flex-col items-center justify-center relative">
                                                {/* Circular Progress */}
                                                <div className="relative w-48 h-48 mb-6">
                                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                                                        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent" className="text-teal-900/20" />
                                                        <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent"
                                                            strokeDasharray={2 * Math.PI * 80}
                                                            strokeDashoffset={2 * Math.PI * 80 - (analysis.matchPercentage / 100) * 2 * Math.PI * 80}
                                                            className="text-teal-500 transition-all duration-1000 ease-out"
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <CheckCircle2 size={32} className="text-teal-400 mb-2" />
                                                        <span className="text-5xl font-black text-white tracking-tighter">{analysis.matchPercentage}%</span>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-500/80 mt-1">Match Success</span>
                                                    </div>
                                                </div>
                                                <h2 className="text-4xl font-black tracking-tight uppercase mb-4 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent italic">Protocol: ELIGIBLE</h2>
                                            </div>
                                            <p className="text-gray-400 font-medium max-w-xl mx-auto leading-relaxed text-lg italic">"{analysis.explanation}"</p>
                                        </div>

                                        {/* Missing Skills Warning Block */}
                                        {analysis.missingSkills && analysis.missingSkills.length > 0 && (
                                            <div className="max-w-lg mx-auto p-6 rounded-3xl bg-yellow-500/5 border border-yellow-500/10 text-left space-y-3">
                                                <div className="flex items-center gap-3 text-yellow-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest">Skill Gap Detected</h3>
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                                    The following required nodes were not explicitly found in your ledger:
                                                </p>
                                                {analysis.missingSkillsDetails && analysis.missingSkillsDetails.length > 0 ? (
                                                    <div className="space-y-2 w-full mt-2">
                                                        {analysis.missingSkillsDetails.map((item, i) => (
                                                            <div key={i} className="flex gap-3 items-start bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/10 text-left">
                                                                <div className="min-w-[4px] h-[4px] mt-1.5 rounded-full bg-yellow-500" />
                                                                <div className="flex-1">
                                                                    <div className="text-[10px] font-bold uppercase tracking-wide text-yellow-400 mb-0.5">{item.skill}</div>
                                                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{item.message}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {analysis.missingSkills.map((skill, i) => (
                                                            <span key={i} className="px-3 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold uppercase tracking-wide">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setStep(4)}
                                            className="w-full mt-10 py-7 rounded-[2.5rem] bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-3xl shadow-teal-500/20 border border-white/10"
                                        >
                                            Initiate Phase 02: Skill Verification
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-10 py-10">
                                        <div className="flex flex-col items-center justify-center relative">
                                            {/* Circular Progress */}
                                            <div className="relative w-48 h-48 mb-6">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                                                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent" className="text-red-900/20" />
                                                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="15" fill="transparent"
                                                        strokeDasharray={2 * Math.PI * 80}
                                                        strokeDashoffset={2 * Math.PI * 80 - (analysis.matchPercentage / 100) * 2 * Math.PI * 80}
                                                        className="text-red-500 transition-all duration-1000 ease-out"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <XCircle size={32} className="text-red-400 mb-2" />
                                                    <span className="text-5xl font-black text-white tracking-tighter">{analysis.matchPercentage}%</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/80 mt-1">Match Failed</span>
                                                </div>
                                            </div>
                                            <h2 className="text-4xl font-black tracking-tight uppercase mb-4 text-white">Entry Denied</h2>
                                        </div>
                                        <p className="text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">System requires a minimum of {job?.minPercentage || 50}% compatibility. Current profile ledger lacks critical skill nodes required for this position.</p>

                                        {/* Missing Skills Warning for Rejected State */}
                                        {analysis.missingSkills && analysis.missingSkills.length > 0 && (
                                            <div className="max-w-lg mx-auto p-6 rounded-3xl bg-red-500/5 border border-red-500/10 text-left space-y-3">
                                                <div className="flex items-center gap-3 text-red-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                    <h3 className="text-[10px] font-black uppercase tracking-widest">Critical Skill Gaps</h3>
                                                </div>
                                                {analysis.missingSkillsDetails && analysis.missingSkillsDetails.length > 0 ? (
                                                    <div className="space-y-2 w-full mt-2">
                                                        {analysis.missingSkillsDetails.map((item, i) => (
                                                            <div key={i} className="flex gap-3 items-start bg-red-500/10 p-3 rounded-xl border border-red-500/10 text-left">
                                                                <div className="min-w-[4px] h-[4px] mt-1.5 rounded-full bg-red-500" />
                                                                <div className="flex-1">
                                                                    <div className="text-[10px] font-bold uppercase tracking-wide text-red-400 mb-0.5">{item.skill}</div>
                                                                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{item.message}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {analysis.missingSkills.map((skill, i) => (
                                                            <span key={i} className="px-3 py-1 rounded-lg bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wide">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => navigate('/seeker/jobs')}
                                            className="px-12 py-5 rounded-[2rem] bg-white/5 border border-white/5 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 hover:text-white transition-all"
                                        >
                                            Return to Headquarters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 4 && (
                    <motion.div key="4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                        {/* Header / Progress */}
                        <div className="flex items-center justify-between mb-8 px-4">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Technical Assessment</h2>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Job Core Verification</p>
                            </div>
                            <div className="flex items-center gap-3 overflow-x-auto max-w-md no-scrollbar py-2">
                                {questions.map((_, i) => (
                                    <div key={i} className={`h-1.5 min-w-[32px] rounded-full transition-all flex-shrink-0 ${i === currentAssessmentIdx ? 'bg-teal-500' : i < currentAssessmentIdx ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                                ))}
                            </div>
                        </div>

                        {!assessmentStarted ? (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="max-w-md w-full p-10 rounded-[3rem] bg-white/[0.03] border border-white/5 text-center space-y-6">
                                    <div className="py-20 border-2 border-dashed border-white/10 rounded-[2rem] bg-black/20">
                                        <BrainCircuit size={48} className="text-teal-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold uppercase mb-2">Module Initialized</h3>
                                        <p className="text-gray-500 text-sm italic">5 Dynamic Challenges Prepared</p>
                                    </div>
                                    <button onClick={startAssessment} className="w-full py-5 rounded-[2rem] bg-teal-500 text-white font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20">
                                        {loading ? <Loader2 className="animate-spin mx-auto" /> : "Start Assessment"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden min-h-0">
                                {/* Left Side: Statement */}
                                <div className="lg:w-1/2 flex flex-col bg-[#0a0c12] border border-white/5 rounded-[2.5rem] overflow-hidden">
                                    <div className="flex border-b border-white/5 bg-white/[0.02]">
                                        <div className="px-8 py-4 border-b-2 border-teal-500 text-teal-500 text-[10px] font-black uppercase tracking-widest bg-teal-500/5">Statement</div>
                                        <div className="px-8 py-4 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-gray-300 cursor-not-allowed">AI Help</div>
                                    </div>
                                    <div className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar">
                                        <div>
                                            <h3 className="text-2xl font-bold text-white mb-2">{questions[currentAssessmentIdx]?.title || questions[currentAssessmentIdx]?.question || "Technical Challenge"}</h3>
                                            <p className="text-gray-400 leading-relaxed font-medium">{questions[currentAssessmentIdx]?.problem || (questions[currentAssessmentIdx]?.title ? questions[currentAssessmentIdx]?.question : "") || "Select the most appropriate answer for this scenario:"}</p>
                                        </div>

                                        {(questions[currentAssessmentIdx]?.codeSnippet || questions[currentAssessmentIdx]?.starterCode) ? (
                                            <div className="relative group">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/20 to-blue-500/20 rounded-3xl blur opacity-25" />
                                                <pre className="relative p-8 bg-black rounded-3xl border border-white/10 font-mono text-sm text-emerald-400 overflow-x-auto">
                                                    <code>{questions[currentAssessmentIdx].codeSnippet || questions[currentAssessmentIdx].starterCode}</code>
                                                </pre>
                                            </div>
                                        ) : !questions[currentAssessmentIdx]?.options && (
                                            <div className="p-10 border border-dashed border-white/10 rounded-3xl bg-white/5 flex flex-col items-center justify-center text-center">
                                                <Code className="text-gray-600 mb-2" size={32} />
                                                <p className="text-xs text-gray-500 uppercase tracking-widest font-black">No snippet available for this task</p>
                                            </div>
                                        )}

                                        {/* Optional Video-like hint area */}
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400"><Sparkles size={18} /></div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Analyze the code structure carefully before selecting.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Interaction */}
                                <div className="lg:w-1/2 flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
                                    <div className="p-10 bg-[#0a0c12] border border-white/5 rounded-[2.5rem] space-y-8">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                            {questions[currentAssessmentIdx]?.options ? "Pick the correct option:" : "Enter your solution code:"}
                                        </h4>
                                        <div className="space-y-4">
                                            {questions[currentAssessmentIdx]?.options ? (
                                                questions[currentAssessmentIdx].options.map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleAnswerSelect(currentAssessmentIdx, i)}
                                                        className={`w-full p-6 rounded-2xl text-left transition-all border flex items-center gap-6 group ${answers[currentAssessmentIdx] === i ? 'bg-teal-500 border-teal-400 shadow-lg shadow-teal-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/20'}`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black transition-all ${answers[currentAssessmentIdx] === i ? 'bg-white text-teal-600 border-white' : 'bg-white/5 border-white/10 text-gray-500 group-hover:text-white'}`}>{String.fromCharCode(65 + i)}</div>
                                                        <span className={`font-bold transition-colors ${answers[currentAssessmentIdx] === i ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                            {typeof opt === 'object' ? (opt.text || opt.a || JSON.stringify(opt)) : opt}
                                                        </span>
                                                    </button>
                                                ))
                                            ) : (
                                                <textarea
                                                    value={answers[currentAssessmentIdx] || ''}
                                                    onChange={(e) => handleAnswerSelect(currentAssessmentIdx, e.target.value)}
                                                    placeholder="// Type your code solution here..."
                                                    className="w-full h-64 p-6 bg-black/50 border border-white/10 rounded-2xl outline-none focus:border-teal-500/50 transition-all font-mono text-xs text-teal-400 resize-none"
                                                />
                                            )}
                                        </div>

                                        <div className="pt-6 border-t border-white/5">
                                            <details className="group cursor-pointer">
                                                <summary className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-open:rotate-180 transition-transform"><Plus size={14} /></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">See Hint / Logic</span>
                                                </summary>
                                                <div className="mt-6 p-6 rounded-2xl bg-teal-500/5 border border-teal-500/10 text-xs text-teal-400/80 leading-relaxed italic">
                                                    {questions[currentAssessmentIdx]?.explanation || "Analyze the core architectural requirements and consider edge-case performance impacts for this specific technical domain."}
                                                </div>
                                            </details>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Footer */}
                                <div className="flex items-center gap-4 mt-auto">
                                    <button
                                        onClick={() => {
                                            if (currentAssessmentIdx > 0) setCurrentAssessmentIdx(prev => prev - 1);
                                        }}
                                        disabled={currentAssessmentIdx === 0}
                                        className="px-10 py-5 rounded-[2rem] bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        Previous
                                    </button>

                                    {currentAssessmentIdx < questions.length - 1 ? (
                                        <button
                                            onClick={() => {
                                                if (!answers[currentAssessmentIdx] && answers[currentAssessmentIdx] !== 0) {
                                                    alert("Please provide an answer to continue.");
                                                    return;
                                                }
                                                setCurrentAssessmentIdx(prev => prev + 1);
                                            }}
                                            className="flex-1 py-5 rounded-[2rem] bg-teal-500 text-white font-black uppercase tracking-widest text-xs hover:bg-teal-600 transition-all shadow-xl shadow-teal-500/20"
                                        >
                                            Submit & Next
                                        </button>
                                    ) : (
                                        <button
                                            onClick={submitAssessment}
                                            className="flex-1 py-5 rounded-[2rem] bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black uppercase tracking-widest text-xs hover:shadow-emerald-500/30 transition-all shadow-xl shadow-emerald-500/10"
                                        >
                                            Finalize Result
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 5 && (
                    <motion.div key="5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-4xl font-black uppercase tracking-tighter text-purple-400 leading-none">AI Video <span className="text-white">Audit</span></h2>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic shadow-sm">Phase 05: Behavioral & Technical Verification</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-3 px-6 py-2 rounded-full border border-white/10 ${globalTimeLeft < 60 ? 'bg-red-500/20 animate-pulse' : 'bg-white/5'}`}>
                                    <div className={`w-2 h-2 rounded-full ${globalTimeLeft < 60 ? 'bg-red-500' : 'bg-teal-500'}`} />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none font-mono">
                                        Session: {Math.floor(globalTimeLeft / 60)}:{(globalTimeLeft % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                                    <Users size={16} className="text-purple-400" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">1-on-1 Session</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">
                            {/* PROCTORING SIDEBAR */}
                            <div className="lg:w-1/4 space-y-6">
                                <div className="p-6 rounded-[2.5rem] bg-black/40 border border-white/10 shadow-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Neural Proctor</h4>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${proctorStatus === 'SECURE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                    </div>

                                    {/* Mini Video Feed */}
                                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/5">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-60" />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                            {proctorStatus !== 'SECURE' && (
                                                <div className="bg-red-500/80 p-2 rounded-lg">
                                                    <XCircle size={16} className="text-white mx-auto" />
                                                    <p className="text-[8px] font-black text-white uppercase mt-1">Integrity Alert</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                            <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Live Sync</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                            <p className="text-[8px] font-black text-gray-600 uppercase">Current Status</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-wide ${proctorStatus === 'SECURE' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {proctorStatus.replace(/_/g, ' ')}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[8px] font-black text-gray-600 uppercase ml-1">Neuro-Logs</p>
                                            {proctorLogs.map((log, i) => (
                                                <div key={i} className="flex gap-2 text-[8px] font-medium leading-tight">
                                                    <span className="text-gray-700 tabular-nums">{log.time}</span>
                                                    <span className="text-gray-400">{log.message}</span>
                                                </div>
                                            ))}
                                            {proctorLogs.length === 0 && (
                                                <p className="text-[8px] text-gray-700 italic ml-1">Initializing ledger...</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 rounded-[2rem] bg-purple-500/5 border border-purple-500/10 space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400/60">Elite Metrics</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-black/20 border border-white/5">
                                            <span className="text-[8px] font-black text-gray-500 uppercase">Thinking Latency</span>
                                            <span className="text-[10px] font-black text-purple-400">{thinkingLatency.toFixed(2)}s</span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-black/20 border border-white/5">
                                            <span className="text-[8px] font-black text-gray-500 uppercase">Linguistic Refinement</span>
                                            <span className={`text-[8px] font-black uppercase ${isNoisyTranscript ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {isNoisyTranscript ? 'Noisy' : 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MAIN AREA: Question & Answer */}
                            <div className="flex-1 flex flex-col gap-8">
                                <div className="p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-700">
                                        <BrainCircuit size={80} />
                                    </div>
                                    <div className="relative z-10 space-y-6 text-center">
                                        <div className="flex items-center justify-center gap-4">
                                            <span className="px-4 py-1.5 rounded-xl bg-purple-500 text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-purple-500/20">Interviewer Node {currentQuestionIdx + 1}/{interviewQuestions.length || 5}</span>
                                            <div className="h-[1px] w-12 bg-white/10"></div>

                                            {!qAnalysis && !isTyping && (
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 ${timeLeft <= 10 ? 'border-red-500/40 bg-red-500/10 text-red-500' : 'border-white/10 bg-white/5 text-purple-400'}`}>
                                                    <Timer size={12} className={timeLeft <= 10 ? 'animate-pulse' : ''} />
                                                    <span className="text-[10px] font-black tracking-widest">{timeLeft}s</span>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-3xl font-black text-white leading-[1.1] tracking-tight min-h-[4rem]">
                                            {waitingForVoice ? (
                                                <span className="animate-pulse text-purple-400">Establishing Neural Link...</span>
                                            ) : (
                                                `"${displayedQuestion || "Initializing Protocol..."}"`
                                            )}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <div className="relative group">
                                        <textarea
                                            placeholder={currentQuestionIdx < interviewQuestions.length - 1 ? "Capture your response... (Speak or Type)" : "Final Node. Finalize your response to commit results."}
                                            value={(interviewAnswers[currentQuestionIdx] || '') + (interimTranscript ? (interviewAnswers[currentQuestionIdx] ? ' ' : '') + interimTranscript : '')}
                                            onChange={(e) => setInterviewAnswers(prev => ({ ...prev, [currentQuestionIdx]: e.target.value }))}
                                            disabled={analyzingAnswer}
                                            className={`w-full min-h-[220px] p-8 bg-[#050505] border rounded-[2.5rem] outline-none transition-all text-sm font-medium text-white shadow-2xl resize-none leading-relaxed ${analyzingAnswer ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 focus:border-purple-500/40'}`}
                                        />

                                        {isProcessingAudio && (
                                            <div className="absolute top-6 right-6 flex items-center gap-3 px-4 py-2 rounded-2xl bg-purple-500 border border-purple-400 shadow-xl animate-pulse z-20">
                                                <Loader2 size={10} className="animate-spin text-white" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-white">Neural Fine-Tuning...</span>
                                            </div>
                                        )}

                                        {!analyzingAnswer && !isTyping && (
                                            <button
                                                onClick={toggleListening}
                                                className={`absolute right-6 bottom-6 w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-2xl group ${isListening ? 'bg-red-500 text-white scale-110' : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95'}`}
                                            >
                                                {isListening ? <div className="w-3 h-3 bg-white rounded-sm animate-pulse" /> : <Mic size={20} />}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex gap-4">
                                        {!analyzingAnswer ? (
                                            <button
                                                onClick={() => handleAnalyzeAnswer()}
                                                disabled={analyzingAnswer || isProcessingAudio || isListening}
                                                className={`flex-1 py-5 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.2em] text-[9px] hover:bg-gray-200 transition-all shadow-2xl ${analyzingAnswer || isProcessingAudio || isListening ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                                            >
                                                {currentQuestionIdx < interviewQuestions.length - 1 ? 'Capture Answer & Continue' : 'Capture Final Response'}
                                            </button>
                                        ) : (
                                            <div className="flex-1 py-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black uppercase tracking-[0.2em] text-[9px] flex items-center justify-center gap-2 animate-pulse">
                                                <CheckCircle2 size={12} />
                                                Syncing Neural Response...
                                            </div>
                                        )}
                                    </div>

                                    {false && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`p-10 rounded-[2.5rem] border-2 shadow-2xl space-y-4 relative overflow-hidden ${qAnalysis.isMatch ? 'bg-teal-500/10 border-teal-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${qAnalysis.isMatch ? 'bg-teal-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                        {qAnalysis.score}%
                                                    </div>
                                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${qAnalysis.isMatch ? 'text-teal-400' : 'text-amber-400'}`}>
                                                        AI Audit Feedback
                                                    </h4>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${qAnalysis.isMatch ? 'bg-teal-500' : 'bg-amber-500'}`} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Live Evaluation</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-gray-300 font-medium leading-relaxed italic">"{qAnalysis.feedback}"</p>

                                            {/* Progressing indicator */}
                                            <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-[3500ms] w-full origin-left scale-x-0 group-data-[state=active]:scale-x-100" />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Audit Footer Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-1 lg:pl-[25%]">
                            {[
                                { l: 'Status', v: 'Encrypted', c: 'text-teal-500' },
                                { l: 'Sync', v: 'Neural Sync Active', c: 'text-purple-500' },
                                { l: 'Proctor', v: proctorStatus, c: proctorStatus === 'SECURE' ? 'text-indigo-500' : 'text-red-500' },
                                { l: 'Network', v: 'Fiber-L0', c: 'text-emerald-500' }
                            ].map(i => (
                                <div key={i.l} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center">
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 mb-1">{i.l}</p>
                                    <p className={`text-xs font-black uppercase tracking-widest ${i.c}`}>{i.v}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 6 && (
                    <motion.div key="6" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center max-w-4xl mx-auto">
                        <div className="p-16 rounded-[4rem] bg-[#050505] border border-white/10 text-white relative overflow-hidden shadow-3xl">
                            <div className="relative z-10 space-y-12">
                                <div className="flex items-center gap-4 p-4 border-b border-white/5">
                                    {user.profilePic ? (
                                        <img src={user.profilePic} alt="Candidate" className="w-12 h-12 rounded-full object-cover border border-blue-500/30" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-lg text-blue-400 border border-blue-400/20">
                                            {user.name?.[0] || 'C'}
                                        </div>
                                    )}
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-sm truncate uppercase tracking-tighter">{user.name || 'Candidate'}</p>
                                        <p className="text-[10px] text-gray-500 tracking-widest font-black opacity-60">IDENTITY VERIFIED</p>
                                    </div>
                                </div>
                                {/* Results (Immediate Release) */}
                                <div className="space-y-12">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {[
                                            { l: 'Resume Match', v: `${analysis.matchPercentage}%`, c: 'text-purple-400' },
                                            { l: 'Skills Test', v: `${analysis.assessmentScore}%`, c: 'text-indigo-400' },
                                            { l: 'AI Interview', v: `${analysis.interviewScore || '0'}%`, c: 'text-teal-400' },
                                            { l: 'Aggregate Rating', v: `${analysis.finalScore || '0'}%`, c: 'text-white' }
                                        ].map(stat => (
                                            <div key={stat.l} className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 flex flex-col items-center justify-center space-y-2">
                                                <p className="text-[7px] uppercase font-black text-gray-600 tracking-[0.2em]">{stat.l}</p>
                                                <p className={`text-2xl font-black ${stat.c}`}>{stat.v}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {Object.keys(interviewAnalyses).length > 0 && (
                                        <div id="interview-report" className="space-y-6 text-left bg-black/40 p-10 rounded-[3rem] border border-white/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-teal-400">📄 Interview Report (Auto-Generated)</h4>
                                                <button
                                                    onClick={() => window.print()}
                                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 print:hidden"
                                                >
                                                    <FileText size={12} /> Print Report
                                                </button>
                                            </div>
                                            <div className="space-y-6">
                                                {interviewQuestions.map((q, idx) => {
                                                    const anal = interviewAnalyses[idx];
                                                    const qText = typeof q === 'string' ? q : q.question;
                                                    return (
                                                        <div key={idx} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4">
                                                            <div className="flex items-start gap-6">
                                                                <div className={`mt-1 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-lg ${anal?.score >= 75 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                                                    {anal?.score || 0}%
                                                                </div>
                                                                <div className="space-y-4 w-full">
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Technical Question</p>
                                                                        <p className="text-sm font-bold text-white leading-relaxed italic opacity-90">"{qText}"</p>
                                                                    </div>

                                                                    <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-400 mb-2">Candidate Response</p>
                                                                        <p className="text-xs text-gray-300 leading-relaxed font-medium">{anal?.answer || interviewAnswers[idx] || "No response recorded."}</p>
                                                                    </div>

                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-teal-500 mb-2">AI Audit Feedback</p>
                                                                        <p className={`text-[11px] font-medium leading-relaxed ${anal?.score >= 75 ? 'text-gray-400' : 'text-amber-400/80'}`}>
                                                                            {anal?.feedback || "System was unable to perform detailed audit for this node."}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button onClick={() => navigate('/seeker/applications')} className="w-full py-7 rounded-[2.5rem] bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] hover:bg-gray-200 transition-all shadow-2xl active:scale-95">
                                    Exit Application Hub
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ApplicationFlow;
