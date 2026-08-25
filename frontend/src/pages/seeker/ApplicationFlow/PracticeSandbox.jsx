import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Video, CheckCircle, AlertTriangle, Play } from 'lucide-react';

const PracticeSandbox = ({ onComplete }) => {
    const videoRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const animationFrameRef = useRef(null);
    const recognitionRef = useRef(null);

    const [stream, setStream] = useState(null);
    const [hasPermissions, setHasPermissions] = useState(false);
    const [permissionError, setPermissionError] = useState(null);
    const [volume, setVolume] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [wordsSpoken, setWordsSpoken] = useState(0);

    // Initialize Camera and Mic
    useEffect(() => {
        const initMedia = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(mediaStream);
                setHasPermissions(true);
                
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }

                // Audio level visualization
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                audioContextRef.current = audioCtx;
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;
                
                const source = audioCtx.createMediaStreamSource(mediaStream);
                source.connect(analyser);
                
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                dataArrayRef.current = dataArray;

                const draw = () => {
                    if (!analyserRef.current || !dataArrayRef.current) return;
                    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                    
                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArrayRef.current[i];
                    }
                    const average = sum / bufferLength;
                    
                    // Normalize volume for easier UI rendering (0 to 100)
                    setVolume(Math.min(100, Math.round((average / 256) * 200)));
                    
                    animationFrameRef.current = requestAnimationFrame(draw);
                };
                
                draw();

            } catch (err) {
                console.error("Error accessing media devices.", err);
                setPermissionError("Camera and microphone access are required for the AI Interview. Please allow permissions in your browser.");
            }
        };

        initMedia();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let currentInterim = '';
                let newFinal = '';
                
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        newFinal += event.results[i][0].transcript;
                    } else {
                        currentInterim += event.results[i][0].transcript;
                    }
                }
                
                setInterimText(currentInterim);
                
                if (newFinal) {
                    setTranscript(prev => {
                        const fullText = (prev + " " + newFinal).trim();
                        setWordsSpoken(fullText.split(/\s+/).filter(w => w.length > 0).length);
                        return fullText;
                    });
                }
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                }
            };
            
            recognition.onend = () => {
                // Auto-restart if we haven't unmounted and are supposed to be listening
                if (isListening && hasPermissions) {
                    try { recognition.start(); } catch(e) {}
                }
            };

            recognitionRef.current = recognition;
            
            if (hasPermissions) {
                try {
                    recognition.start();
                    setIsListening(true);
                } catch (e) {}
            }
        }
    }, [hasPermissions, isListening]);
    
    // UI Helpers
    const volumeBars = Array.from({ length: 20 }).map((_, i) => {
        const active = volume > (i * 5);
        return (
            <div 
                key={i} 
                className={`w-2 rounded-full transition-all duration-75 ${
                    active 
                    ? (i > 15 ? 'bg-red-500' : i > 10 ? 'bg-yellow-500' : 'bg-green-500') 
                    : 'bg-gray-200'
                }`}
                style={{ height: active ? `${Math.max(20, (i + 1) * 3)}px` : '10px' }}
            />
        );
    });

    const isReady = wordsSpoken > 0 && hasPermissions;

    return (
        <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center overflow-hidden">
            <div className="w-full p-8 text-center bg-indigo-50/50 border-b border-indigo-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Pre-Interview System Check</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Let's make sure your camera and microphone are working perfectly before you begin the real AI Interview. 
                    Please say a few words to test the transcription.
                </p>
            </div>

            <div className="w-full p-8">
                {permissionError && (
                    <div className="w-full mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold">Permissions Denied</h4>
                            <p className="text-sm">{permissionError}</p>
                        </div>
                    </div>
                )}

                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Video Column */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <CheckCircle className={`w-5 h-5 ${hasPermissions ? 'text-green-500' : 'text-gray-300'}`} />
                            Camera Preview
                        </div>
                        <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video relative shadow-inner border border-gray-200 flex items-center justify-center">
                            {!hasPermissions && !permissionError && (
                                <div className="text-gray-400 flex flex-col items-center gap-3">
                                    <Video className="w-8 h-8 opacity-50" />
                                    <span className="text-sm font-medium">Requesting camera access...</span>
                                </div>
                            )}
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted
                                className={`w-full h-full object-cover ${!hasPermissions ? 'hidden' : ''}`} 
                            />
                        </div>
                    </div>

                    {/* Audio & Transcript Column */}
                    <div className="flex flex-col gap-6">
                        {/* Audio Level */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <CheckCircle className={`w-5 h-5 ${volume > 5 ? 'text-green-500' : 'text-gray-300'}`} />
                                Microphone Level
                            </div>
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-center">
                                <div className="flex items-end justify-center gap-[3px] h-16 w-full max-w-[300px]">
                                    {volumeBars}
                                </div>
                            </div>
                        </div>

                        {/* Transcription */}
                        <div className="flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <CheckCircle className={`w-5 h-5 ${wordsSpoken > 0 ? 'text-green-500' : 'text-gray-300'}`} />
                                Speech Transcription Test
                            </div>
                            <div className="flex-1 bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col">
                                <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 text-gray-700 min-h-[120px] text-sm overflow-y-auto leading-relaxed shadow-sm">
                                    {transcript || interimText ? (
                                        <p>
                                            {transcript}
                                            <span className="text-gray-400 italic"> {interimText}</span>
                                        </p>
                                    ) : (
                                        <span className="text-gray-400 italic">Say something like, "Hello, testing my microphone..."</span>
                                    )}
                                </div>
                                {wordsSpoken > 0 && (
                                    <div className="mt-4 text-sm text-green-600 font-semibold flex items-center gap-2 bg-green-50 p-2 px-3 rounded-lg w-fit border border-green-100">
                                        <CheckCircle className="w-4 h-4" /> Speech detected successfully
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full bg-gray-50 p-6 border-t border-gray-100 flex justify-end">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        // Stop tracks immediately before proceeding
                        if (stream) {
                            stream.getTracks().forEach(track => track.stop());
                        }
                        onComplete();
                    }}
                    className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all shadow-md ${
                        isReady 
                        ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg' 
                        : 'bg-indigo-500 hover:bg-indigo-600'
                    }`}
                >
                    {isReady ? <Play className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" />}
                    Everything Looks Good - Start Interview
                </motion.button>
            </div>
        </div>
    );
};

export default PracticeSandbox;
