import React, { useState, useRef, useEffect } from 'react';
import { Video, StopCircle, RefreshCcw, Check, Loader, AlertCircle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import axios from 'axios';
import { API_URL } from '../../../firebase';

const CandidateDeck = ({ job, user, onComplete }) => {
    const [step, setStep] = useState('ready'); // ready -> recording -> reviewing -> uploading -> success
    const [recording, setRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [videoBlob, setVideoBlob] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [error, setError] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Stop recording when component unmounts
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = () => {
        setStep('recording');
        setRecording(true);
        setTimeLeft(60);
        chunksRef.current = [];

        const stream = webcamRef.current.stream;
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp8,opus'
        });

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunksRef.current.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setVideoBlob(blob);
            setVideoUrl(url);
            setStep('reviewing');
            setRecording(false);
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    stopRecording();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const handleRetake = () => {
        setVideoBlob(null);
        setVideoUrl(null);
        setStep('ready');
        setError(null);
    };

    const handleUpload = async () => {
        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('video', videoBlob, 'intro.webm');
        formData.append('userId', user.uid || user.id || user._id);
        formData.append('jobId', job._id);

        try {
            const response = await axios.post(`${API_URL}/upload-video-intro`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                setStep('success');
                setTimeout(() => {
                    onComplete(response.data.videoUrl);
                }, 1500);
            }
        } catch (err) {
            console.error('Upload failed:', err);
            setError('Failed to upload video. Please try again.');
            setIsUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="p-8 text-center border-b border-gray-100">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Video size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Video Candidate Deck</h2>
                    <p className="text-gray-500 text-sm font-medium max-w-md mx-auto">
                        Introduce yourself in 60 seconds. Share your passion, experience, and why you're a great fit for {job.title}.
                    </p>
                </div>

                {/* Recorder Area */}
                <div className="relative aspect-video bg-gray-900 overflow-hidden">
                    {step === 'ready' && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm px-6 text-center">
                            <Camera className="text-white mb-4" size={48} />
                            <h3 className="text-white font-bold text-xl mb-2">Ready to record?</h3>
                            <p className="text-gray-300 text-sm mb-8">Make sure you're in a well-lit area and your face is visible.</p>
                            <button
                                onClick={startRecording}
                                className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-3 shadow-lg"
                            >
                                Start Recording
                            </button>
                        </div>
                    )}

                    {(step === 'ready' || step === 'recording') && (
                        <Webcam
                            ref={webcamRef}
                            audio={true}
                            muted={true}
                            className="w-full h-full object-cover"
                            mirrored={true}
                        />
                    )}

                    {step === 'recording' && (
                        <div className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-black/60 rounded-full px-4 py-2 border border-white/20">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white font-mono font-bold text-lg">00:{timeLeft.toString().padStart(2, '0')}</span>
                        </div>
                    )}

                    {step === 'recording' && (
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                            <button
                                onClick={stopRecording}
                                className="w-20 h-20 bg-white/10 backdrop-blur-md border-4 border-white rounded-full flex items-center justify-center group hover:bg-white/20 transition-all"
                            >
                                <div className="w-8 h-8 bg-red-500 rounded-lg group-hover:scale-90 transition-transform" />
                            </button>
                        </div>
                    )}

                    {step === 'reviewing' && videoUrl && (
                        <div className="w-full h-full">
                            <video
                                src={videoUrl}
                                className="w-full h-full object-cover"
                                controls
                                autoPlay
                            />
                        </div>
                    )}

                    {(step === 'uploading' || isUploading) && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                            <Loader className="text-blue-500 animate-spin mb-4" size={48} />
                            <p className="text-white font-bold text-lg">Uploading your Candidate Deck...</p>
                            <p className="text-gray-400 text-sm mt-2 font-medium italic">This will only take a moment.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-green-600 text-white animate-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6">
                                <Check size={56} className="text-white" />
                            </div>
                            <h3 className="text-3xl font-black mb-2">Great Job!</h3>
                            <p className="font-medium opacity-80">Saved to your application profile.</p>
                        </div>
                    )}
                </div>

                {/* Controls Area */}
                {step === 'reviewing' && !isUploading && (
                    <div className="p-8 flex flex-col sm:flex-row items-center justify-between gap-6 bg-gray-50">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Check your video</span>
                            <p className="text-sm font-bold text-gray-700">Satisfied with your introduction?</p>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <button
                                onClick={handleRetake}
                                className="flex-1 sm:flex-none px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCcw size={18} /> Retake
                            </button>
                            <button
                                onClick={handleUpload}
                                className="flex-1 sm:flex-none px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                Submit Video <Check size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="px-8 py-4 bg-red-50 border-t border-red-100 flex items-center gap-3 text-red-600 animate-in slide-in-from-bottom duration-300">
                        <AlertCircle size={20} />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {/* Privacy Badge */}
                <div className="p-6 text-center bg-white">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                         Private & Secure Recording Active
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CandidateDeck;
